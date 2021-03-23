import * as assert from 'assert';
import * as events from 'events';

import * as mocha from 'mocha';

const hydrate = (objDehydated) => {
  const { constructorName, ...props } = objDehydated;
  switch (constructorName) {
    case 'Test': {
      const { title, parent } = props;
      const fn = () => { assert.fail('Unexpected run of test function during hydrate') };
      const test = new mocha.Test(title, fn);
      Object.assign(test, {
        ...props,
        parent: hydrate(parent),
      });
      return test;
    }
    case 'Suite': {
      const { title } = props;
      const suite = new mocha.Suite(title);
      Object.assign(suite, {
        ...props
      });
      return suite;
    }
    default:
      return props;
  }
}

class MochaRunnerShim extends events.EventEmitter {
}

export class MochaProtocolPlayer {
  constructor(reporter) {
    this.runner = new MochaRunnerShim();
    const Reporter = mocha.reporters[reporter];
    this.reporter = new Reporter(this.runner);
  }

  play(serializedEvent) {
    const { event, args, stats } = JSON.parse(serializedEvent);
    this.runner.stats = stats;
    this.reporter.stats = stats;
    this.runner.emit.apply(this.runner, [event].concat(args.map(hydrate)));
  }
}
