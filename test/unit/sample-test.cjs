const fail = (msg, actual, expected) => {
  const error = new Error(msg);
  error.actual = actual;
  error.expected = expected;
  throw error;
};

describe('standalone suite', () => {
  before(() => { });

  beforeEach(() => { });

  afterEach(() => { });

  after(() => { });

  it('passing standalone test', () => {
  });

  it('failing standalone test', () => {
    fail('standalone fail', [1, 2], [1, 3]);
  });
});

describe('outer suite', () => {
  it('passing outer test', () => {
  });

  describe('inner suite', () => {
    it('passing inner test', () => {
    });

    it('failing inner test', () => {
      fail('inner fail');
    });
  });

  it('failing outer test', () => {
    fail('outer fail');
  });
});
