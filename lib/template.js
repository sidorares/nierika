function Template (opts) {
  this._opts = opts;
  this._opts.minTemplateSize = 12; // TODO hack
  this._mat = opts.matrix;
  this._similarity = opts.similarity || 0.99;
  this._matPyrDown = this._mat.clone()
  let pyrLevel = 0;
  this._pyrFactor = 1;
  this._name = opts.name;
  while(Math.min(this._matPyrDown.width() / 2, this._matPyrDown.width() / 2) > this._opts.minTemplateSize) {
    pyrLevel++;
    this._matPyrDown.pyrDown();
    this._pyrFactor *= 2;
  }
}

Template.prototype.similarity = function () {
  return this._similarity;
};

Template.prototype.width = function () {
  return this._mat.width();
};

Template.prototype.height = function () {
  return this._mat.height();
};

Template.prototype.similar = function (similarity) {
  return new Template(Object.assign(
    {},
    this._opts, {
      similarity: similarity
    }
  ));
};

module.exports = Template;
