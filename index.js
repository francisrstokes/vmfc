const fs = require('fs');
const path = require('path');

const StackMachine = require('./stack-machine');
const machine = new StackMachine();


fs.readFile(path.join(__dirname, './test.bin'), (err, data) => {
  if (err) {
    debugger;
  }
  machine.load(data.buffer);

  machine.run();
})