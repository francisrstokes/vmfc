const parser = require('./parser');
const translateToAssembly = require('./generator');

module.exports = text => {
  const parsed = parser(text);
  const asm = translateToAssembly.program(parsed);
  return asm.getCode();
};
