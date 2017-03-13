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
    await screen.mouseMove(chromeIcon);
    await screen.mouseLeftDoubleClick();
    const addTab = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-add-tab.png');
    await screen.mouseMove(addTab);
    await screen.mouseLeftClick();
    console.log('add tab clicked')
  });

  it('can type', async () => {
    console.log('typing tets start')
    await screen.sleep(1000);
    await screen.keyboardTypeText(`javascript:alert('test')`);
    await screen.keyboardKeyPress('Return');
    const alertDialog = await screen.createTemplateFromFile(__dirname + '/fixtures/alert-dialog3.png');
    const match = await screen.waitVisible(alertDialog.similar(0.9));
    console.log('DIALOG VISIBLE')
    const alertOK = await screen.createTemplateFromFile(__dirname + '/fixtures/alert-ok-button.png');
    await screen.mouseMove(alertOK);
    await screen.mouseLeftClick();
    console.log('click to ok ok')
    await screen.waitVanish(alertDialog.similar(0.99));
    console.log('vait vanish ok')
    const closeTab = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-close-icon.png');
    await screen.mouseMove(closeTab);
    await screen.mouseLeftClick();
    console.log('close tab 1 ok')
    await screen.sleep(500);
    await screen.mouseMove(400, 600);
    await screen.mouseMove(closeTab);
    await screen.mouseLeftClick();
    console.log('close tab 2 ok')
  });
})
