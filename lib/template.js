function Template(opts) {
  this._mat = opts.matrix;
  this._similarity = opts.similarity || 0.99;
}

Template.prototype.similarity = function () {
  return this._similarity;
};

Template.prototype.width = function () {
  return this._similarity;
};

Template.prototype.height = function () {
  return this._mat.rows();
};

module.exports = Template;
