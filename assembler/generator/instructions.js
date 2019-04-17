const instructions = require('../../instructions');

module.exports = {
  add: {
    byteLength: 2,
    opcode: instructions.ADD
  },
  pip: {
    byteLength: 2,
    opcode: instructions.PIP
  },
  psp: {
    byteLength: 2,
    opcode: instructions.PSP
  },
  inc: {
    byteLength: 2,
    opcode: instructions.INC
  },
  dec: {
    byteLength: 2,
    opcode: instructions.DEC
  },
  mul: {
    byteLength: 2,
    opcode: instructions.MUL
  },
  sub: {
    byteLength: 2,
    opcode: instructions.SUB
  },
  call: {
    byteLength: 2,
    opcode: instructions.CALL
  },
  ret: {
    byteLength: 2,
    opcode: instructions.RET
  },
  isp: {
    byteLength: 2,
    opcode: instructions.ISP
  },
  dsp: {
    byteLength: 2,
    opcode: instructions.DSP
  },
  iip: {
    byteLength: 2,
    opcode: instructions.IIP
  },
  dip: {
    byteLength: 2,
    opcode: instructions.DIP
  },
  halt: {
    byteLength: 2,
    opcode: instructions.HALT
  },
  dbg: {
    byteLength: 2,
    opcode: instructions.DBG
  },
  push: {
    byteLength: 4,
    opcode: instructions.PUSH
  },
  jnz: {
    byteLength: 4,
    opcode: instructions.JNZ
  },
  jmp: {
    byteLength: 4,
    opcode: instructions.JMP
  },
  ssp: {
    byteLength: 4,
    opcode: instructions.SSP
  },
  lsf: {
    byteLength: 4,
    opcode: instructions.LSF
  },
  rsf: {
    byteLength: 4,
    opcode: instructions.RSF
  },
};
