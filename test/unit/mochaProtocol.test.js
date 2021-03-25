import * as assert from 'assert';
import * as fs from 'fs';
import * as module from 'module';

import Mocha from 'mocha';


import { MochaProtocolPlayer } from '../../mochaProtocolPlayer.js';
import { MochaProtocolReporter } from '../../mochaProtocolReporter.js';

const encoding = 'utf-8';
const require = module.createRequire(import.meta.url);

process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection');
  console.error(reason);
});
process.on('uncaughtException', (err, origin) => {
  fs.writeSync(
    process.stderr.fd,
    `Caught exception: ${err}\n` +
    `Exception origin: ${origin}`
  );
});

let failureCount = 0;
let errorCount = 0;
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
  let actualStream;
  if (!ignoreStdout) {
    actualStream = fs.createWriteStream(actualPath, { encoding });
    process.stdout.write = actualStream.write.bind(actualStream);
  }
  const mochaProtocolPlayer = new MochaProtocolPlayer(reporter, { reporterOptions });
  try {
    const log = mochaProtocolPlayer.play.bind(mochaProtocolPlayer);
    mocha.reporter(MochaProtocolReporter, {
      prefix: '', log: (arg) => {
        // console.error(arg);
        log(arg);
      }
    });
    await new Promise((resolve) => {
      mocha.run((failures) => {
        resolve(failures);
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 100)); // Note: wait for spec reporter to complete??
    mocha.unloadFiles();
  } finally {
    if (!ignoreStdout) {
      actualStream.end();
      process.stdout.write = processStdoutWrite;
    }
  }
  if (mochaProtocolPlayer.errors.length > 0) {
    errorCount += mochaProtocolPlayer.errors.length;
    mochaProtocolPlayer.errors.forEach(console.error);
    console.log(`X ${reporter}: see errors above`);
  } else {
    const actual = fs.readFileSync(actualPath, { encoding });
    const expected = fs.readFileSync(expectedPath, { encoding });
    const expectedRegex = expected
      .replaceAll('[', '\\[')
      .replaceAll(']', '\\]')
      .replaceAll('(', '\\(')
      .replaceAll(')', '\\)')
      ;
    if (!actual.match(expectedRegex)) {
      ++failureCount;
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
}
process.exit(failureCount + errorCount);