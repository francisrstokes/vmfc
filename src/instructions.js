let nextOpcode = 1;

// push instructions
const PUSH  = nextOpcode++; // Push a value to the stack
const PIP   = nextOpcode++; // Push the instruction pointer to the stack
const PSP   = nextOpcode++; // Push the stack pointer to the stack
const PMS   = nextOpcode++; // Push memory to stack
const PMF   = nextOpcode++; // Push memory to fp + offset
const CPS   = nextOpcode++; // Push value from (fp - offset) to top of stack

// Arithmetic
const ADD   = nextOpcode++; // Add the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
const INC   = nextOpcode++; // Add one to the value at sp
const DEC   = nextOpcode++; // Subtract one from the value at sp
const MUL   = nextOpcode++; // Multiply the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
const SUB   = nextOpcode++; // Subtract the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
const LSF   = nextOpcode++; // Pop a shift amount S, and the value V, and write the result of V << S
const RSF   = nextOpcode++; // Pop a shift amount S, and the value V, and write the result of V >> S
const AND   = nextOpcode++; // Logical and
const OR    = nextOpcode++; // Logical or
const XOR   = nextOpcode++; // Logical xor
const NOT   = nextOpcode++; // Logical not

// Calling/returning
const CALL  = nextOpcode++; // Call a function, pushing the current ip to the stack
const RET   = nextOpcode++; // Return from a function by swapping the value at sp and (sp - 1) and jumping to the address that was in (sp - 1)

// Modifying internal state
const ISP   = nextOpcode++; // Increment stack pointer
const DSP   = nextOpcode++; // Decrement stack pointer
const IIP   = nextOpcode++; // Increment instruction pointer
const DIP   = nextOpcode++; // Decrement instruction pointer
const SSP   = nextOpcode++; // Set the stack pointer
const HALT  = nextOpcode++; // Halt the program and write the result to the screen
const DBG   = nextOpcode++; // Debug will force a breakpoint in debug mode
const NOP   = nextOpcode++; // Noop

// Branching
const JNZ   = nextOpcode++; // Jump if not zero
const JZ    = nextOpcode++; // Jump if zero
const JMP   = nextOpcode++; // Set the instruction pointer
const JEQ   = nextOpcode++; // Jump if equal
const JNE   = nextOpcode++; // Jump if not equal
const JGT   = nextOpcode++; // Jump if greater than equal
const JLT   = nextOpcode++; // Jump if less than equal
const JGE   = nextOpcode++; // Jump if greater than or equal
const JLE   = nextOpcode++; // Jump if less than or equal

// Storing
const MSM   = nextOpcode++; // Move stack to memory
const SMV   = nextOpcode++; // Move value at top of stack to (fp - offset)


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
  JZ,
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
