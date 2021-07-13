# mocha-vite-puppeteer

[![npm](https://img.shields.io/npm/v/mocha-vite-puppeteer)](https://www.npmjs.com/package/mocha-vite-puppeteer)
[![Build Status](https://github.com/larsthorup/mocha-vite-puppeteer/actions/workflows/ci.yml/badge.svg)](https://github.com/larsthorup/mocha-vite-puppeteer/actions/workflows/ci.yml)

Run your [Mocha](https://mochajs.org/) front-end tests with the [Vite](https://vitejs.dev/) bundler and the [Puppeteer](https://pptr.dev/) browser launcher.

"mocha-vite-puppeteer" can be used with any existing Vite project and is not specific to Vue, React or any other front-end library. Both JavaScript and TypeScript is supported via Vite.

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
$ npx mocha-vite-puppeteer
```

You will see output similar to:

```text
  Counter
    ✓ should count
  1 passing (24ms)
```

An exit code of 0 indicates that all tests passes. In general, the exit code indicates the number of failed tests, which can be used in CI pipelines.

For now the following built-in reporters are supported:

- dot
- json
- json-stream
- list
- spec
- tap

And also the following custom reporter is supported:

- [mocha-junit-reporter](https://www.npmjs.com/package/mocha-junit-reporter)

You can optionally specify a JSON file with reporter options:

```bash
$ npx mocha-vite-puppeteer --reporter mocha-junit-reporter --reporter-options mocha-junit-reporter.config.json
```

## Available Flags

| Flag              | Alias | Default     | Description                                                                                       |
| ----------------- | ----- | ----------- | ------------------------------------------------------------------------------------------------- |
| --port            | -p    | 3001        | Sets the port for Mocha-Vite-Puppeteer to run on                                                  |
| --entry           | -e    | 'test.html' | Entry html file that initializes Mocha. Relative to cwd                                           |
| --reporter        | -r    | 'spec'      | Reporter to use for mocha tests                                                                   |
| --reporterOptions | -o    | undefined   | reporter options file to be passed to reporter                                                    |
| --verbose         | -v    | false       | Enables verbose reporting from Mocha-Vite-Puppeteer. Useful for debugging these flags and inputs. |
| --debug           | -d    | false       | Sets debug mode for Mocha-Vite-Puppeteer. Automatically disabled puppeteer headless mode.         |
| --config          | -c    | undefined   | Advanced config options. See section below for details                                            |

<details>
  <summary>Advanced Configuration</summary>

    {
      "port": 3010,
      "reporter": "dot",
      "puppeteer": {
        "launchOptions": {
          "headless": false,
          ...
        }
      }
    }

The base-level of the object accepts any flag above, except config of course.

Additional root options include:
| Option Key        | Example Value               | Description                                                                                                                                        |
| ----------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| delayStart        | true                        | Boolean value, if true will load the test framework and wait for a keypress in the browser before executing tests. Useful for placing breakpoints. |
| puppeteer         | { "launchOptions": {}}      | Configuration for the puppeteer instance.                                                                                                          |

The puppeteer key currently only accepts an object with the key "launchOptions".
see the [puppeteer docs on launch options](https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#puppeteerlaunchoptions) for a full list of launch options available.

</details>

## See also

- Sample project: [larsthorup/vite-sandbox](https://github.com/larsthorup/vite-sandbox).
- Blog post: [Front-end testing with Mocha, Vite and Puppeteer](https://www.fullstackagile.eu/2021/03/21/mocha-vite-puppeteer/)

![](https://www.fullstackagile.eu/2021/03/21/mocha-vite-puppeteer/mocha-vite-puppeteer-diagram.png)

## Develop

```bash
npm test
```

Contributions welcome!
