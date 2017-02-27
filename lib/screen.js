const rfb = require('rfb2');
const cv = require('opencv');
const util = require('util');
const EventEmitter = require('events').EventEmitter;

function Template(matrix) {
  this._mat = matrix
}

Template.prototype.width = function () {
  return this._mat.cols()
}

Template.prototype.height = function () {
  return this._mat.rows()
}

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
  })
  this._rfbConn.on('error', e => this.emit('error', e))
}
util.inherits(Screen, EventEmitter);

Screen.prototype._handleRawUpdate = (rect) => {
  const update = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC4);
  update.put(rect.data)
  update.copyTo(this._screenBuffer, rect.x, rect.y);
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
  return newPromise((accept, reject) => {
    const template = new cv.Matrix();
    cv.readImage(path, (err, img) => {
      if (err) {
        return reject(err);
      }
      img.convertTo(template, cv.Constants.CV_8UC4);
      accept(new Template(template))
    })
  }
}

Screen.prototype.wait = async function(template) {
  await this._connected();
  // ...
  const maxWait = 10000;
  let cancelling = false;
  return newPromise((accept, reject) => {
    const cancel = () => {
      if (cancelled) {
        return;
      }
      cancelling = true;
      reject()
    }
    const timeout = setTimeout(cancel, maxWait);
    this.on('screen-update', (rect) => {
      //
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

module.exports = createScreen(opts) {
  return new Screen(opts)
}
