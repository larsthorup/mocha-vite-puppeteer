import { expect } from 'chai';
import React from 'react';
import { render, screen } from '@testing-library/react';

import App from './App';

describe('App', () => {
  it('should greet and count', async() => {
    render(<App />);
    screen.getByText('Hello Vite + React!');
    const countButton = screen.getByText('count is: 0');
    countButton.click();
    screen.getByText('count is: 1');
    console.log({innerText: countButton.innerText});
  });
});
