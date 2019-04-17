const fs = require('fs');
const path = require('path');
const parser = require('./parser');
const validator = require('./validator');
const generator = require('./generator');

const filepath = path.join(__dirname, './simple.sm');
// const filepath = path.join(__dirname, './test-asm.sm');

fs.readFile(filepath, 'utf8', (_, file) => {
  const ast = parser(file);

  validator(ast);

  const gen = generator(ast);

  console.log(JSON.stringify(ast, null, '  '));
});
