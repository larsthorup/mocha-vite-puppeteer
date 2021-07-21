import { expect } from 'chai';
import React from 'react';
import { render, screen } from '@testing-library/react';

import App from './App';

describe('App', () => {
  it('should greet and count', () => {
    render(<App />);
    screen.getByText('Hello Vite + React!');
    const countButton = screen.getByText('count is: 0');
    countButton.click();
    screen.getByText('count is: 1');
    console.log(JSON.stringify({innerText: countButton.innerText})); // passes
    console.log({innerText: countButton.innerText}); // TODO: make this pass instead
  });
});
