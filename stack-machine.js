const instructions = require('./instructions');

const MEMORY_SIZE = 0xFFFF;
class StackMachine {
  constructor() {
    this.memory = new ArrayBuffer(MEMORY_SIZE);
    this.memoryView = new DataView(this.memory);

    this.ip = 0; // Instruction Pointer
    this.sp = 0xFFFD; // Stack Pointer
    this.fp = 0xFFFD; // Stack Frame Pointer
    this.fs = 0; // Stack Frame Size
  }

  load(program) {
    for (let i = 0; i < program.length; i++) {
      this.memoryView.setUint16(i * 2, program[i]);
    }
  }

  fetch16() {
    const value = this.memoryView.getUint16(this.ip);
    this.ip += 2;
    return value;
  }

  fetch8() {
    const value = this.memoryView.getUint8(this.ip);
    this.ip += 1;
    return value;
  }

  run() {
    while(!this.step()) {}
  }

  debugStack() {
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

  readU16(address) {
    return this.memoryView.getUint16(address);
  }

  writeU16(address, value) {
    return this.memoryView.setUint16(address, value);
  }

  pop() {
    const value = this.readU16(this.sp);
    this.sp += 2;
    this.fs -= 2;
    return value;
  }

  push(value) {
    this.sp -= 2;
    this.writeU16(this.sp, value);
    this.fs += 2;
  }

  step() {
    const opcode = this.fetch16();

    switch (opcode) {
      case instructions.NOP: {
        break;
      }
      case instructions.DBG: {
        this.debugStack();
        debugger;
        break;
      }
      case instructions.PUSH: {
        this.push(this.fetch16());
        break;
      }
      case instructions.PMS: {
        const address = this.fetch16();
        const value = this.readU16(address);
        this.push(value);
        break;
      }
      case instructions.PMF: {
        const address = this.fetch16();
        const offset = this.fetch16();
        const value = this.readU16(address);
        this.writeU16(this.fp + offset, value);
        break;
      }
      case instructions.PIP: {
        this.push(this.ip);
        break;
      }
      case instructions.PSP: {
        this.push(this.sp);
        break;
      }

      case instructions.MSM: {
        const address = this.fetch16();
        const value = this.readU16(this.sp);
        this.writeU16(address, value);
        break;
      }


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
        |---------------|
        | return addr   | < FP
        | frame size    |
        |---------------|
        | stack value 1 |
        | stack value 2 |
        |---------------| (bottom of stack)
      */
      case instructions.CALL: {
        const returnAddress = this.ip;
        const jmpAddress = this.pop();
        const nArgs = this.pop();
        let args = [];
        for (let i = 0; i < nArgs; i++) {
          args.push(this.pop());
        }

        this.push(this.fs);
        this.push(returnAddress);
        this.fp = this.sp;
        this.fs = 0;

        args.forEach(arg => this.push(arg));
        this.ip = jmpAddress;
        break;
      }

      // . Get return value (last value on the stack)
      // . Get the return address that's pointed to by the frame pointer
      // . Get the frame size below
      // . Set the stack pointer to (fp - 2)
      // . Set the frame pointer (fp - 2 - fs)
      // . Set the frame size to fs
      // . Set ip to return address
      case instructions.RET: {
        const returnValue = this.readU16(this.sp);
        const returnAddress = this.readU16(this.fp);
        const frameSize = this.readU16(this.fp + 2);

        this.sp = this.fp + 2;
        this.fp = this.so + frameSize;
        this.fs = frameSize;
        this.ip = returnAddress;

        this.push(returnValue);
        break;
      }
      case instructions.ADD: {
        const a = this.pop();
        const b = this.pop();
        this.push(a + b);
        break;
      }
      case instructions.SUB: {
        const a = this.pop();
        const b = this.pop();
        tthis.push(a - b);
        break;
      }
      case instructions.MUL: {
        const a = this.pop();
        const b = this.pop();
        tthis.push(a * b);
        break;
      }
      case instructions.LSF: {
        const s = this.pop();
        const v = this.pop();
        this.push(v << s);
        break;
      }
      case instructions.RSF: {
        const s = this.pop();
        const v = this.pop();
        this.push(v >> s);
        break;
      }
      case instructions.INC: {
        this.writeU16(this.sp, this.readU16(this.sp) + 1);
        break;
      }
      case instructions.DEC: {
        this.writeU16(this.sp, this.readU16(this.sp) - 1);
        break;
      }
      case instructions.ISP: {
        this.sp += 2;
        break;
      }
      case instructions.DSP: {
        this.sp -= 2;
        break;
      }
      case instructions.IIP: {
        this.ip += 2;
        break;
      }
      case instructions.DIP: {
        this.ip -= 2;
        break;
      }
      case instructions.JNZ: {
        const jmpAddress = this.pop();
        const checkValue = this.readU16(this.sp);
        if (checkValue !== 0) {
          this.ip = jmpAddress;
        }
        break;
      }
      case instructions.HALT: {
        console.log(this.readU16(this.sp));
        return true;
      }
    }
  }
}

module.exports = StackMachine;
