const rfb = require('rfb2');
const cv = require('opencv');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

const rgb = m => {
  const r = new cv.Matrix();
  r.merge(m.split().slice(0, 3));
  return r;
};

const RfbScreen = function(opts) {
  EventEmitter.call(this);
  this._rfbConn = rfb.createConnection(opts);
  this._screenBuffer = null;
  this._mouseState = {
    buttons: 0, // all buttons up
    x: 0, // TODO: pass initial position from opts? or is there a way to see it from rfb?
    y: 0
  };
  this._opts = Object.assign({}, opts);
  this._mouseMoveSpeed = 1000; // pix/sec
  this._mouseClickSpeed = 200;
  this._mouseDoubleClickSpeed = 100;
  this._keyboardTypeSpeed = 10;
  this._cursorShape = null;
  this._rfbConn.on('connect', () => {
    const r = this._rfbConn;
    this._screenBuffer = new cv.Matrix(r.height, r.width, cv.Constants.CV_8UC3);
    this.emit('connect');
    r.requestUpdate(true, 0, 0, r.width, r.height);
    r.on('rect', this._handleRawUpdate.bind(this));
  });
  this._rfbConn.on('error', e => {
    this._rfbError = e;
    this.emit('error', e);
  });
};

util.inherits(RfbScreen, EventEmitter);

RfbScreen.prototype._handleRawUpdate = function(rect) {
  const r = this._rfbConn;
  if (rect.encoding == rfb.encodings.raw) {
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const r = this._rfbConn;
    const update = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC4);
    update.put(rect.buffer);
    rgb(update).copyTo(this._screenBuffer, rect.x, rect.y);
    this.emit('screen-update', rect);
  } else if (rect.encoding === rfb.encodings.pseudoDesktopSize) {
    this._screenBuffer = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC3);
    // TODO anything else required to handle resize?
    // TODO: emit resize event
  } else if (rect.encoding === rfb.encodings.pseudoCursor) {
    this._cursorShape = rect;
    this.emit('cursor-update', rect);
  }
  r.requestUpdate(true, 0, 0, r.width, r.height);
};

RfbScreen.prototype.getContent = function() {
  return this._screenBuffer;
};
