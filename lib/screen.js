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
  update.put(rect.buffer)
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

function clamp(val, max) {
  if (val < 0) {
    return 0;
  }
  if (val > max) {
    return max;
  }
  return val
}

Screen.prototype.wait = async function(template) {
  await this._connected();
  // ...
  const maxWait = 10000;
  let cancelling = false;
  return new Promise((accept, reject) => {
    const findMatch = (rect) => {

      if (!rect) {
        return
      }

      const left  = clamp(rect.x - template.width(), this._screenBuffer.width())
      const top   = clamp(rect.y - template.height(), this._screenBuffer.height())
      console.log('roi(left, top, rect.width + 2*template.width(), rect.height + 2*template.height())', left, top, rect.width + 2*template.width(), rect.height + 2*template.height())
      const roi = rect
        ? this._screenBuffer.roi(left, top, rect.width + 2*template.width(), rect.height + 2*template.height())
        : this._screenBuffer

      const res = this._screenBuffer.matchTemplateByMatrix(template.mat, 3);
      const m = res.templateMatches(0.95, 1, 2)
      console.log(m)
      if (m) {
        //this.removeListener('screen-update', findMatch)
        //clearTimeout(timeout)
        //accept(m)
        console.log(m)
      }
    }

    const cancel = () => {
      cancelled = true;
      this.removeListener('screen-update', findMatch)
      reject()
    }
    const timeout = setTimeout(cancel, maxWait);
    findMatch();
    this.on('screen-update', findMatch);
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
