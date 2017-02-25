const assert = require('assert')

describe('rfb client', () => {
  it('can connect to docker test image', done => {
    const rfb = require('rfb2')
    const r = rfb.createConnection({
      host: '127.0.0.1',
      port: 5902,
      password: 'my-new-password',
      encodings: [rfb.encodings.raw, rfb.encodings.pseudoCursor]
    });
    r.on('connect', () => {
      assert.equal(r.width, 1280)
      assert.equal(r.height, 1024)
      r.end()
      done()
    });
    r.on('error', done)
  });
});
