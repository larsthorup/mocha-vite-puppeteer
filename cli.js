#!/usr/bin/env node
import * as fs from 'fs';
import * as module from 'module';
import * as path from 'path';
import { getopt } from 'stdio';

import puppeteer from 'puppeteer'
import { createServer } from 'vite'

import { MochaProtocolPlayer } from './mochaProtocolPlayer.js';
import { MochaProtocolReporter } from './mochaProtocolReporter.js';

const cliOptions = getopt({
  port: { key: 'p', description: 'Port for the tests to run on. Default 3001', args: 1, default: undefined},
  entry: { key: 'e', description: 'Entry html file that contains Mocha Setup. Relative to CWD, default \'test.html\'', args: 1, default: undefined},
  reporter: { key: 'r', description: 'Reporter to use. Available: [dot, json, json-stream, list, spec, tap]. Default \'spec\'', args: 1, default: undefined},
  reporterOptions: { key: 'o', description: 'options to pass to the reporter.', args: 1, default: undefined},
  verbose: { key: 'v', description: 'Verbose Output'},
  debug: { key: 'd', description: 'Enable debug mode. Note: test will run until quit via console (ctrl+c)'},
  config: { key: 'c', description: 'Relative path to JSON config file. See project description for more details.', args: 1, default: undefined}
});

Object.keys(cliOptions).forEach(key => {
  if(cliOptions[key] === 'undefined') { cliOptions[key] = undefined} //default values only support strings/bool
});

if(cliOptions.args) {
  console.warn('Mocha-vite-puppeteer recieved args that don\'t match the supported syntax. Please check the github for syntax help if this was a mistake')
};

const definedProps = obj => Object.fromEntries(
  Object.entries(obj).filter(([k, v]) => v !== undefined)
);

const jsonOptions = cliOptions.config && cliOptions.config !== 'undefined' ? JSON.parse(fs.readFileSync(cliOptions.config, 'utf-8')) : undefined;
const options = {...jsonOptions, ...definedProps(cliOptions)};

let port = Number.parseInt(options.port);
if(!options.port || isNaN(port)){options.port = 3001; port = 3001};
if(!options.entry) {options.entry = 'test.html'}
if(!options.reporter) {options.reporter = 'spec'}

if(options.debug) {
  options.puppeteer = options.puppeteer || {};
  options.puppeteer.launchOptions = options.puppeteer.launchOptions || {};
  options.puppeteer.launchOptions.headless = false;
}
const verbose = options.verbose;
if(verbose) { console.log('Starting mocha-vite-puppeteer with options: ', JSON.stringify(options)) }
const root = '.'; // Note: relative to cwd
const entry = options.entry; // Note: relative to root
const reporter = options.reporter;
const reporterOptions = options.reporterOptions ? JSON.parse(fs.readFileSync(options.reporterOptions, 'utf-8')) : undefined;
const debug = options.debug;
const mochaProtocolPrefix = 'mocha$protocol:';
// ----

// Note: https://mochajs.org/#running-mocha-in-the-browser
const require = module.createRequire(import.meta.url);
const mochaAbsolutePath = require.resolve('mocha/mocha.js');
const server = await createServer({
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
  const errorCount = mochaProtocolPlayer.errors.length;
  if (errorCount > 0) {
    mochaProtocolPlayer.errors.forEach(console.error);
  }
  if (debug) {
    await new Promise(() => { }); // Note: forever
  } else {
    process.exit(failureCount + errorCount);
  }
} finally {
  await browser.close();
  if (!debug) {
    await server.close();
  }
}
