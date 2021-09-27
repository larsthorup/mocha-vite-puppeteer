import React, { useState } from 'react';

const ComponentXXX = ({ name }) => {
  const [value, setValue] = useState('');

  const onChange = (ev) => {
    setValue(ev.target.value);
  };

  return (
    <div id="component-XXX">
      <h1>Greeting XXX</h1>
      <p>{`Hello ${value ? `${value} ` : ''}from ${name}`}</p>
      <label>
        Enter name:
        <input onChange={onChange} value={value} />
      </label>
      <button>Submit</button>
    </div>
  );
};

export default ComponentXXX;
