import { expect } from 'chai';

describe('App', () => {
  it('should test port set to 3006 from flags', () => {
    expect(global.document.URL).to.contain('3006')
  }) 
});
