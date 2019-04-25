const {sequenceOf, endOfInput, toValue, many} = require('arcsecond');
const sectionParser = require('./data-section');
const parseCodeSection = require('./code-section');

const parser = sequenceOf([
  many(sectionParser),
  parseCodeSection,
  endOfInput
]).map(([sections, code]) => ({
  sections,
  code
}));

module.exports = input => toValue(parser.run(input));
