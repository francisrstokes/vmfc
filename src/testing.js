const fs = require('fs');
const path = require('path');

const StackMachine = require('./stack-machine');


class MMStackMachine extends StackMachine {
  readU16(address) {
    return super.readU16(address);
  }

  writeU16(address, value) {
    return super.writeU16(address, value);
  }
}

const machine = new MMStackMachine();

const binaryPath = process.argv.length < 3
  // ? path.join(process.cwd(), './.sketchpad/basic.bin')
  ? path.join(process.cwd(), './.sketchpad/add-program.bin')
  : path.join(process.cwd(), process.argv[2]);

console.log(`Loading binary ${binaryPath}`);

fs.readFile(binaryPath, (err, data) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  machine.load(data.buffer);
  machine.run();
});