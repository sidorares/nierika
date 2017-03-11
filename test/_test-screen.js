const assert = require('assert');
const rfb = require('rfb2');
const createScreen = require('../').createScreen;
const opts = {
  host: '127.0.0.1',
  port: 5911,
  password: 'my-new-password',
  encodings: [rfb.encodings.raw, rfb.encodings.pseudoCursor, rfb.encodings.pseudoDesktopSize]
};

const screen = createScreen(opts)

describe('screen', () => {
  xit('can find an image', async () => {
    const chromeIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png');
    const match = await screen.waitVisible(chromeIcon);
    assert.ok(match.probability >= chromeIcon.similarity())
  });

  xit('can wait for multiple images', async () => {
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
    //await screen.mouseMove(100, 100);
    //await screen.mouseButtonDown(0);
    //await screen.mouseButtonUp(0);
    //await screen.mouseMove(10, 10);
    //await screen.mouseButtonUp(0);
    //await screen.mouseButtonDown(0);


    if (0) {
      await screen.sleep(20000)
      const ffPlus = await screen.createTemplateFromFile(__dirname + '/fixtures/ff-dev-edition-plus-icon.png')
      for (var i=0; i < 10; ++i) {
        console.log('move to pattern')
        await screen.mouseMove(ffPlus.similar(0.92));
        await screen.mouseLeftClick();
        //await screen.mouseMove(1000, 100);
      }
      return
    }



    //const chromeIcon = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png');
    //await screen.mouseMove(chromeIcon);
    //await screen.mouseLeftDoubleClick();
    //const addTab = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-add-tab.png');
    await screen.mouseMove(100, 300);

    const addTab = await screen.createTemplateFromFile(__dirname + '/fixtures/add-tab-2.png');
    const match2 = await screen.waitVisible(addTab.similar(0.95));
    console.log('!!!!!!!', match2);
    await screen.mouseMove(match2.x, match2.y);

    await screen.mouseMove(addTab.similar(0.99));
    await screen.mouseLeftClick();

    await screen.mouseMove(addTab)
    await screen.mouseLeftClick();

    for (var i=0; i < 10; ++i) {
      await screen.mouseMove(addTab)
      await screen.mouseLeftClick();
    }

    //const closeTab = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-close-icon.png');
  });

  it('can type', async () => {
    await screen.sleep(1000)
    //await screen.keyboardTypeText('this is a test. I\'m typing a very very long message');
    await screen.keyboardTypeText('HELLO GUNITA! ');
    await screen.keyboardTypeText('HELLO GUNITA! ');
    await screen.keyboardTypeText('HELLO GUNITA! ');
    await screen.keyboardTypeText('HELLO GUNITA! ');
    await screen.keyboardTypeText('HELLO GUNITA! ');
    await screen.keyboardTypeText('HELLO GUNITA! ');
    console.log('done typing')

    const textTemplate = await screen.createTemplateFromFile(__dirname + '/fixtures/this-is-long-message-text.png');
    const match = await screen.waitVisible(textTemplate.similar(0.8));
  });
})
