const fail = (msg) => {
  throw new Error(msg);
};

describe('standalone suite', () => {
  before(() => { });

  beforeEach(() => { });

  afterEach(() => { });

  after(() => { });

  it('passing standalone test', () => {
  });

  it('failing standalone test', () => {
    fail('standalone fail');
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
