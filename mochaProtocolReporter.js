// Note: This is not a class but a simple function so it can be used both in Node.js (for testing) and via new Function() in the browser
// Note: eventually use Vite to inject the code
export function MochaProtocolReporter(runner, options) {
  this.runner = runner;
  const { reporterOptions } = options;
  const { prefix, log } = reporterOptions;
  this.prefix = prefix;
  const {
    EVENT_RUN_BEGIN,
    EVENT_RUN_END,
    EVENT_SUITE_BEGIN,
    EVENT_SUITE_END,
    EVENT_TEST_BEGIN,
    EVENT_TEST_END,
    EVENT_TEST_FAIL,
    EVENT_TEST_PASS,
    EVENT_TEST_PENDING,
  } = runner.constructor.constants;
  runner
    .once(EVENT_RUN_BEGIN, () => { this.send(EVENT_RUN_BEGIN, []); })
    .once(EVENT_RUN_END, () => { this.send(EVENT_RUN_END, []); })
    .on(EVENT_SUITE_BEGIN, (suite) => { this.send(EVENT_SUITE_BEGIN, [suite]); })
    .on(EVENT_SUITE_END, (suite) => { this.send(EVENT_SUITE_END, [suite]); })
    .on(EVENT_TEST_BEGIN, (test) => { this.send(EVENT_TEST_BEGIN, [test]); })
    .on(EVENT_TEST_END, (test) => { this.send(EVENT_TEST_END, [test]); })
    .on(EVENT_TEST_FAIL, (test, err) => { this.send(EVENT_TEST_FAIL, [test, err]); })
    .on(EVENT_TEST_PASS, (test) => { this.send(EVENT_TEST_PASS, [test]); })
    .on(EVENT_TEST_PENDING, (test) => { this.send(EVENT_TEST_PENDING, [test]); })
    ;
  this.send = function (event, args) {
    const dehydrate = (obj) => {
      if (obj) {
        const constructorName = obj.constructor.name;
        const commonProps = {
          constructorName,
        };
        switch (constructorName) {
          case 'Suite': {
            const { title, parent, suites } = obj;
            // Note: either re-construct parent from suites or reconstruct suites from parent or use "root" to cancel recursion
            return { ...commonProps, title, suites: suites.map(dehydrate) };
          }
          case 'Test': {
            const { type, title, pending, parent, duration } = obj;
            return { ...commonProps, type, title, pending, parent: dehydrate(parent), duration };
          }
          default:
            return { ...commonProps };
        }
      } else {
        return obj;
      }
    }
    try {
      const serializedEvent = JSON.stringify({
        event,
        args: args.map(dehydrate),
        stats: this.runner.stats,
      });
      log(`${this.prefix}${serializedEvent}`);
    } catch (error) {
      // Note: it seems like Mocha does not handle exceptions from event handlers well
      console.error(`mochaProtocolReporter: failed to send mocha "${event}" event`, error);
    }
  };
}
