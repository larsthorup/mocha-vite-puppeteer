import * as assert from 'assert';
import * as events from 'events';
import * as module from 'module';
import * as path from 'path';

import * as mocha from 'mocha';

const hydrate = (objDehydated) => {
  const { constructorName, ...props } = objDehydated;
  switch (constructorName) {
    case 'Suite': {
      const { title } = props;
      const suite = new mocha.Suite(title);
      Object.assign(suite, {
        ...props
      });
      return suite;
    }
    case 'Test': {
      const { title, body, parent } = props;
      const fn = () => { assert.fail('Unexpected run of test function during hydrate') };
      const test = new mocha.Test(title, fn);
      Object.assign(test, {
        ...props,
        parent: hydrate(parent),
      });
      return test;
    }
    default:
      return props;
  }
}

class MochaRunnerShim extends events.EventEmitter {
}

const getReporter = (reporter) => {
  const builtinReporter = mocha.reporters[reporter];
  if (builtinReporter) {
    return builtinReporter;
  } else {
    const requirePath = path.join(process.cwd(), 'package.json');
    const require = module.createRequire(requirePath);
    const customReporter = require(reporter);
    return customReporter;
  }
}

export class MochaProtocolPlayer {
  constructor(reporter, options) {
    this.runner = new MochaRunnerShim();
    const Reporter = getReporter(reporter);
    this.reporter = new Reporter(this.runner, options);
    this.errors = [];
  }

  play(serializedEvent) {
    try {
      const { event, args, stats, suite } = JSON.parse(serializedEvent);
      this.runner.stats = stats;
      this.reporter.stats = stats;
      if (suite && suite.root) {
        this.runner.suite = hydrate(suite);
      }
      this.runner.emit.apply(this.runner, [event].concat(args.map(hydrate)));
    } catch (error) {
      this.errors.push(error);
    }
  }
}
