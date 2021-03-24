describe('outer suite', () => {
  describe('inner suite', () => {
    it('passing inner test', () => {
    });

    it('failing inner test', () => {
      assert.fail('inner fail');
    });
  });

  it('passing outer test', () => {
  });

  it('failing outer test', () => {
    assert.fail('outer fail');
  });
});
