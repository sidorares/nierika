  const assert = require('assert');

  var cv = require('/tmp/node-opencv');
  var targetFilename = "./screen2-23.png";
  var templateFilename = "./screen-sub.png";
  cv.readImage(targetFilename, function(err, target){
    cv.readImage(templateFilename, function(err, template){
      console.log(target, template);
      var TM_CCORR_NORMED = 3;
      var res = target.matchTemplateByMatrix(template, TM_CCORR_NORMED);
      var m = res.templateMatches(0.9, 1, 10);
      var minMax = res.minMaxLoc();
      var topLeft = minMax.maxLoc;
      console.log(topLeft, "RGB Found Match");
      console.log(m)
    });
  })
