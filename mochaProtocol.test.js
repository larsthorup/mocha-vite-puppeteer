import * as assert from 'assert';
import * as fs from 'fs';
import * as module from 'module';

import Mocha from 'mocha';


import { MochaProtocolPlayer } from './mochaProtocolPlayer.js';
import { MochaProtocolReporter } from './mochaProtocolReporter.js';

const encoding = 'utf-8';
const require = module.createRequire(import.meta.url);

const reporterList = [
  'dot',
  'json-stream',
  'list',
  'spec',
  'tap',
];
for (const reporter of reporterList) {
  fs.mkdirSync('./output', { recursive: true });
  const mocha = new Mocha({ ui: 'bdd' });
  mocha.addFile(require.resolve('./sample-test.cjs'));
  const actualPath = `output/${reporter}.txt`;
  const expectedPath = `expected/${reporter}.txt`;
  var actualStream = fs.createWriteStream(actualPath, { encoding });
  const processStdoutWrite = process.stdout.write;
  process.stdout.write = actualStream.write.bind(actualStream);
  try {
    const mochaProtocolPlayer = new MochaProtocolPlayer(reporter);
    const log = mochaProtocolPlayer.play.bind(mochaProtocolPlayer);
    mocha.reporter(MochaProtocolReporter, { prefix: '', log });
    await new Promise((resolve) => {
      mocha.run(resolve);
    });
    mocha.unloadFiles();
  } finally {
    process.stdout.write = processStdoutWrite;
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
    const msg = `X ${reporter}: ${actualPath} does not match ${expectedPath}`;
    console.log('--------');
    console.log('actual:');
    console.log(actual);
    console.log('--------');
    console.log('expected:');
    console.log(expected);
    console.log('--------');
    assert.fail(msg);
  } else {
    console.log(`√ ${reporter}`);
  }
}