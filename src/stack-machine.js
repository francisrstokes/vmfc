const instructions = require('./instructions');

const validateMagicNumber = view => {
  console.log(`Magic Number: 0x${view.getUint32(0).toString(16)}`)
  return view.getUint32(0) === 0x564d4643;
}

const getHeaderInformation = view => {
  const sections = [];
  let offset = 4;
  while (true) {
    // Check for "ENDS"
    if (view.getUint32(offset) === 0x454e4453) {
      offset += 4;
      break;
    }

    sections.push({
      ptr: view.getUint16(offset, true),
      offset: view.getUint16(offset + 2, true),
      length: view.getUint16(offset + 4, true),
    })

    offset += 6;
  }

  const codePtr = view.getUint16(offset, true);
  const codeLength = view.getUint16(offset + 2, true);

  return {
    codePtr,
    codeLength,
    sections
  };
}

const debugArrayBufferView = (view, limit, start = 0) => {
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

const MEMORY_SIZE = 0xFFFF;
class StackMachine {
  constructor() {
    this.memory = new ArrayBuffer(MEMORY_SIZE);
    this.memoryView = new DataView(this.memory);

    this.ip = 0; // Instruction Pointer
    this.sp = 0xFFFD; // Stack Pointer
    this.fp = 0xFFFD; // Stack Frame Pointer
    this.fs = 0; // Stack Frame Size

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
    const view = new DataView(program);

    if (!validateMagicNumber(view)) {
      throw new Error('Invalid VMFC Binary');
    }

    const headerInfo = getHeaderInformation(view);

    headerInfo.sections.forEach(section => {
      if (section.length === 0) return;
      const baseMemoryAddress = section.offset;
      for (let i = 0; i < section.length; i += 2) {
        const value = view.getUint16(section.ptr + i, true);
        this.memoryView.setUint16(baseMemoryAddress + i, value);
      }
    });

    const lastSection = headerInfo.sections[headerInfo.sections.length-1];
    const baseCodeAddress = lastSection
      ? lastSection.offset + lastSection.length
      : 0;

    for (let i = 0; i < headerInfo.codeLength; i += 1) {
      const value = view.getUint8(headerInfo.codePtr + i, true);
      this.memoryView.setUint8(baseCodeAddress + i, value);
    }

    this.ip = baseCodeAddress;
    this.entryPoint = this.ip;

    // Set up stack
    this.fp -= 2;
    this.sp -= 2;

    this.debugStack();
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
    const opcode = this.fetch8();

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
        const address = this.pop();
        this.push(this.readU16(address));
        break;
      }
      case instructions.PMF: {
        const address = this.pop();
        const offset = this.pop();
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
        const address = this.pop();
        const value = this.readU16(this.sp);
        this.writeU16(address, value);
        break;
      }

      case instructions.CPS: {
        const offset = this.fetch16();
        this.push(this.readU16(this.fp - offset));
        break;
      }

      case instructions.SMV: {
        const offset = this.fetch16();
        const value = this.pop();
        this.writeU16(this.fp - offset, value);
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
        |===============|
        | return addr   | < FP
        | frame size    |
        |===============|
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
          args.unshift(this.pop());
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

        this.sp = this.fp + 4;
        this.fp = this.sp + frameSize;
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
        this.push(a - b);
        break;
      }
      case instructions.MUL: {
        const a = this.pop();
        const b = this.pop();
        this.push(a * b);
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

      case instructions.AND: {
        const a = this.pop();
        const b = this.pop();
        this.push(a & b);
        break;
      }

      case instructions.OR: {
        const a = this.pop();
        const b = this.pop();
        this.push(a | b);
        break;
      }

      case instructions.XOR: {
        const a = this.pop();
        const b = this.pop();
        this.push(a ^ b);
        break;
      }

      case instructions.NOT: {
        const a = this.pop();
        this.push(~a);
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
      case instructions.JMP: {
        this.ip = this.pop();
        break;
      }
      case instructions.JNZ: {
        const jmpAddress = this.pop();
        const checkValue = this.pop();
        if (checkValue !== 0) {
          this.ip = jmpAddress;
        }
        break;
      }
      case instructions.JEQ: {
        const jmpAddress = this.pop();
        const comparisonValue = this.pop();
        const checkValue = this.pop();

        if (checkValue === comparisonValue) {
          this.ip = jmpAddress;
        }
        break;
      }
      case instructions.JNE: {
        const jmpAddress = this.pop();
        const comparisonValue = this.pop();
        const checkValue = this.pop();

        if (checkValue !== comparisonValue) {
          this.ip = jmpAddress;
        }
        break;
      }
      case instructions.JGT: {
        const jmpAddress = this.pop();
        const comparisonValue = this.pop();
        const checkValue = this.pop();

        if (checkValue > comparisonValue) {
          this.ip = jmpAddress;
        }
        break;
      }
      case instructions.JLT: {
        const jmpAddress = this.pop();
        const comparisonValue = this.pop();
        const checkValue = this.pop();

        if (checkValue < comparisonValue) {
          this.ip = jmpAddress;
        }
        break;
      }
      case instructions.JGE: {
        const jmpAddress = this.pop();
        const comparisonValue = this.pop();
        const checkValue = this.pop();

        if (checkValue >= comparisonValue) {
          this.ip = jmpAddress;
        }
        break;
      }
      case instructions.JLE: {
        const jmpAddress = this.pop();
        const comparisonValue = this.pop();
        const checkValue = this.pop();

        if (checkValue <= comparisonValue) {
          this.ip = jmpAddress;
        }
        break;
      }
      case instructions.HALT: {
        // debugArrayBufferView(this.memoryView, 8*10, this.sp - 8 * 10)
        this.debugStack();
        console.log(this.readU16(this.sp));
        return true;
      }
    }
  }
}

module.exports = StackMachine;
