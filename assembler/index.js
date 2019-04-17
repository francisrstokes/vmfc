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

  const binary = generator(ast);

  fs.writeFile(path.join(__dirname, '../test.bin'), binary, () => {
    console.log('Done');
  });
  // console.log(JSON.stringify(ast, null, '  '));
});
