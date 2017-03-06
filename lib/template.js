function Template(opts) {
  this._mat = opts.matrix;
  this._similarity = opts.similarity || 0.99;
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
  return new Template({
    matrix: this._mat,
    similarity: similarity
  });
};

module.exports = Template;
