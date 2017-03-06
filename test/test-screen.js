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

describe('screen', () => {
  it('can find an image', async () => {
    const chromeIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png');
    const match = await screen.waitVisible(chromeIcon);
    assert.ok(match.probability >= chromeIcon.similarity())
  });

  it('can wait for multiple images', async () => {
    const chromeIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png');
    const ffIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/firefox-icon.png');
    const driveIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/drive-icon.png');
    const matches = await Promise.all([
      screen.waitVisible(ffIcon),
      screen.waitVisible(chromeIcon),
      screen.waitVisible(driveIcon)
    ]);
    assert.ok(
      matches[0].probability >= ffIcon.similarity() &&
      matches[1].probability >= chromeIcon.similarity() &&
      matches[2].probability >= driveIcon.similarity()
    )
  });

  it('can move and click mouse', async () => {
    const chromeIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png');
    const match = await screen.waitVisible(chromeIcon);
    await screen.mouseMove(match.x, match.y);
    await screen.mouseLeftDoubleClick();
    const addTab = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-add-tab.png');
    const match2 = await screen.waitVisible(addTab);
    await screen.mouseMove(match2.x, match2.y);
    await screen.mouseLeftClick();
  });

  it('can type', async () => {
    await screen.keyboardTypeText('this is a test. I\'m typing a very very long message');
    const textTemplate = await screen.createTemplateFromFile(__dirname + '/fixtures/this-is-long-message-text.png');
    const match = await screen.waitVisible(textTemplate.similar(0.8));
  });
})
