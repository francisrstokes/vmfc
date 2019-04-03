const fs = require('fs');
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

fs.readFile('/Users/francisstokes/repos/testbed/stack-machine/assembler/test-asm.sm', 'utf8', (_, file) => {
  const res = parser.run(file);

  console.log(JSON.stringify(res.value, null, '  '));
})