var rfb = require('rfb2');
var ui = require('ntk');
var cv = require('opencv');

//var Ocrad = require('ocrad.js');
var oldlog = console.log;
//console.log = function(a, b, c, d, e, f) {
//  console.trace();
//  oldlog.call(console, a, b, c, d, e, f)
//}

var Tesseract = require('tesseract.js')

var screen;
var template = new cv.Matrix();
var templatePyr;
cv.readImage('./templates/template.png', function(err, img) {
  img.convertTo(template, cv.Constants.CV_8UC4)
  templatePyr = template.clone();
  templatePyr.pyrDown();
  templatePyr.pyrDown();
})

ui.createClient(main);
function main(err, app) {
  var mainwnd;
  var r = rfb.createConnection({
    host: '127.0.0.1',
    port: 5902,
    password: 'vncpassword',
    encodings: [rfb.encodings.raw, rfb.encodings.pseudoCursor]
  });
  r.on('connect', afterConnect);
  function afterConnect() {
      screen = new cv.Matrix(r.height, r.width, cv.Constants.CV_8UC4);
      mainwnd = app.createWindow({}).map();
      var buttonsState = 0;
      mainwnd.on('mousemove', function(ev) { r.pointerEvent(ev.x, ev.y, buttonsState) });
      var ctx = mainwnd.getContext('2d');

      var handleMouseClick = function(ev) {
        var buttonBit = 1 << (ev.keycode - 1);
        // set button bit
        if (ev.type == 4) // TODO use event name
          buttonsState |= buttonBit;
        else
          buttonsState &= ~buttonBit;
          r.pointerEvent(ev.x, ev.y, buttonsState);
      };
      mainwnd.on('mouseup', handleMouseClick);
      mainwnd.on('mousedown', handleMouseClick);

      function moveMouse(x, y) {
        if (x + 1 < 400 && y + 2 < 400) {
          x += 1;
          y += 2;
          r.pointerEvent(x, y)
          console.log(x, y)
          setTimeout(() => moveMouse(x, y), 100)
        } else {
          r.pointerEvent(400, 400)
        }
      }
      //moveMouse(0, 0);

      r.requestUpdate(true, 0, 0, r.width, r.height);
      r.on('rect', function(rect) {
        if (rect.encoding == rfb.encodings.raw) {
          r.requestUpdate(true, 0, 0, r.width, r.height);
          rect.data = rect.buffer; // TODO: rename in rfb
          ctx.putImageData(rect, rect.x, rect.y);

          //console.log(Ocrad(rect))

          //if ( (rect.width > 300) && (rect.height > 300)) {
            Tesseract.recognize({
              width: rect.width,
              height: rect.height,
              data: new Uint8Array(rect.data)
            })
              //.progress(function  (p) { console.log('progress', p)    })
              .then(function (result) { 
                console.log('result', result) 
              })
          //}


          var update = new cv.Matrix(rect.height, rect.width, cv.Constants.CV_8UC4);
          update.put(rect.data)
          update.copyTo(screen, rect.x, rect.y);

          return;

          const TM_CCORR_NORMED = 3;
          //var im = new cv.Matrix();
          //screen.convertTo(im, cv.Constants.CV_8UC4)
          //const res = im.matchTemplateByMatrix(template, TM_CCORR_NORMED);

          var screenPyr = screen.clone()
          screenPyr.pyrDown();
          screenPyr.pyrDown();

          var resPyr = screenPyr.matchTemplateByMatrix(templatePyr, TM_CCORR_NORMED);
          //console.log(resPyr.templateMatches(0.989, 1, 10));

          return;
          const res = screen.roi(10, 10, 300, 300).matchTemplateByMatrix(template, TM_CCORR_NORMED);

          //debugger

          var m = res.templateMatches(0.989, 1, 10)
          console.log(m)
          if (!m || !m[0])
            return
          //ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
          ctx.lineWidth = 5;
          ctx.strokeStyle = 'rgba(10, 100, 10, 0.3)';
          ctx.rect(10 + m[0].x, 10 + m[0].y, template.width(), template.height())
          ctx.stroke()
          if (m[1]) {
            ctx.strokeStyle = 'rgba(200, 10, 10, 0.3)';
            ctx.rect(10 + m[1].x, 10 + m[1].y, template.width(), template.height())
            ctx.stroke()
          }
          //ctx.fillRect(m[0].x, m[0].y, 100, 100);
          //ctx.fillRect(m[1].x, m[1].y, 100, 100);


        } else {
          console.log(rect);
        }
        r.requestUpdate(true, 0, 0, r.width, r.height);
      });
      mainwnd.on('close', r.end.bind(r));
    }
}
