import { expect } from 'chai';

describe('App', () => {
  it('should test port set to 3010 from config json', () => {
    expect(global.document.URL).to.contain('3010')
  }) 
});
