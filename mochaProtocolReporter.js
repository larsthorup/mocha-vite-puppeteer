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
    const dehydrate = (withParent) => (obj) => {
      if (obj) {
        if (obj instanceof Error) {
          const { message, stack, actual, expected } = obj;
          return {
            commonProps: {
              constructorName: 'Error',
            },
            message,
            stack,
            actual,
            expected
          };
        }
        const constructorName = (({type}) => {
          switch(type) {
            case 'hook':
              return 'Hook';
            case 'test':
              return 'Test';
            default:
              return 'Suite';
          }
        })(obj);
        const commonProps = {
          constructorName,
        };
        switch (constructorName) {
          case 'Suite': {
            const { title, root, suites, tests, _afterAll, _afterEach, _beforeAll, _beforeEach } = obj;
            return {
              ...commonProps,
              title,
              root,
              suites: suites.map(dehydrate(true)),
              tests: tests.map(dehydrate(false)),
              _afterAll: _afterAll.map(dehydrate(false)),
              _afterEach: _afterEach.map(dehydrate(false)),
              _beforeAll: _beforeAll.map(dehydrate(false)),
              _beforeEach: _beforeEach.map(dehydrate(false)),
            };
          }
          case 'Hook':
          case 'Test': {
            const { type, title, body, pending, parent, duration } = obj;
            return {
              ...commonProps,
              type,
              title,
              body,
              pending,
              ...(withParent && { parent: dehydrate(true)(parent) }),
              duration
            };
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
        args: args.map(dehydrate(true)),
        stats: this.runner.stats,
        suite: dehydrate(true)(this.runner.suite),
      });
      log(`${this.prefix}${serializedEvent}`);
    } catch (error) {
      // Note: it seems like Mocha does not handle exceptions from event handlers well
      console.error(`mochaProtocolReporter: failed to send mocha "${event}" event`, error);
    }
  };
}
