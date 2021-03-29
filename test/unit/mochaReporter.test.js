import * as cp from 'child_process';
import * as module from 'module';
import * as path from 'path';
import * as fs from 'fs';

const encoding = 'utf-8';

let failureCount = 0;
let errorCount = 0;
const reporterList = [
  // { reporter: 'doc' }, // Note: looks like it tries to run the test again, gets "Unexpected run of test function during hydrate"
  { reporter: 'dot' },
  { reporter: 'json' },
  { reporter: 'json-stream' },
  // { reporter: 'list' }, // TODO: handle ANSI cursor escape sequences
  // { reporter: 'markdown' }, // Note: mochaProtocolPlayer does not yet set "runner.suite" before constructing reporter
  { reporter: 'spec' },
  { reporter: 'tap' },
  { reporter: 'mocha-junit-reporter', reporterOptionsFile: 'mocha-junit-reporter.config.json', ignoreStdout: true },
  // { reporter: 'mochawesome', reporterOptionsFile: 'mochawesome.config.json', ignoreStdout: true }
];
for (const { reporter, reporterOptionsFile, ignoreStdout } of reporterList) {
  fs.mkdirSync('./output', { recursive: true });
  const actualPath = `output/${reporter}.txt`;
  const expectedPath = `expected/${reporter}.txt`;
  const require = module.createRequire(import.meta.url);
  let errors;
  try {
    const testFilePath = require.resolve('./sample-test.cjs');
    const reporterOptionsPath = reporterOptionsFile && require.resolve(`./${reporterOptionsFile}`) || '';
    const cmd = `node ../mochaProtocolCli.js ${testFilePath} ${reporter} ${reporterOptionsPath}`;
    const output = cp.execSync(cmd).toString('utf-8');
    if (!ignoreStdout) {
      fs.writeFileSync(actualPath, output);
    }
    const actual = fs.readFileSync(actualPath, { encoding });
    const expected = fs.readFileSync(expectedPath, { encoding });
    const expectedRegex = expected
      .replaceAll('[', '\\[')
      .replaceAll(']', '\\]')
      .replaceAll('{', '\\{')
      .replaceAll('}', '\\}')
      .replaceAll('(', '\\(')
      .replaceAll(')', '\\)')
      .replaceAll('\\n', '\\\\n')
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
  } catch (error) {
    console.error(error)
    errorCount += error.status;
    console.log(`X ${reporter}: see errors above`);
  }
}
process.exit(failureCount + errorCount);