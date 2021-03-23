#!/usr/bin / env node
import * as assert from 'assert';
import * as events from 'events';
import * as module from 'module';
import * as path from 'path';
import * as mocha from 'mocha';

import puppeteer from 'puppeteer'
import { createServer } from 'vite'

// Note: eventually turn into args with default values
const port = 3001;
const root = '.'; // Note: relative to cwd
const entry = 'test.html'; // Note: relative to root
const reporter = (process.argv[2] === '--reporter' && process.argv[3]) || 'spec';
const verbose = false;
const debug = false;
const mochaProtocolPrefix = 'mocha$protocol:';
// ----

const hydrate = (objDehydated) => {
  const { constructorName, ...props } = objDehydated;
  switch (constructorName) {
    case 'Test': {
      const { title, parent } = props;
      const fn = () => { assert.fail('Unexpected run of test function during hydrate') };
      const test = new mocha.Test(title, fn);
      Object.assign(test, {
        ...props,
        parent: hydrate(parent),
      });
      return test;
    }
    case 'Suite': {
      const { title } = props;
      const suite = new mocha.Suite(title);
      Object.assign(suite, {
        ...props
      });
      return suite;
    }
    default:
      return props;
  }
}
class MochaProtocolPlayer {
  constructor(runner, reporter) {
    this.runner = runner;
    const Reporter = mocha.reporters[reporter];
    this.reporter = new Reporter(runner);
  }

  play(serializedEvent) {
    const { event, args, stats } = JSON.parse(serializedEvent);
    this.runner.stats = stats;
    this.reporter.stats = stats;
    this.runner.emit.apply(this.runner, [event].concat(args.map(hydrate)));
  }
}

class MochaRunnerShim extends events.EventEmitter {
}
const runner = new MochaRunnerShim();
// const runner = new mocha.Runner();
const mochaProtocolPlayer = new MochaProtocolPlayer(runner, reporter);

// Note: https://mochajs.org/#running-mocha-in-the-browser
const mochaAbsolutePath = module.createRequire(import.meta.url).resolve('mocha/mocha.js');
const server = await createServer({
  resolve: {
    alias: {
      'mocha': mochaAbsolutePath
    }
  },
  server: {
    port: port,
  },
}, false);
await server.listen();

const browser = await puppeteer.launch();
const page = await browser.newPage();
const address = `http://localhost:${port}/${entry}`;

try {
  // Note: forward console output from the page (from Mocha and tests and code)
  page.on('console', (msg) => {
    const { _text } = msg;
    if (_text.startsWith(mochaProtocolPrefix)) {
      mochaProtocolPlayer.play(_text.substr(mochaProtocolPrefix.length));
    } else {
      console.log.apply(console, msg.args().map((arg) => {
        // Note: this works only for arguments that are primitive values
        return arg._remoteObject.value;
      }));
    }
  });
  page.on('requestfailed', (request) => {
    throw new Error(request.url() + ' ' + request.failure().errorText);
  });
  if (verbose) {
    page.on('requestfinished', (request) => {
      console.log(request.url());
    });
  }
  page.on('pageerror', ({ message }) => {
    throw new Error(message);
  });
  page.on('error', (err) => {
    throw err;
  });
  await page.goto(address, { waitUntil: 'domcontentloaded' });
  const failureCount = await page.evaluate((mochaProtocolPrefix) => {
    const {
      EVENT_RUN_BEGIN,
      EVENT_RUN_END,
      EVENT_SUITE_BEGIN,
      EVENT_SUITE_END,
      EVENT_TEST_BEGIN,
      EVENT_TEST_END,
      EVENT_TEST_FAIL,
      EVENT_TEST_PASS,
      EVENT_TEST_PENDING,
    } = Mocha.Runner.constants;
    class MochaProtocolReporter {
      constructor(runner) {
        this.runner = runner;
        runner
          .once(EVENT_RUN_BEGIN, () => { this.send(EVENT_RUN_BEGIN, []); })
          .on(EVENT_SUITE_BEGIN, (suite) => { this.send(EVENT_SUITE_BEGIN, [suite]); })
          .on(EVENT_SUITE_END, (suite) => { this.send(EVENT_SUITE_END, [suite]); })
          .on(EVENT_TEST_BEGIN, (test) => { this.send(EVENT_TEST_BEGIN, [test]); })
          .on(EVENT_TEST_END, (test) => { this.send(EVENT_TEST_END, [test]); })
          .on(EVENT_TEST_FAIL, (test, err) => { this.send(EVENT_TEST_FAIL, [test, err]); })
          .on(EVENT_TEST_PASS, (test) => { this.send(EVENT_TEST_PASS, [test]); })
          .on(EVENT_TEST_PENDING, (test) => { this.send(EVENT_TEST_PENDING, [test]); })
          ;
      }
      send(event, args) {
        const dehydrate = (obj) => {
          if (obj) {
            const constructorName = obj.constructor.name;
            const commonProps = {
              constructorName,
            };
            switch (constructorName) {
              case 'Suite': {
                const { title, parent, suites } = obj;
                // Note: either re-construct parent from suites or reconstruct suites from parent or use "root" to cancel recursion
                return { ...commonProps, title, suites: suites.map(dehydrate) };
              }
              case 'Test': {
                const { type, title, pending, parent, duration } = obj;
                return { ...commonProps, type, title, pending, parent: dehydrate(parent), duration };
              }
              default:
                return { ...commonProps };
            }
          } else {
            return obj;
          }
        }
        const serializedEvent = JSON.stringify({
          event,
          args: args.map(dehydrate),
          stats: this.runner.stats,
        });
        console.log(`${mochaProtocolPrefix}${serializedEvent}`)
      }
    }
    return new Promise((resolve) => {
      mocha.reporter(MochaProtocolReporter);
      mocha.run(resolve);
    });
  }, mochaProtocolPrefix);
  process.exit(failureCount);
} finally {
  await browser.close();
  if (!debug) {
    await server.close();
  }
}
