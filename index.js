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
const HALT  = 0xFF; // Halt the program and write the result to the screen

class StackMachine {
  constructor(stackSize, programSize) {
    this.stack = new ArrayBuffer(stackSize);
    this.programSpace = new ArrayBuffer(programSize);

    this.stackView = new DataView(this.stack);
    this.programView = new DataView(this.programSpace);

    this.ip = 0;
    this.sp = 0;
  }

  load(program) {
    program.forEach((u16, i) => this.programView.setInt16(i, u16));
  }

  fetch() {
    return this.programView.getUint16(this.ip++);
  }

  run() {
    while(!this.step()) {}
  }

  debugStack() {
    const low = Math.max(0, this.sp - 5);
    const high = Math.min(this.stack.byteLength, this.sp + 5);

    // console.log(`SP:\t${this.sp}`);
    Array.from({length: high - low}, (_, i) => {
      const cur = low + i;
      const ptr = this.sp === cur ? '\t<' : '';
      console.log(`${cur}:\t${this.stackView.getUint16(cur)}${ptr}`);
    });
    console.log('');
  }

  step() {
    const opcode = this.fetch();
    switch (opcode) {
      case PUSH: {
        const value = this.fetch();
        this.stackView.setUint16(++this.sp, value);
        break;
      }
      case PIP: {
        this.stackView.setUint16(++this.sp, this.ip);
        break;
      }
      case PSP: {
        this.stackView.setUint16(++this.sp, this.sp);
        break;
      }
      case CALL: {
        const returnAddress = this.ip;
        const jmpAddress = this.stackView.getUint16(this.sp);
        const swapValue = this.stackView.getUint16(this.sp - 1);

        this.stackView.setUint16(this.sp - 1, returnAddress);
        this.stackView.setUint16(this.sp, swapValue);
        this.ip = jmpAddress;
        break;
      }
      case RET: {
        const curValue = this.stackView.getUint16(this.sp--);
        this.ip = this.stackView.getUint16(this.sp);
        this.stackView.setUint16(this.sp, curValue);
        break;
      }
      case ADD: {
        const a = this.stackView.getUint16(this.sp--);
        const b = this.stackView.getUint16(this.sp);
        this.stackView.setUint16(this.sp, a + b);
        break;
      }
      case SUB: {
        const a = this.stackView.getUint16(this.sp--);
        const b = this.stackView.getUint16(this.sp);
        this.stackView.setUint16(this.sp, a - b);
        break;
      }
      case MUL: {
        const a = this.stackView.getUint16(this.sp--);
        const b = this.stackView.getUint16(this.sp);
        this.stackView.setUint16(this.sp, a * b);
        break;
      }
      case LSF: {
        const s = this.stackView.getUint16(this.sp--);
        const v = this.stackView.getUint16(this.sp);
        this.stackView.setUint16(this.sp, v << s);
        break;
      }
      case RSF: {
        const s = this.stackView.getUint16(this.sp--);
        const v = this.stackView.getUint16(this.sp);
        this.stackView.setUint16(this.sp, v >> s);
        break;
      }
      case INC: {
        this.stackView.setUint16(this.sp, this.stackView.getUint16(this.sp) + 1);
        break;
      }
      case DEC: {
        this.stackView.setUint16(this.sp, this.stackView.getUint16(this.sp) - 1);
        break;
      }
      case ISP: {
        this.sp++;
        break;
      }
      case DSP: {
        this.sp--;
        break;
      }
      case IIP: {
        this.ip++;
        break;
      }
      case DIP: {
        this.ip--;
        break;
      }
      case JNZ: {
        const jmpAddress = this.stackView.getUint16(this.sp--);
        const checkValue = this.stackView.getUint16(this.sp);
        if (checkValue !== 0) {
          this.ip = jmpAddress;
        }
        break;
      }
      case HALT: {
        console.log(this.stackView.getUint16(this.sp));
        return true;
      }
    }
  }
}

const STACK_SIZE = 1024;
const PROGRAM_SIZE = 1024;
const machine = new StackMachine(STACK_SIZE, PROGRAM_SIZE);

machine.load(new Uint16Array([
  PUSH, 0x05,
  CALL,

  DEC,
  RET,

  PUSH, 0x0F,
  PUSH, 0x03,
  CALL,
  PUSH, 0x07,
  JNZ,
  DEC,
  HALT
]));

machine.run();

debugger;