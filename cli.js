#!/usr/bin/env node
import * as fs from 'fs';
import * as module from 'module';
import * as path from 'path';

import puppeteer from 'puppeteer'
import { createServer } from 'vite'
import IstanbulPlugin from 'vite-plugin-istanbul';

import { options } from './optionsParser.js';
import { MochaProtocolPlayer } from './mochaProtocolPlayer.js';
import { MochaProtocolReporter } from './mochaProtocolReporter.js';

let port = Number.parseInt(options.port);
if (!options.port || isNaN(port)) { options.port = 3001; port = 3001 };
if (!options.entry) { options.entry = 'test.html' }
if (!options.reporter) { options.reporter = 'spec' }

if (options.debug) {
  options.puppeteer = options.puppeteer || {};
  options.puppeteer.launchOptions = options.puppeteer.launchOptions || {};
  options.puppeteer.launchOptions.headless = false;
  options.puppeteer.launchOptions.devtools = true;
}
const verbose = options.verbose;
if (verbose) { console.log('Starting mocha-vite-puppeteer with options: ', JSON.stringify(options)) }
const root = '.'; // Note: relative to cwd
const entry = options.entry; // Note: relative to root
const testHtmlAbsolutePath = path.resolve(path.join(root, entry));
const mochaSetupAbsolutePath = path.resolve(path.join(root, 'mocha-setup.js'));
const testLoaderAbsolutePath = path.resolve(path.join(root, 'test-loader.js'));
const createDefaultFiles = entry === 'test.html'
  && !fs.existsSync(testHtmlAbsolutePath)
  && !fs.existsSync(mochaSetupAbsolutePath)
  && !fs.existsSync(testLoaderAbsolutePath);
if (createDefaultFiles) {
  fs.writeFileSync(testHtmlAbsolutePath, `
<!DOCTYPE html>
<html lang="en">
  <body>
    <script>
      // Note: globals expected by React and React Testing Library
      // not sure why they must be here, instead of in test.js
      global = window;
      process = {
        env: {}
      };
    </script>
    <script type="module" src="/mocha-setup.js"></script>
    <script type="module" src="/test-loader.js"></script>
  </body>
</html>`);
  fs.writeFileSync(mochaSetupAbsolutePath, `
import 'mocha';
mocha.setup({ ui: 'bdd' });`);
  fs.writeFileSync(testLoaderAbsolutePath, `
const modules = import.meta.globEager('/src/**/*.test.{js,jsx,ts,tsx}');`);
}
const barePathEnabled = options.enableBarePath;
const entryPath = barePathEnabled ? '/' : `/${entry}`;
const reporter = options.reporter;
const reporterOptions = options.reporterOptions ? JSON.parse(fs.readFileSync(options.reporterOptions, 'utf-8')) : undefined;
const debug = options.debug;
const mochaProtocolPrefix = 'mocha$protocol:';
// ----

// Note: https://mochajs.org/#running-mocha-in-the-browser
const require = module.createRequire(import.meta.url);
const mochaAbsolutePath = require.resolve('mocha/mocha.js');
const testHtml = fs.readFileSync(testHtmlAbsolutePath, 'utf-8');

const testHtmlPlugin = {
  name: 'testHtmlPlugin',
  transformIndexHtml: {
    enforce: 'pre',
    transform(html) {
      return testHtml;
    },
  },
};

const istanbulPlugin = IstanbulPlugin(options.istanbul || {});

const server = await createServer({
  plugins: [].concat(
    barePathEnabled ? [testHtmlPlugin] : [],
    options.coverage ? [istanbulPlugin] : [],
  ),
  resolve: {
    alias: {
      'mocha': mochaAbsolutePath,
    }
  },
  server: {
    port: port,
  },
  clearScreen: false,
}, false);
await server.listen();

const mochaProtocolPlayer = new MochaProtocolPlayer(reporter, { reporterOptions });

const browser = await puppeteer.launch(options.puppeteer?.launchOptions);
const page = await browser.newPage();
const address = `http://localhost:${port}${entryPath}`;

try {
  // Note: forward console output from the page (from Mocha and tests and code)
  const logsResolving = [];
  page.on('console', async (msg) => {
    const text = msg.text();
    if (text.startsWith(mochaProtocolPrefix)) {
      mochaProtocolPlayer.play(text.substr(mochaProtocolPrefix.length));
    } else {
      const argsResolving = msg.args().map((arg) => {
        const remoteObject = arg.remoteObject();
        if (['object', 'function'].includes(remoteObject.type)) {
          return arg.jsonValue();
        } else {
          return Promise.resolve(remoteObject.value);
        }
      });
      const logResolving = Promise.all(argsResolving);
      logsResolving.push(logResolving);
      const argsResolved = await logResolving;
      console.log.apply(console, argsResolved);
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
  const failureCount = await page.evaluate(async ({ prefix, reporterBody }) => {
    const MochaProtocolReporter = new Function('runner', 'options', reporterBody.substr(reporterBody.indexOf('{')));
    mocha.reporter(MochaProtocolReporter, { prefix, log: console.log });
    return new Promise((resolve) => {
      mocha.run(resolve);
    });
  }, {
    prefix: mochaProtocolPrefix,
    reporterBody: MochaProtocolReporter.toString()
  });
  await Promise.all(logsResolving); // wait for console.logs to complete
  const errorCount = mochaProtocolPlayer.errors.length;
  if (errorCount > 0) {
    mochaProtocolPlayer.errors.forEach(console.error);
  }
  if (options.coverage) {
    const coverageJson = await page.evaluate(() => JSON.stringify(__coverage__));
    const coverageDir = '.nyc_output';
    fs.mkdirSync(coverageDir, { recursive: true });
    fs.writeFileSync(path.join(coverageDir, 'out.json'), coverageJson);
  }
  if (!debug) {
    process.exit(failureCount + errorCount);
  }
} finally {
  if (debug) {
    await new Promise(() => { }); // Note: until ctrl-C
  } else {
    await browser.close();
    await server.close();
  }
}
