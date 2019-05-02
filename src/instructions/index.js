const descriptions = require('./descriptions');

// Reexport a direct mapping of (instructionName, opcoode)
module.exports = descriptions.reduce((acc, {opcode, instruction}) => {
  acc[instruction] = opcode;
  return acc;
}, {});
