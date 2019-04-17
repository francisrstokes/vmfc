const fs = require('fs');
const path = require('path');
const {sequenceOf, endOfInput, toValue} = require('arcsecond');
const {dataParser, roDataParser} = require('./data-section');
const parseCodeSection = require('./code-section');

const parser = sequenceOf([
  roDataParser,
  dataParser,
  parseCodeSection,
  endOfInput
]).map(([rodata, data, code]) => ({
  rodata,
  data,
  code
}));

module.exports = input => toValue(parser.run(input));
