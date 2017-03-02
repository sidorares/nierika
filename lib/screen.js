const rfb = require('rfb2');
const cv = require('opencv');
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const Template = require('./template.js')

function Screen(opts) {
  EventEmitter.call(this);
  this._rfbConn = rfb.createConnection(opts);
  this._screenBuffer = null;
  this._mouseState = {
    buttons: 0, // all buttons up
    x: 0, // TODO: pass initial position from opts? or is there a way to see it from rfb?
    y: 0,
  };
  this._rfbConn.on('connect', () => {
    const r = this._rfbConn;
    this._screenBuffer = new cv.Matrix(r.height, r.width, cv.Constants.CV_8UC4);
    this.emit('connect')
    r.requestUpdate(true, 0, 0, r.width, r.height);
    r.on('rect', this._handleRawUpdate.bind(this))
  })
  this._rfbConn.on('error', e => this.emit('error', e))
}
util.inherits(Screen, EventEmitter);

Screen.prototype._handleRawUpdate = function(rect) {
  const r = this._rfbConn;
  r.requestUpdate(true, 0, 0, r.width, r.height);
  const update = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC4);
  update.put(rect.data)
  update.copyTo(this._screenBuffer, rect.x, rect.y);
  this.emit('screen-update', rect);
}

Screen.prototype._connected = async function() {
  if (this._screenBuffer) {
    return Promise.resolve()
  }
  return new Promise((accept, reject) => {
    this.on('connect', accept)
  })
}

Screen.prototype.createTemplateFromFile = async function(path) {
  return new Promise((accept, reject) => {
    const template = new cv.Matrix();
    cv.readImage(path, (err, img) => {
      if (err) {
        return reject(err);
      }
      img.convertTo(template, cv.Constants.CV_8UC4);
      accept(new Template({matrix: template}))
    })
  })
}

Screen.prototype.wait = async function(template) {
  await this._connected();
  // ...
  const maxWait = 10000;
  let cancelling = false;
  return new Promise((accept, reject) => {
    /*
    const cancel = () => {
      if (cancelled) {
        return;
      }
      cancelling = true;
      reject()
    }
    const timeout = setTimeout(cancel, maxWait);
    */
    const findMatch = (rect) => {
      const roi = rect
        ? this._screenBuffer.roi(rect.x - template.width(), rect.y - template.height(), rect.width + 2*template.width(), rect.height + 2*template.height())
        : this._screenBuffer

      console.log('======== ', roi, template.mat)
      const res = this._screenBuffer.matchTemplateByMatrix(template.mat, cv.TM_CCORR_NORMED);
      const m = res.templateMatches(0.9, 1, 5)
      console.log(m)
    }

    findMatch()
    this.on('screen-update', (rect) => {
      console.log('Screen.prototype.wait::screen-update')
      findMatch()
      //accept()
    })
  });
}

Screen.prototype.waitVanish = async function(template) {
  await this._connected()
  // ...
}

Screen.prototype.exists = async function(template) {
  await this._connected()
  // ...
}

Screen.prototype.type = async function(template) {
  await this._connected()
  // ...
}

Screen.prototype.click = async function(mouseOpts) {
  await this._connected()
  // ...
}

module.exports.createScreen = function createScreen(opts) {
  return new Screen(opts)
}
