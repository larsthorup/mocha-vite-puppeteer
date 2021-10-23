import * as fs from 'fs';
import { getopt } from 'stdio';

const cliOptions = getopt({
  port: { key: 'p', description: 'Port for the tests to run on. Default 3001', args: 1, default: undefined },
  entry: { key: 'e', description: 'Entry html file that contains Mocha Setup. Relative to CWD, default \'test.html\'', args: 1, default: undefined },
  reporter: { key: 'r', description: 'Reporter to use. Available: [dot, json, json-stream, list, spec, tap]. Default \'spec\'', args: 1, default: undefined },
  reporterOptions: { key: 'o', description: 'options to pass to the reporter.', args: 1, default: undefined },
  verbose: { key: 'v', description: 'Verbose Output' },
  debug: { key: 'd', description: 'Enable debug mode. Note: test will run until quit via console (ctrl+c)' },
  config: { key: 'c', description: 'Relative path to JSON config file. See project description for more details.', args: 1, default: undefined },
  enableBarePath: { description: 'Load entry html file from "/" (html file cannot use inline script of type "module")', args: 1, default: undefined },
  coverage: { description: 'Instrument and collect code coverage during test. Use "nyc" for reporting' }
});

Object.keys(cliOptions).forEach(key => {
  if (cliOptions[key] === 'undefined') { cliOptions[key] = undefined } //default values only support strings/bool
});

if (cliOptions.args) {
  console.warn('Mocha-vite-puppeteer recieved args that don\'t match the supported syntax. Please check the github for syntax help if this was a mistake')
};

const definedProps = Object.fromEntries(
  Object.entries(cliOptions).filter(([k, v]) => v !== undefined)
);
if (definedProps.enableBarePath !== undefined) {
  definedProps.enableBarePath = definedProps.enableBarePath === 'true';
}

const jsonOptions = cliOptions.config && cliOptions.config !== 'undefined' ? JSON.parse(fs.readFileSync(cliOptions.config, 'utf-8')) : undefined;

export const options = { enableBarePath: true, ...jsonOptions, ...definedProps };