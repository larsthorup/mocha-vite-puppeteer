#!/usr/bin/env node
import * as fs from 'fs';
import * as module from 'module';
import * as path from 'path';

import puppeteer from 'puppeteer'
import { createServer } from 'vite'

import { options } from './optionsParser.js';
import { MochaProtocolPlayer } from './mochaProtocolPlayer.js';
import { MochaProtocolReporter } from './mochaProtocolReporter.js';

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
  page.on('console', async (msg) => {
    const { _text } = msg;
    if (_text.startsWith(mochaProtocolPrefix)) {
      mochaProtocolPlayer.play(_text.substr(mochaProtocolPrefix.length));
    } else {
      const argsResolving = msg.args().map((arg) => {
        if (['object', 'function'].includes(arg._remoteObject.type)) {
          return arg.jsonValue();
        } else {
          return Promise.resolve(arg._remoteObject.value);
        }
      });
      const argsResolved = await Promise.all(argsResolving);
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
