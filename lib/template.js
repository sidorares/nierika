function Template (params) {
  this.mat = params.matrix;
}

Template.prototype.width = function () {
  console.log('this.mat.width()', this.mat.width())
  return this.mat.width();
};

Template.prototype.height = function () {
  console.log('this.mat.height()', this.mat.height())
  return this.mat.height();
};

module.exports = Template;
