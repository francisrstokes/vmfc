const PUSH  = 0x01; // Push a value to the stack
const PIP   = 0x02; // Push the instruction pointer to the stack
const PSP   = 0x03; // Push the stack pointer to the stack
const ADD   = 0x04; // Add the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
const INC   = 0x05; // Add one to the value at sp
const DEC   = 0x06; // Subtract one from the value at sp
const MUL   = 0x07; // Multiply the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
const SUB   = 0x08; // Subtract the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
const LSF   = 0x09; // Pop a shift amount S, and the value V, and write the result of V << S
const RSF   = 0x0A; // Pop a shift amount S, and the value V, and write the result of V >> S
const CALL  = 0x0B; // Call a function, pushing the current ip to the stack
const RET   = 0x0C; // Return from a function by swapping the value at sp and (sp - 1) and jumping to the address that was in (sp - 1)
const ISP   = 0x0D; // Increment stack pointer
const DSP   = 0x0E; // Decrement stack pointer
const IIP   = 0x0F; // Increment instruction pointer
const DIP   = 0x10; // Decrement instruction pointer
const JNZ   = 0x11; // Jump if not zero
const JMP   = 0x12; // Set the instruction pointer
const SSP   = 0x13; // Set the stack pointer
const PMS   = 0x14; // Push memory to stack
const PMF   = 0x15; // Push memory to fp + offset
const MSM   = 0x16; // Move stack to memory
const CPS   = 0x17; // Push value from (fp - offset) to top of stack
const SMV   = 0x18; // Move value at top of stack to (fp - offset)
const JEQ   = 0x19; // Jump if equal
const JNE   = 0x1A; // Jump if not equal
const JGT   = 0x1B; // Jump if greater than equal
const JLT   = 0x1C; // Jump if less than equal
const JGE   = 0x1D; // Jump if greater than or equal
const JLE   = 0x1E; // Jump if less than or equal
const AND   = 0x1F; // Logical and
const OR    = 0x20; // Logical or
const XOR   = 0x21; // Logical xor
const NOT   = 0x22; // Logical not


const HALT  = 0xFF; // Halt the program and write the result to the screen
const DBG   = 0xFE; // Debug will force a breakpoint in debug mode
const NOP   = 0xFD; // Noop

module.exports = {
  PUSH,
  PIP,
  PSP,
  ADD,
  INC,
  DEC,
  MUL,
  SUB,
  LSF,
  RSF,
  CALL,
  RET,
  ISP,
  DSP,
  IIP,
  DIP,
  JNZ,
  JMP,
  SSP,
  PMS,
  MSM,
  PMF,
  CPS,
  SMV,
  JEQ,
  JNE,
  JGT,
  JLT,
  JGE,
  JLE,
  AND,
  OR,
  XOR,
  NOT,

  HALT,
  DBG,
  NOP,
};
