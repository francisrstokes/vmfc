const StackMachine = require('./stack-machine');
const {
  PUSH,
  NOP,
  DBG,
  CALL,
  HALT,
  ADD,
  RET,
} = require('./instructions');

const machine = new StackMachine();

const program = new Uint16Array([
  // Variables for this stack frame
  /* 0x0000 */ PUSH, 0x01,
  /* 0x0004 */ PUSH, 0x02,
  /* 0x0008 */ PUSH, 0x03,
  /* 0x000C */ PUSH, 0x04,
  /* 0x000F */ PUSH, 0x05,
  /* 0x0014 */ NOP,

  // Now make a call using calling convention
  /* 0x0016 */ PUSH, 0x6, // Arg 1
  /* 0x001A */ PUSH, 0x7, // Arg 2
  /* 0x001e */ PUSH, 0x2, // Number of args
  /* 0x0022 */ PUSH, 0x2C, // Address
  /* 0x0026 */ DBG,
  /* 0x0028 */ CALL,

  /* 0x002a */ HALT,

  /* 0x002c */ ADD,
  /* 0x002e */ PUSH, 0x1,
  /* 0x0032 */ ADD,
  /* 0x0034 */ DBG,
  /* 0x0036 */ RET,
]);


machine.load(program);

machine.run();

debugger;