import * as fs from 'fs';

import Mocha from 'mocha';

import { MochaProtocolPlayer } from '../mochaProtocolPlayer.js';
import { MochaProtocolReporter } from '../mochaProtocolReporter.js';

const [_0, _1, testFilePath, reporter, reporterOptionsPath] = process.argv;
const reporterOptions = reporterOptionsPath && JSON.parse(fs.readFileSync(reporterOptionsPath, 'utf-8')) || {};

const mocha = new Mocha({ ui: 'bdd', color: false });
mocha.addFile(testFilePath);
const mochaProtocolPlayer = new MochaProtocolPlayer(reporter, { reporterOptions });
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
mocha.unloadFiles();
const { errors } = mochaProtocolPlayer;
errors.forEach(console.error);
process.exit(errors.length);