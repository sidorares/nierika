const rfb = require('rfb2');
const cv = require('opencv');
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const Template = require('./template.js');

const TM_CCORR_NORMED = 3;

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

Screen.prototype._connected = function() {return __async(function*(){
  if (this._screenBuffer) {
    return Promise.resolve()
  }
  return new Promise((accept, reject) => {
    this.on('connect', accept)
  })
}.call(this))}

Screen.prototype.createTemplateFromFile = function(path) {return __async(function*(){
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
}())}

Screen.prototype.wait = function(template) {return __async(function*(){
  yield this._connected();
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

      const TM_CCORR_NORMED = 3;
      console.log('======== ', this._screenBuffer, template.mat)
      const res = this._screenBuffer.matchTemplateByMatrix(template.mat, TM_CCORR_NORMED);
      const m = res.templateMatches(0.1, 1, 5)
      console.log(m)
    }

    findMatch()
    this.on('screen-update', (rect) => {
      console.log('Screen.prototype.wait::screen-update')
      findMatch()
      //accept()
    })
  });
}.call(this))}

Screen.prototype.waitVanish = function(template) {return __async(function*(){
  yield this._connected()
  // ...
}.call(this))}

Screen.prototype.exists = function(template) {return __async(function*(){
  yield this._connected()
  // ...
}.call(this))}

Screen.prototype.type = function(template) {return __async(function*(){
  yield this._connected()
  // ...
}.call(this))}

Screen.prototype.click = function(mouseOpts) {return __async(function*(){
  yield this._connected()
  // ...
}.call(this))}

module.exports.createScreen = function createScreen(opts) {
  return new Screen(opts)
}

function __async(g){return new Promise(function(s,j){function c(a,x){try{var r=g[x?"throw":"next"](a)}catch(e){j(e);return}r.done?s(r.value):Promise.resolve(r.value).then(c,d)}function d(e){c(e,1)}c()})}
