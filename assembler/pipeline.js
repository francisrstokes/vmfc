const fs = require('fs');
const path = require('path');
const parser = require('./parser');
const validator = require('./validator');
const transformer = require('./transformer');
const generator = require('./generator');

const parseAndGenerate = text => {
  const ast = transformer(parser(text));
  validator(ast);
  return generator(ast);
};

module.exports = parseAndGenerate;
