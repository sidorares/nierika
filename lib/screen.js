const rfb = require('rfb2');
const cv = require('opencv');
const util = require('util');
const throttle = require('lodash.throttle');
const keysym = require('keysym');
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
  this._mouseMoveSpeed = 1400; // pix/sec
  this._mouseClickSpeed = 200;
  this._mouseDoubleClickSpeed = 100;
  this._keyboardTypeSpeed = 10;
  this._minSize = 12;
  this._minMatchInterval = 500;
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
    console.log('CONNECTED  =====')
    r.requestUpdate(true, 0, 0, r.width, r.height);
    r.on('rect', this._handleRawUpdate.bind(this))
  })
  this._rfbConn.on('error', e => this.emit('error', e))
}
util.inherits(Screen, EventEmitter);

Screen.prototype._handleRawUpdate = function(rect) {
  console.log('GOT UPDATE', rect.width, rect.height);
  if (rect.width === 0 || rect.height === 0) {
    return;
  }
  const r = this._rfbConn;
  r.requestUpdate(true, 0, 0, r.width, r.height);
  const update = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC4);
  update.put(rect.buffer)
  rgb(update).copyTo(this._screenBuffer, rect.x, rect.y);
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

Screen.prototype.sleep = async function(ms) {
  return new Promise((accept, reject) => {
    setTimeout(accept, ms);
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
      accept(new Template({
        matrix: rgb(template),
        pyramidMinSize: this._opts.minTemplateSize
      }))
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

let counter = 0;
let rect_counter = 0;

Screen.prototype.waitVisible = async function(template, maxWait=0) {
  await this._connected();
  return new Promise((accept, reject) => {
    let timeout = null;
    let dirtyArea = null;

    const findMatch = (rect) => {
      console.log('findMatch!', rect)
      dirtyArea = null

      let region = this._screenBuffer
      region.save(`screen-${counter}-full.png`)

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

      counter++;

      region.save(`screen-${counter}-${rect_counter}.png`)
      template._mat.save(`screen-${counter}-template.png`)

      const origin = region.locateROI();
      const res = region.matchTemplateByMatrix(template._mat);
      const m = res.templateMatches(template.similarity(), 1, 1)
      if (m[0]) {
        console.log('Got match!', m, ' count:', counter)
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
}

Screen.prototype.waitVanish = async function(template) {
  await this._connected()
  // ...
}

Screen.prototype.exists = async function(template) {
  await this._connected()
  // ...
}

function sleep(ms) {
  return new Promise((accept, reject) => {
    setTimeout(accept, ms);
  })
}

Screen.prototype.mouseLeftClick = async function() {
  this._rfbConn.pointerEvent(
    this._mouseState.x,
    this._mouseState.y,
    1//this._mouseState.buttons | 1
  );
  await sleep(this._mouseClickSpeed);
  this._rfbConn.pointerEvent(
    this._mouseState.x,
    this._mouseState.y,
    0//this._mouseState.buttons & 0xfe
  );
}

Screen.prototype.mouseLeftDoubleClick = async function() {
  await this.mouseLeftClick();
  await sleep(this._mouseDoubleClickSpeed);
  await this.mouseLeftClick();
}

Screen.prototype.mouseMove = async function(x, y) {
  const location = {x, y};
  await this._connected()

  const dx = location.x - this._mouseState.x;
  const dy = location.y - this._mouseState.y;
  const d = Math.sqrt(dx*dx + dy*dy);

  const eta = 1000 *d / this._mouseMoveSpeed;

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
}

Screen.prototype.keyboardKeyDown = async function(key) {
  await this._connected();
  const keySym = typeof key === 'string' ? keysym.fromName(key).keysym : key;
  this._rfbConn.keyEvent(keySym, 1);
};

Screen.prototype.keyboardKeyUp = async function(key) {
  await this._connected();
  const keySym = typeof key === 'string' ? keysym.fromName(key).keysym : key;
  this._rfbConn.keyEvent(keySym, 0);
};

Screen.prototype.keyboardKeyPress = async function(key) {
  await this._connected();
  await this.keyboardKeyDown(key);
  await sleep(this._keyboardTypeSpeed);
  await this.keyboardKeyUp(key);
  await sleep(this._keyboardTypeSpeed);
};

Screen.prototype.keyboardTypeText = async function(text) {
  for (let i=0; i < text.length; ++i) {
    await this.keyboardKeyDown(text[i].charCodeAt(0));
    await sleep(this._keyboardTypeSpeed);
    await this.keyboardKeyUp(text[i].charCodeAt(0));
    await sleep(this._keyboardTypeSpeed);
  }
};

module.exports.createScreen = function createScreen(opts) {
  return new Screen(opts)
}
