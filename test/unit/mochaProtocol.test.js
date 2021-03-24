import * as assert from 'assert';
import * as fs from 'fs';
import * as module from 'module';

import Mocha from 'mocha';


import { MochaProtocolPlayer } from '../../mochaProtocolPlayer.js';
import { MochaProtocolReporter } from '../../mochaProtocolReporter.js';

const encoding = 'utf-8';
const require = module.createRequire(import.meta.url);

let failures = 0;
const reporterList = [
  { reporter: 'dot' },
  { reporter: 'json-stream' },
  { reporter: 'list' },
  { reporter: 'mocha-junit-reporter', reporterOptions: { mochaFile: './output/mocha-junit-reporter.txt' }, ignoreStdout: true },
  { reporter: 'spec' },
  { reporter: 'tap' },
];
for (const { reporter, reporterOptions, ignoreStdout } of reporterList) {
  fs.mkdirSync('./output', { recursive: true });
  const mocha = new Mocha({ ui: 'bdd' });
  mocha.addFile(require.resolve('./sample-test.cjs'));
  const actualPath = `output/${reporter}.txt`;
  const expectedPath = `expected/${reporter}.txt`;
  const processStdoutWrite = process.stdout.write;
  if (!ignoreStdout) {
    const actualStream = fs.createWriteStream(actualPath, { encoding });
    process.stdout.write = actualStream.write.bind(actualStream);
  }
  try {
    const mochaProtocolPlayer = new MochaProtocolPlayer(reporter, { reporterOptions });
    const log = mochaProtocolPlayer.play.bind(mochaProtocolPlayer);
    mocha.reporter(MochaProtocolReporter, { prefix: '', log });
    await new Promise((resolve) => {
      mocha.run(resolve);
    });
    mocha.unloadFiles();
  } finally {
    if (!ignoreStdout) {
      process.stdout.write = processStdoutWrite;
    }
  }
  const actual = fs.readFileSync(actualPath, { encoding });
  const expected = fs.readFileSync(expectedPath, { encoding });
  const expectedRegex = expected
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
    ;
  if (!actual.match(expectedRegex)) {
    ++failures;
    console.log('--------');
    console.log('actual:');
    console.log(actual);
    console.log('--------');
    console.log('expected:');
    console.log(expected);
    console.log('--------');
    console.log(`X ${reporter}: ${actualPath} does not match ${expectedPath}`);
  } else {
    console.log(`√ ${reporter}`);
  }
}
process.exit(failures);