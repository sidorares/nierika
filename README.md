# nierika

Visual testing library, heavily inspired by [Sikuli](http://www.sikuli.org/) / [SikiliX](http://sikulix.com/)

![nierika](https://cloud.githubusercontent.com/assets/173025/24088486/0b0be20a-0d7f-11e7-8356-dacc4cada52b.gif)

## Installation

```bash
npm install --save nierika
```

## Api

At the moment only VNC is supported as screen driver. You start by constructing `screen` object:

```js
const nierika = require('nierika')
const opts = {
  host: '127.0.0.1',
  port: 5911,
  password: 'my-new-password',
  encodings: [rfb.encodings.raw, rfb.encodings.pseudoCursor] // optional
};

const screen = nierika.createScreen(opts)
```

### `Screen` object

`const template = await screen.createTemplateFromFile(path)` - create template using image file file from disk. Returns `Template`

`const match = await screen.waitVisible(template, timeout)` - wait until template is visible on screen.

`const match = await screen.waitVanish(template, timeout)` - wait until template is NOT visible on screen.

`await screen.mouseMove(x, y)` - move mouse to x, y

`await screen.mouseMove(template)` - wait until template is visible and move mouse to match position

`await screen.mouseLeftClick()`

`await screen.mouseLeftDoubleClick()`

`await screen.mouseWheeDown()`

`await screen.mouseWheelUp()`

`await screen.keyboardTypeText(string)` - type text

`await screen.keyboardKeyUp(string|number)`, `await screen.keyboardKeyDown(string|number)` - if argument is number, send numerical keysym. If it's a string, use it as a name to lookup keysym using [keysym](https://www.npmjs.com/package/keysym) module.

### `Template` object

`template.similar(similarity)` - return new template with similarity set to `similarity`

`template.width()`, `template.height()`

# TODO

- OCR with tesseract.js
- SikuliIDE-like test authoring app based on electron
- tools to automatically extract and save templates and convert to test scripts from running [nightmare](https://github.com/segmentio/nightmare) or [cypress](https://www.cypress.io/)
- option to match templates using ORB descriptors
- performance: use image pyramids
- save and replay tests together with screen recording
- automatically create tests from VNC session recording

# Thanks

__[@glenngillen](https://github.com/glenngillen)__ for running ['New Year resolution to finish a project' meetup](https://www.meetup.com/side-project-sprints/events/237119467/) where I finnally put pieces of code together as first version of this lib

