import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'chai';

import ComponentXXX from './ComponentXXX';

describe('ComponentXXX', function () {
  it('works', async function () {
    // when: rendered
    render(<ComponentXXX name="test-XXX" />);

    // then: shows greeting without user name
    expect(await screen.findByText('Hello from test-XXX')).to.exist;

    const name = Math.random().toString();

    // when: user enter name
    userEvent.type(screen.getByRole('textbox', { name: 'Enter name:' }), name);

    // then: shows greeting with user name
    expect(
      await screen.findByText(`Hello ${name} from test-XXX`)
    ).to.exist;
  });
});
