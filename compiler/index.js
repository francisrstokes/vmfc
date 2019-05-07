const fs = require('fs');
const path = require('path');

const parser = require('./parser');
const translateToAssembly = require('./generator');
const compilerPipeline = require('./pipeline');
const assemblyPipeline = require('../assembler/pipeline');

// if (process.argv.length < 3) {
//   console.log(`Usage: compile <vmfc file>`);
// }

const filepath = path.join(__dirname, '../.sketchpad/compiler', 'test.vmfc');
// const filepath = path.join(process.cwd(), process.argv[2]);
const buildPath = filepath.replace(/\.vmfc$/, '') + '.bin';

fs.readFile(filepath, 'utf8', (err, file) => {
  if (err) {
    throw err;
  }

  const asm = compilerPipeline(file);
  const binary = assemblyPipeline(asm);

  fs.writeFile(buildPath, binary, err => {
    if (err) {
      throw err;
    }
    console.log(`Wrote to ${buildPath}`);
  })
});
