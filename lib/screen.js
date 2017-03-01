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
    console.log('CONNECTED')
    this._screenBuffer = new cv.Matrix(r.height, r.width, cv.Constants.CV_8UC4);
    console.log('this._screenBuffer = new cv.Matrix', this)
    this.emit('connect')
    r.requestUpdate(true, 0, 0, r.width, r.height);
    r.on('rect', rect => this._handleRawUpdate.call(this, rect))
  })
  this._rfbConn.on('error', e => this.emit('error', e))
}
util.inherits(Screen, EventEmitter);

Screen.prototype._handleRawUpdate = (rect, o) => {
  console.log('_screenBuffer',  o._screenBuffer)
  console.log('_handleRawUpdate', rect, this._screenBuffer)
  const update = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC4);
  update.put(rect.data)
  console.log('111', this._screenBuffer)
  update.copyTo(this._screenBuffer, rect.x, rect.y);
  console.log('222')
  this.emit('screen-update', rect);
}

Screen.prototype._connected = async function() {
  if (this._screenBuffer) {
    console.log('_connected: shortcut')
    return Promise.resolve()
  }
  return new Promise((accept, reject) => {
    console.log('_connected: event')
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
  console.log('AAAAA')
  await this._connected();
  console.log('BBBBBB', this._screenBuffer);
  // ...
  const maxWait = 10000;
  let cancelling = false;
  return new Promise((accept, reject) => {
    const cancel = () => {
      if (cancelled) {
        return;
      }
      cancelling = true;
      reject()
    }
    const timeout = setTimeout(cancel, maxWait);
    this.on('screen-update', (rect) => {
      console.log(rect)
      accept()
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
