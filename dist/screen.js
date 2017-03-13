const rfb = require('rfb2');
const cv = require('opencv');
const util = require('util');
const throttle = require('lodash.throttle');
const keysym = require('keysym');
const fs = require('fs');
const EventEmitter = require('events').EventEmitter;
const Template = require('./template.js')

const rgb = m => {
  const r = new cv.Matrix();
  r.merge(m.split().slice(0, 3));
  return r;
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
  this._opts = opts; // TODO merge default opts into ots, remove lines below
  this._mouseMoveSpeed = 1000; // pix/sec
  this._mouseClickSpeed = 200;
  this._mouseDoubleClickSpeed = 100;
  this._keyboardTypeSpeed = 10;
  this._minSize = 12;
  this._minMatchInterval = 250;
  this._cursorShape = null;
  this._rfbConn.on('connect', () => {
    const r = this._rfbConn;
    this._screenBuffer = new cv.Matrix(r.height, r.width, cv.Constants.CV_8UC3);
    /*
    this._pyramid = [];
    const pyrImage = this._screenBuffer.clone()
    while(Math.min(pyrImage.width() / 2, pyrImage.height() / 2) > this._minSize) {
      pyrImage.pyrDown();
      this._pyramid.push(pyrImage.clone);
    }
    */
    this.emit('connect')
    r.requestUpdate(true, 0, 0, r.width, r.height);
    r.on('rect', this._handleRawUpdate.bind(this))
  })
  this._rfbConn.on('error', e => {
    this._rfbError = e
    this.emit('error', e)
  })
}
util.inherits(Screen, EventEmitter);

Screen.prototype._handleRawUpdate = function(rect) {
  const r = this._rfbConn;
  if (rect.encoding == rfb.encodings.raw) {
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const r = this._rfbConn;
    const update = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC4);
    update.put(rect.buffer)
    rgb(update).copyTo(this._screenBuffer, rect.x, rect.y);
    this.emit('screen-update', rect);
  } else if (rect.encoding === rfb.encodings.pseudoDesktopSize) {
    this._screenBuffer = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC3);
    // TODO anything else required to handle resize?
  } else if (rect.encoding === rfb.encodings.pseudoCursor) {
    this._cursorShape = rect
    this.emit('cursor-update', rect);
  }
  r.requestUpdate(true, 0, 0, r.width, r.height);
}

Screen.prototype._connected = function() {return __async(function*(){
  if (this._screenBuffer) {
    return Promise.resolve()
  }
  if (this._rfbError) {
    return Promise.reject(this._rfbError)
  }
  return new Promise((accept, reject) => {
    this.once('connect', accept)
    this.once('error', reject)
  })
}.call(this))}

Screen.prototype.sleep = function(ms) {return __async(function*(){
  return new Promise((accept, reject) => {
    setTimeout(accept, ms);
  })
}())}

 Screen.prototype.createTemplateFromFile = function(path) {return __async(function*(){
  return new Promise((accept, reject) => {
    const template = new cv.Matrix();
    // node-opencv does not error if file is not found and instead
    // just returns 0x0 matriz :(
    // add extra check on top
    fs.stat(path, (err, stat) => {
      if (err) {
        return reject(err);
      }
      cv.readImage(path, (err, img) => {
        if (err) {
          return reject(err);
        }
        img.convertTo(template, cv.Constants.CV_8UC4);
        accept(new Template({
          matrix: rgb(template),
          pyramidMinSize: this._opts.minTemplateSize,
          name: path
        }))
      })
    })
  })
}.call(this))}

Screen.prototype.waitVisible = function(template, maxWait=0) {return __async(function*(){
  yield this._connected();
  return new Promise((accept, reject) => {
    let timeout = null;
    let dirtyArea = null;

    const findMatch = (rect) => {
      dirtyArea = null

      let region = this._screenBuffer;

      if (rect) {
        let left  = rect.x - template.width()
        if (left < 0) {
          left = 0
        }
        let right = rect.x + rect.width + template.width()
        if (right > region.width()) {
          right = region.width()
        }
        let top  = rect.y - template.height()
        if (top < 0) {
          top = 0
        }
        let bottom = rect.y + rect.height + template.height()
        if (bottom > region.height()) {
          bottom = region.height()
        }
        region = region.roi(left, top, right - left, bottom - top)
      }

      const origin = region.locateROI();
      const res = region.matchTemplateByMatrix(template._mat);
      const m = res.templateMatches(template.similarity(), 1, 1)
      if (m[0]) {
        this.removeListener('screen-update', handleScreenUpdate)
        if (timeout) {
          clearTimeout(timeout);
        }
        const match = m[0] ? {
          x: origin[2] + m[0].x + template.width() / 2,  // TODO: use template offset
          y: origin[3] + m[0].y + template.height() / 2, // TODO: use template offset
          probability: m[0].probability
        } : m[0]
        accept(match)
      }
    }
    const cancel = () => {
      this.removeListener('screen-update', handleScreenUpdate)
      reject()
    }
    if (maxWait > 0) {
      timeout = setTimeout(cancel, maxWait)
    }
    const throttledFind = throttle(findMatch, this._minMatchInterval);
    findMatch()

    function handleScreenUpdate(rect) {
      if (dirtyArea) {
        if (rect.x < dirtyArea.x) {
          dirtyArea.x = rect.x;
        }
        if (rect.y < dirtyArea.y) {
          dirtyArea.y = rect.y;
        }

        let right = dirtyArea.x + dirtyArea.width;
        let bottom = dirtyArea.y + dirtyArea.height;
        let updateRight = rect.x + rect.width;
        let updateBottom = rect.y + rect.height;

        if (updateRight > right) {
          dirtyArea.width = updateRight - dirtyArea.x
        }
        if (updateBottom > bottom) {
          dirtyArea.height = updateBottom - dirtyArea.y
        }
      } else {
        dirtyArea = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        }
      }
      throttledFind(dirtyArea)
    }
    this.on('screen-update', handleScreenUpdate);
  });
}.call(this))}

Screen.prototype.waitVanish = function(template) {return __async(function*(){
  yield this._connected()

  return new Promise((accept, reject) => {
    // v1, super non-optimized.
    let throttledCheckMatches = null;
    const checkMatches = () => {
      const maxMatches = 1;
      const region = this._screenBuffer;
      const res = region.matchTemplateByMatrix(template._mat);
      const m = res.templateMatches(template.similarity(), 1, maxMatches)
      if (!m[0]) {
        this.removeListener('screen-update', throttledCheckMatches)
        accept()
      }
    }
    throttledCheckMatches = throttle(checkMatches, this._minMatchInterval);
    checkMatches()
    this.on('screen-update', throttledCheckMatches);
  });

  // ...
  // pseudo-code
  // 0) initial region = screen
  // 1) create a list of all matches visible on initial region right now (make sure it's converted from raw matches list to list of non-intersection regions. Or maibe "not-too-intersecting?")
  //  - if list is empty, done.
  // on screen updates, maintain 'dirty region'
  // if update touches area in the current list, re-check if area still contains match. If not, remove from list
  // once list is empty - go to step 1 using 'dirty area' for initial region

  // not-too-intersecting: overlap area < some factor from main rect area
  // http://jsfiddle.net/uthyZ/
  // x_overlap = Math.max(0, Math.min(x12,x22) - Math.max(x11,x21))
  // y_overlap = Math.max(0, Math.min(y12,y22) - Math.max(y11,y21));
  // area = x_overlap*y_overlap
}.call(this))}

Screen.prototype.exists = function(template) {return __async(function*(){
  yield this._connected()
  // ...
}.call(this))}

function sleep(ms) {
  return new Promise((accept, reject) => {
    setTimeout(accept, ms);
  })
}

Screen.prototype.mouseButtonDown = function(button) {return __async(function*(){
  yield this._connected()
  const buttonMask = 1 << button;
  this._mouseState.buttons = this._mouseState.buttons | buttonMask;
  this._rfbConn.pointerEvent(
    this._mouseState.x,
    this._mouseState.y,
    this._mouseState.buttons
  );
}.call(this))}

Screen.prototype.mouseButtonUp = function(button) {return __async(function*(){
  yield this._connected()
  const buttonMask = 1 << button;
  this._mouseState.buttons = this._mouseState.buttons & (~buttonMask)
  this._rfbConn.pointerEvent(
    this._mouseState.x,
    this._mouseState.y,
    this._mouseState.buttons
  );
}.call(this))}

Screen.prototype.mouseButtonClick = function(button) {return __async(function*(){
  yield this.mouseButtonDown(button)
  yield sleep(this._mouseClickSpeed);
  this.mouseButtonUp(button)
}.call(this))}

Screen.prototype.mouseLeftClick = function() {return __async(function*(){
  return this.mouseButtonClick(0)
}.call(this))}

Screen.prototype.mouseMiddleClick = function() {return __async(function*(){
  return this.mouseButtonClick(1)
}.call(this))}

Screen.prototype.mouseRightClick = function() {return __async(function*(){
  return this.mouseButtonClick(2)
}.call(this))}

Screen.prototype.mouseWheeDown = function() {return __async(function*(){
  return this.mouseButtonClick(3)
}.call(this))}

Screen.prototype.mouseWheelUp = function() {return __async(function*(){
  return this.mouseButtonClick(4)
}.call(this))}

Screen.prototype.mouseLeftDoubleClick = function() {return __async(function*(){
  yield this.mouseLeftClick();
  yield sleep(this._mouseDoubleClickSpeed);
  yield this.mouseLeftClick();
}.call(this))}

Screen.prototype.mouseMove = function(x, y) {return __async(function*(){
  if (x.constructor === Template) {
    const match = yield this.waitVisible(x)
    return this.mouseMove(match.x, match.y)
  }

  const location = {x, y};
  yield this._connected()

  const dx = location.x - this._mouseState.x;
  const dy = location.y - this._mouseState.y;
  const d = Math.sqrt(dx*dx + dy*dy);

  const eta = 1000 * d / this._mouseMoveSpeed;

  const startTime = +new Date()
  const startX = this._mouseState.x
  const startY = this._mouseState.y

  const moveInterval = 16; // 60/sec
  return new Promise((accept, reject) => {
    const updatePosition = () => {
      const dt = new Date() - startTime;
      const x = startX + 0.001*this._mouseMoveSpeed*dt*dx/d
      const y = startY + 0.001*this._mouseMoveSpeed*dt*dy/d
      if (dt < eta) {
        this._rfbConn.pointerEvent(x, y, this._mouseState.buttons);
        this._mouseState.x = x;
        this._mouseState.y = y;
        return setTimeout(updatePosition, moveInterval);
      } else {
        this._rfbConn.pointerEvent(location.x, location.y, this._mouseState.buttons);
        this._mouseState.x = location.x;
        this._mouseState.y = location.y;
        return accept()
      }
    }
    updatePosition();
  });
}.call(this))}

Screen.prototype.keyboardKeyDown = function(key) {return __async(function*(){
  yield this._connected();
  const keySym = typeof key === 'string' ? keysym.fromName(key).keysym : key;
  this._rfbConn.keyEvent(keySym, 1);
}.call(this))};

Screen.prototype.keyboardKeyUp = function(key) {return __async(function*(){
  yield this._connected();
  const keySym = typeof key === 'string' ? keysym.fromName(key).keysym : key;
  this._rfbConn.keyEvent(keySym, 0);
}.call(this))};

Screen.prototype.keyboardKeyPress = function(key) {return __async(function*(){
  yield this.keyboardKeyDown(key);
  yield sleep(this._keyboardTypeSpeed);
  yield this.keyboardKeyUp(key);
  yield sleep(this._keyboardTypeSpeed);
}.call(this))};

Screen.prototype.keyboardTypeText = function(text) {return __async(function*(){
  for (let i=0; i < text.length; ++i) {
    yield this.keyboardKeyDown(text[i].charCodeAt(0));
    yield sleep(this._keyboardTypeSpeed);
    yield this.keyboardKeyUp(text[i].charCodeAt(0));
    yield sleep(this._keyboardTypeSpeed);
  }
}.call(this))};

module.exports.createScreen = function createScreen(opts) {
  return new Screen(opts)
}

function __async(g){return new Promise(function(s,j){function c(a,x){try{var r=g[x?"throw":"next"](a)}catch(e){j(e);return}r.done?s(r.value):Promise.resolve(r.value).then(c,d)}function d(e){c(e,1)}c()})}
