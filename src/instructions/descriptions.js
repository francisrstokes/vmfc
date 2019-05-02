let nextOpcode = 1;

const descriptions = [
  // push instructions
  {
    // Push a value to the stack
    opcode: nextOpcode++,
    argument: true,
    instruction: "PUSH"
  },
  {
    // Push the instruction pointer to the stack
    opcode: nextOpcode++,
    argument: false,
    instruction: "PIP"
  },
  {
    // Push the stack pointer to the stack
    opcode: nextOpcode++,
    argument: false,
    instruction: "PSP"
  },
  {
    // Push memory to stack
    opcode: nextOpcode++,
    argument: false,
    instruction: "PMS"
  },
  {
    // Push memory to fp + offset
    opcode: nextOpcode++,
    argument: true,
    instruction: "PMF"
  },
  {
    // Push value from (fp - offset) to top of stack
    opcode: nextOpcode++,
    argument: true,
    instruction: "CPS"
  },

  // Arithmetic
  {
    // Add the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
    opcode: nextOpcode++,
    argument: false,
    instruction: "ADD"
  },
  {
    // Add one to the value at sp
    opcode: nextOpcode++,
    argument: false,
    instruction: "INC"
  },
  {
    // Subtract one from the value at sp
    opcode: nextOpcode++,
    argument: false,
    instruction: "DEC"
  },
  {
    // Multiply the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
    opcode: nextOpcode++,
    argument: false,
    instruction: "MUL"
  },
  {
    // Subtract the last two value of the stack, sp and (sp - 1), and write the result to (sp - 1)
    opcode: nextOpcode++,
    argument: false,
    instruction: "SUB"
  },
  {
    // Pop a shift amount S, and the value V, and write the result of V << S
    opcode: nextOpcode++,
    argument: false,
    instruction: "LSF"
  },
  {
    // Pop a shift amount S, and the value V, and write the result of V >> S
    opcode: nextOpcode++,
    argument: false,
    instruction: "RSF"
  },
  {
    // Logical and
    opcode: nextOpcode++,
    argument: false,
    instruction: "AND"
  },
  {
    // Logical or
    opcode: nextOpcode++,
    argument: false,
    instruction: "OR"
  },
  {
    // Logical xor
    opcode: nextOpcode++,
    argument: false,
    instruction: "XOR"
  },
  {
    // Logical not
    opcode: nextOpcode++,
    argument: false,
    instruction: "NOT"
  },

  // Calling/returnin,
  {
    // Call a function, pushing the current ip to the stack
    opcode: nextOpcode++,
    argument: false,
    instruction: "CALL"
  },
  {
    // Return from a function by swapping the value at sp and (sp - 1) and jumping to the address that was in (sp - 1)
    opcode: nextOpcode++,
    argument: false,
    instruction: "RET"
  },

  // Modifying internal state
  {
    // Increment stack pointer
    opcode: nextOpcode++,
    argument: false,
    instruction: "ISP"
  },
  {
    // Decrement stack pointer
    opcode: nextOpcode++,
    argument: false,
    instruction: "DSP"
  },
  {
    // Increment instruction pointer
    opcode: nextOpcode++,
    argument: false,
    instruction: "IIP"
  },
  {
    // Decrement instruction pointer
    opcode: nextOpcode++,
    argument: false,
    instruction: "DIP"
  },
  {
    // Set the stack pointer
    opcode: nextOpcode++,
    argument: false,
    instruction: "SSP"
  },
  {
    // Halt the program and write the result to the screen
    opcode: nextOpcode++,
    argument: false,
    instruction: "HALT"
  },
  {
    // Debug will force a breakpoint in debug mode
    opcode: nextOpcode++,
    argument: false,
    instruction: "DBG"
  },
  {
    // Noop
    opcode: nextOpcode++,
    argument: false,
    instruction: "NOP"
  },

  // Branching
  {
    // Jump if not zero
    opcode: nextOpcode++,
    argument: false,
    instruction: "JNZ"
  },
  {
    // Jump if zero
    opcode: nextOpcode++,
    argument: false,
    instruction: "JZ"
  },
  {
    // Set the instruction pointer
    opcode: nextOpcode++,
    argument: false,
    instruction: "JMP"
  },
  {
    // Jump if equal
    opcode: nextOpcode++,
    argument: false,
    instruction: "JEQ"
  },
  {
    // Jump if not equal
    opcode: nextOpcode++,
    argument: false,
    instruction: "JNE"
  },
  {
    // Jump if greater than equal
    opcode: nextOpcode++,
    argument: false,
    instruction: "JGT"
  },
  {
    // Jump if less than equal
    opcode: nextOpcode++,
    argument: false,
    instruction: "JLT"
  },
  {
    // Jump if greater than or equal
    opcode: nextOpcode++,
    argument: false,
    instruction: "JGE"
  },
  {
    // Jump if less than or equal
    opcode: nextOpcode++,
    argument: false,
    instruction: "JLE"
  },

  // Storin,
  {
    // Move stack to memory
    opcode: nextOpcode++,
    argument: false,
    instruction: "MSM"
  },
  {
    // Move value at top of stack to (fp - offset)
    opcode: nextOpcode++,
    argument: true,
    instruction: "SMV"
  },
  {
    // Copy Offset Stack - Like CPS, but offset is based on the value at the top of the stack
    opcode: nextOpcode++,
    argument: false,
    instruction: "CPOS"
  }
];

module.exports = descriptions;
