const rfb = require('rfb2');
const createScreen = require('../').createScreen;
const opts = {
  host: '127.0.0.1',
  port: 5911,
  password: 'my-new-password',
  encodings: [rfb.encodings.raw, rfb.encodings.pseudoCursor]
};

describe('screen', () => {
  it('can find an image', async () => {
    const screen = createScreen(opts)
    const template = await screen.createTemplateFromFile(__dirname + '/fixtures/chrome-icon.png')
    const match = await screen.wait(template)
  })
})
