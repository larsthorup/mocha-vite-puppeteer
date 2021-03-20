# mocha-vite-puppeteer

Run your [Mocha](https://mochajs.org/) front-end tests with the [Vite](https://vitejs.dev/) bundler and the [Puppeteer](https://pptr.dev/) browser launcher.

"mocha-vite-puppeteer" can be used with any existing Vite project and is not specific to Vue, React or any other front-end library.

## Install

```bash
npm install mocha-vite-puppeteer
```

## Run

[As usually](https://mochajs.org/#running-mocha-in-the-browser) with Mocha, you must first create a test.html next to your index.html. Be sure to configure the [glob import](https://vitejs.dev/guide/features.html#glob-import) to match your test file names:

```html
<!DOCTYPE html>
<html lang="en">
  <body>
    <script type="module">
      import "mocha";
      mocha.setup({ ui: "bdd" });
    </script>
    <script type="module">
      const modules = import.meta.globEager("/src/**/*.test.{js,jsx}");
    </script>
  </body>
</html>
```

Then add some test files using Mocha, e.g.

```js
import { expect } from "chai";
import React from "react";
import { render, screen } from "@testing-library/react";

import Counter from "./Counter";

describe("Counter", () => {
  it("should count", () => {
    render(<Counter />);
    const countButton = screen.getByText("count is: 0");
    countButton.click();
    screen.getByText("count is: 1");
  });
});
```

Note: "mocha-vite-puppeteer" is not React specific, and should work just as well with Vue, Preact or any other front-end library supported by Vite.

Then run your tests, bundled with Vite, in Puppeteer with:

```bash
npx mocha-vite-puppeteer
```

For now, only the Mocha "spec" reporter is supported, and you will see output similar to:

```text
  Counter
    ✓ should count
  1 passing (24ms)
```

An exit code of 0 indicates that all tests passes. In general, the exit code indicates the number of failed tests.

## See also

Sample project: [larsthorup/vite-sandbox](https://github.com/larsthorup/vite-sandbox).
