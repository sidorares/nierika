const assert = require('assert');
const rfb = require('rfb2');
const createScreen = require('../').createScreen;
const opts = {
  host: '127.0.0.1',
  port: 5911,
  password: 'my-new-password',
  encodings: [rfb.encodings.raw, rfb.encodings.pseudoCursor]
};

const screen = createScreen(opts)

describe('screen.waitVisible', () => {
  it('can find an image', async () => {
    const chromeIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png');
    const match = await screen.waitVisible(chromeIcon);
    console.log(match)
  })

  it('can wait for multiple images', async () => {
    const chromeIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png');
    const ffIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/firefox-icon.png');
    const driveIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/drive-icon.png');
    const matches = await Promise.all([
      screen.waitVisible(ffIcon),
      screen.waitVisible(chromeIcon),
      screen.waitVisible(driveIcon)
    ]);
    console.log(matches)
  })

  it('can move and click mouse', async () => {
    const chromeIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png');
    const match = await screen.waitVisible(chromeIcon);
    console.log(match)
    await screen.mouseMove(match.x + 60, match.y + 40);
    await screen.mouseLeftDoubleClick();
    const searchInput = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-web-store.png');
    const match2 = await screen.waitVisible(searchInput);
    await screen.mouseMove(match2.x + 60, match2.y + 40);
    await screen.mouseLeftClick();
  });
})
