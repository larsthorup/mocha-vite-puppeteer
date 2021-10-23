# Changelog

## Upgrade from 1 to 2

Explicitly specify `--enableBarePath false` on command line or `"enableBarePath": false` in config file.

Alternatively you should ensure that your `test.html` file does not use inline script of type "module".
