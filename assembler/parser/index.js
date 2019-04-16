const fs = require('fs');
const path = require('path');
const {sequenceOf, endOfInput} = require('arcsecond');
const parseDataSection = require('./data-section');
const parseCodeSection = require('./code-section');

const parser = sequenceOf([
  parseDataSection,
  parseCodeSection,
  endOfInput
]).map(([data, code]) => ({
  data,
  code
}));

const filepath = path.join(__dirname, '../test-asm.sm');

fs.readFile(filepath, 'utf8', (_, file) => {
  const res = parser.run(file);

  console.log(JSON.stringify(res.value, null, '  '));
})