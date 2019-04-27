const fs = require('fs');
const path = require('path');
const parser = require('./parser');
const validator = require('./validator');
const transformer = require('./transformer');
const generator = require('./generator');

if (process.argv.length < 3) {
  console.log(`Usage: assemble <asm file>`);
}

// const filepath = path.join(__dirname, '..', '.sketchpad/add-program.sm');
const filepath = path.join(process.cwd(), process.argv[2]);
const assemblyPath = filepath.replace(/\.a?sm$/, '') + '.bin';

fs.readFile(filepath, 'utf8', (err, file) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const ast = transformer(parser(file));
  validator(ast);
  const binary = generator(ast);

  fs.writeFile(assemblyPath, binary, err => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log(`Assembled to ${assemblyPath}`);
  });
});
