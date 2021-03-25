describe('standalone suite', () => {
  it('passing standalone test', () => {
  });

  it('failing standalone test', () => {
    assert.fail('standalone fail');
  });
});

describe('outer suite', () => {
  it('passing outer test', () => {
  });

  describe('inner suite', () => {
    it('passing inner test', () => {
    });

    it('failing inner test', () => {
      assert.fail('inner fail');
    });
  });

  it('failing outer test', () => {
    assert.fail('outer fail');
  });
});
