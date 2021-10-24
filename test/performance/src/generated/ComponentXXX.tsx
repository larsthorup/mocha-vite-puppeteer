import React, { useState } from "react";

const ComponentXXX: React.FC<{ name: string }> = ({ name }) => {
  const [value, setValue] = useState("");

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    setValue(ev.target.value);
  };

  return (
    <div id="component-XXX">
      <h1>Greeting XXX</h1>
      <p>{`Hello ${value ? `${value} ` : ""}from ${name}`}</p>
      <label>
        Enter name:
        <input onChange={onChange} value={value} />
      </label>
      <button>Submit</button>
    </div>
  );
};

export default ComponentXXX;
