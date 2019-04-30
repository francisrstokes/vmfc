const instructions = require('./instructions');
const {
  validateMagicNumber,
  getHeaderInformation,
} = require('./util');

// Instruction table, mapping opcodes to functions that execute the instructions
// Every instruction, when called, is called with the 'this' context of the stack machine
// Instruction table can be extended or modified by sub classes of StackMachine to augment
// behaviour
const instructionTable = {
    [instructions.NOP]: function () {
      return false;
    },

    [instructions.DBG]: function () {
      this.debugStack();
      debugger;
      return false;
    },

    [instructions.PUSH]: function () {
      this.push(this.fetch16());
      return false;
    },

    [instructions.PMS]: function () {
      const address = this.pop();
      this.push(this.readU16(address));
      return false;
    },

    [instructions.PMF]: function () {
      const address = this.pop();
      const offset = this.pop();
      const value = this.readU16(address);
      this.writeU16(this.fp + offset, value);
      return false;
    },

    [instructions.PIP]: function () {
      this.push(this.ip);
      return false;
    },

    [instructions.PSP]: function () {
      this.push(this.sp);
      return false;
    },

    [instructions.MSM]: function () {
      const address = this.pop();
      const value = this.readU16(this.sp);
      this.writeU16(address, value);
      return false;
    },

    [instructions.CPS]: function () {
      const offset = this.fetch16();
      this.push(this.readU16(this.fp - offset));
      return false;
    },

    [instructions.SMV]: function () {
      const offset = this.fetch16();
      const value = this.pop();
      this.writeU16(this.fp - offset, value);
      return false;
    },


    /*
      Stack before:
      -------------

      | fn addr       | < SP
      | n args        |
      | arg n         |
      | arg n-1       |
      | ...           |
      | arg 0         |
      | stack value 1 |
      | stack value 2 | < FP (bottom of stack)
      |---------------|

      Stack after:
      ------------

      | arg n         | < SP
      | arg n-1       |
      | ...           |
      | arg 0         |
      |===============|
      | return addr   | < FP
      | frame size    |
      |===============|
      | stack value 1 |
      | stack value 2 |
      |---------------| (bottom of stack)
    */
    [instructions.CALL]: function () {
      const returnAddress = this.ip;
      const jmpAddress = this.pop();
      const nArgs = this.pop();
      let args = [];
      for (let i = 0; i < nArgs; i++) {
        args.unshift(this.pop());
      }

      this.push(this.fs);
      this.push(returnAddress);
      this.fp = this.sp;
      this.fs = 0;

      args.forEach(arg => this.push(arg));
      this.ip = jmpAddress;
      return false;
    },

    [instructions.RET]: function () {
      const returnValue = this.readU16(this.sp);
      const returnAddress = this.readU16(this.fp);
      const frameSize = this.readU16(this.fp + 2);

      this.sp = this.fp + 4;
      this.fp = this.sp + frameSize;
      this.fs = frameSize;
      this.ip = returnAddress;

      this.push(returnValue);
      return false;
    },

    [instructions.ADD]: function () {
      const a = this.pop();
      const b = this.pop();
      this.push(a + b);
      return false;
    },

    [instructions.SUB]: function () {
      const a = this.pop();
      const b = this.pop();
      this.push(a - b);
      return false;
    },

    [instructions.MUL]: function () {
      const a = this.pop();
      const b = this.pop();
      this.push(a * b);
      return false;
    },

    [instructions.LSF]: function () {
      const s = this.pop();
      const v = this.pop();
      this.push(v << s);
      return false;
    },

    [instructions.RSF]: function () {
      const s = this.pop();
      const v = this.pop();
      this.push(v >> s);
      return false;
    },

    [instructions.AND]: function () {
      const a = this.pop();
      const b = this.pop();
      this.push(a & b);
      return false;
    },

    [instructions.OR]: function () {
      const a = this.pop();
      const b = this.pop();
      this.push(a | b);
      return false;
    },

    [instructions.XOR]: function () {
      const a = this.pop();
      const b = this.pop();
      this.push(a ^ b);
      return false;
    },

    [instructions.NOT]: function () {
      const a = this.pop();
      this.push(~a);
      return false;
    },

    [instructions.INC]: function () {
      this.writeU16(this.sp, this.readU16(this.sp) + 1);
      return false;
    },

    [instructions.DEC]: function () {
      this.writeU16(this.sp, this.readU16(this.sp) - 1);
      return false;
    },

    [instructions.ISP]: function () {
      this.sp += 2;
      return false;
    },

    [instructions.DSP]: function () {
      this.sp -= 2;
      return false;
    },

    [instructions.IIP]: function () {
      this.ip += 2;
      return false;
    },

    [instructions.DIP]: function () {
      this.ip -= 2;
      return false;
    },

    [instructions.JMP]: function () {
      this.ip = this.pop();
      return false;
    },

    [instructions.JNZ]: function () {
      const jmpAddress = this.pop();
      const checkValue = this.pop();
      if (checkValue !== 0) {
        this.ip = jmpAddress;
      }
      return false;
    },

    [instructions.JZ]: function () {
      const jmpAddress = this.pop();
      const checkValue = this.pop();
      if (checkValue === 0) {
        this.ip = jmpAddress;
      }
      return false;
    },

    [instructions.JEQ]: function () {
      const jmpAddress = this.pop();
      const comparisonValue = this.pop();
      const checkValue = this.pop();

      if (checkValue === comparisonValue) {
        this.ip = jmpAddress;
      }
      return false;
    },

    [instructions.JNE]: function () {
      const jmpAddress = this.pop();
      const comparisonValue = this.pop();
      const checkValue = this.pop();

      if (checkValue !== comparisonValue) {
        this.ip = jmpAddress;
      }
      return false;
    },

    [instructions.JGT]: function () {
      const jmpAddress = this.pop();
      const comparisonValue = this.pop();
      const checkValue = this.pop();

      if (checkValue > comparisonValue) {
        this.ip = jmpAddress;
      }
      return false;
    },

    [instructions.JLT]: function () {
      const jmpAddress = this.pop();
      const comparisonValue = this.pop();
      const checkValue = this.pop();

      if (checkValue < comparisonValue) {
        this.ip = jmpAddress;
      }
      return false;
    },

    [instructions.JGE]: function () {
      const jmpAddress = this.pop();
      const comparisonValue = this.pop();
      const checkValue = this.pop();

      if (checkValue >= comparisonValue) {
        this.ip = jmpAddress;
      }
      return false;
    },

    [instructions.JLE]: function () {
      const jmpAddress = this.pop();
      const comparisonValue = this.pop();
      const checkValue = this.pop();

      if (checkValue <= comparisonValue) {
        this.ip = jmpAddress;
      }
      return false;
    },

    [instructions.HALT]: function () {
      this.debugStack();
      console.log(this.readU16(this.sp));
      return true;
    }
}

// Current memory size is limited to 0xFFFF, though I have plans to implement memory banking,
// which would allow for arbitrarily large address spaces
const MEMORY_SIZE = 0xFFFF;
class StackMachine {
  constructor() {
    this.instructionTable = {...instructionTable};

    this.memory = new ArrayBuffer(MEMORY_SIZE);
    this.memoryView = new DataView(this.memory);

    this.ip = 0;      // Instruction Pointer
    this.sp = 0xFFFD; // Stack Pointer
    this.fp = 0xFFFD; // Stack Frame Pointer
    this.fs = 0;      // Stack Frame Size

    // Entry point is overridden when loading a program
    this.entryPoint = 0;
  }

  debugArrayBufferView(view, limit, start = 0) {
    const padZero = (n, zeros = 2) => ("0".repeat(zeros) + n.toString(16)).slice(-zeros);
    let line = '          00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F\n';
    line    += '-------|-------------------------------------------------\n'
    let offset = start;
    while (offset < start + limit) {
      if ((offset - start) % 16 === 0) {
        line += `${offset > 0 ? '\n' : ''}0x${padZero(offset, 4)} |  `;
      }
      line += padZero(view.getUint8(offset)) + ' ';
      offset++;
    }
    console.log(line)
  }

  load(program) {
    // Program should be an ArrayBuffer. Create a view to read contents
    const view = new DataView(program);

    // All binarys must begin with ASCII "VMFC"
    if (!validateMagicNumber(view)) {
      throw new Error('Invalid VMFC Binary');
    }

    // Read the binary header
    const headerInfo = getHeaderInformation(view);

    // Header containers arbitrarily many data sections
    // Sections define:
    //  a pointer to the data in the binary
    //  an offset address that the data should be placed in memory
    //  the length of the section
    headerInfo.sections.forEach(section => {
      if (section.length === 0) return;
      const baseMemoryAddress = section.offset;

      // Copy the data into main memory
      for (let i = 0; i < section.length; i += 2) {
        const value = view.getUint16(section.ptr + i, true);
        this.memoryView.setUint16(baseMemoryAddress + i, value);
      }
    });

    // Code should be placed immediately after the last section
    // If no sections are defined, the code will begin at address 0x0000
    const lastSection = headerInfo.sections[headerInfo.sections.length-1];
    const baseCodeAddress = lastSection
      ? lastSection.offset + lastSection.length
      : 0;

    // Copy the code into main memory
    for (let i = 0; i < headerInfo.codeLength; i += 1) {
      const value = view.getUint8(headerInfo.codePtr + i, true);
      this.memoryView.setUint8(baseCodeAddress + i, value);
    }

    // Set the instruction pointer
    this.ip = baseCodeAddress;
    this.entryPoint = this.ip;

    // Set up first stack frame
    this.fp -= 2;
    this.sp -= 2;
  }

  // fetch16 is primarily used to fetch arguments to push-based instructions
  fetch16() {
    const value = this.memoryView.getUint16(this.ip);
    this.ip += 2;
    return value;
  }

  // fetch8 is used to fetch the next opcode
  fetch8() {
    const value = this.memoryView.getUint8(this.ip);
    this.ip += 1;
    return value;
  }

  // Run the program until it halts
  run() {
    while(!this.step()) {}
  }

  // Prints the values around the stack to the console
  debugStack() {
    console.log('\n');
    const low = Math.max(0, this.sp - 10);
    const high = Math.min(this.memory.byteLength - 2, this.sp + 10);

    for (let addr = low; addr <= high; addr += 2) {
      const cur = addr;
      const ptr = this.sp === cur
        ? '\t< - SP'
        : this.fp === cur
          ? '\t< - FP'
          : '';

      console.log(`0x${cur.toString(16)}:\t${this.readU16(cur)}${ptr}`);
    }
    console.log('------------------------------');
  }

  // Reads a unsigned 16 bit value from memory
  readU16(address) {
    return this.memoryView.getUint16(address);
  }

  // Writes a unsigned 16 bit value to memory
  writeU16(address, value) {
    return this.memoryView.setUint16(address, value);
  }

  // Pop the last value on the stack
  pop() {
    const value = this.readU16(this.sp);
    // Increase the stack pointer, because stack starts at the bottom of memory and grows upwards
    this.sp += 2;
    this.fs -= 2;
    return value;
  }

  // Push a value to the stack
  push(value) {
    // Decrease the stack pointer, because stack starts at the bottom of memory and grows upwards
    this.sp -= 2;
    this.writeU16(this.sp, value);
    this.fs += 2;
  }

  step() {
    // Fetch the next instruction
    const opcode = this.fetch8();

    try {
      // Call the handler in the instruction table
      return this.instructionTable[opcode].call(this);
    } catch (ex) {
      throw new Error(`Opcode not implemented: 0x${opcode.toString(16)}`)
    }
  }
}

module.exports = StackMachine;
