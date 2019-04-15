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

const DBG   = 0xFE; // Debug will force a breakpoint in debug mode

class StackMachine {
  constructor(stackSize, programSize) {
    this.stack = new ArrayBuffer(stackSize);
    this.programSpace = new ArrayBuffer(programSize);

    this.stackView = new DataView(this.stack);
    this.programView = new DataView(this.programSpace);

    this.ip = 0; // Instruction Pointer
    this.sp = 0; // Stack Pointer
    this.fp = 0; // Stack Frame Pointer
    this.fs = 0; // Stack Frame Size
  }

  load(program) {
    for (let i = 0; i < program.length; i++) {
      this.programView.setUint16(i * 2, program[i]);
    }
  }

  fetch() {
    return this.programView.getUint16(2 * this.ip++);
  }

  run() {
    while(!this.step()) {}
  }

  debugStack() {
    const low = Math.max(0, this.sp - 10);
    const high = Math.min(this.stack.byteLength, this.sp + 10);

    // console.log(`SP:\t${this.sp}`);
    Array.from({length: high - low}, (_, i) => {
      const cur = low + i;
      const ptr = this.sp === cur
        ? '\t< - SP'
        : this.fp === cur
          ? '\t< - FP'
          : '';

      console.log(`${cur}:\t${this.readU16(cur * 2)}${ptr}`);
    });
    console.log('');
  }

  readU16(address) {
    return this.stackView.getUint16(address * 2);
  }

  writeU16(address, value) {
    return this.stackView.setUint16(address * 2, value);
  }

  pop() {
    const value = this.readU16(this.sp--);
    this.fs--;
    return value;
  }

  push(value) {
    this.writeU16(++this.sp, value);
    this.fs++;
  }

  step() {
    const opcode = this.fetch();
    switch (opcode) {
      case DBG: {
        this.debugStack();
        debugger;
        break;
      }
      case PUSH: {
        this.push(this.fetch());
        break;
      }
      case PIP: {
        this.push(this.ip);
        break;
      }
      case PSP: {
        this.push(this.sp);
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
      case CALL: {
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
      case RET: {
        const returnValue = this.readU16(this.sp);
        const returnAddress = this.readU16(this.fp);
        const frameSize = this.readU16(this.fp - 1);

        this.sp = this.fp - 2;
        this.fp = this.so - frameSize;
        this.fs = frameSize;
        this.ip = returnAddress;

        this.push(returnValue);
        break;
      }
      case ADD: {
        const a = this.pop();
        const b = this.pop();
        this.push(a + b);
        break;
      }
      case SUB: {
        const a = this.pop();
        const b = this.pop();
        tthis.push(a - b);
        break;
      }
      case MUL: {
        const a = this.pop();
        const b = this.pop();
        tthis.push(a * b);
        break;
      }
      case LSF: {
        const s = this.pop();
        const v = this.pop();
        this.push(v << s);
        break;
      }
      case RSF: {
        const s = this.pop();
        const v = this.pop();
        this.push(v >> s);
        break;
      }
      case INC: {
        this.writeU16(this.sp, this.readU16(this.sp) + 1);
        break;
      }
      case DEC: {
        this.writeU16(this.sp, this.readU16(this.sp) - 1);
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
        const jmpAddress = this.readU16(this.sp--);
        const checkValue = this.readU16(this.sp);
        if (checkValue !== 0) {
          this.ip = jmpAddress;
        }
        break;
      }
      case HALT: {
        console.log(this.readU16(this.sp));
        return true;
      }
    }
  }
}

const STACK_SIZE = 0xFFFF;
const PROGRAM_SIZE = 0xFFFF;
const machine = new StackMachine(STACK_SIZE, PROGRAM_SIZE);


const program = new Uint16Array([
  // Variables for this stack frame
  /* 1 */ PUSH, 0x01,
  /* 3 */ PUSH, 0x02,
  /* 5 */ PUSH, 0x03,
  /* 7 */ PUSH, 0x04,
  /* 9 */ PUSH, 0x05,
  /* 10 */ DBG,

  // Now make a call using calling convention
  /* 12 */ PUSH, 0x6, // Arg 1
  /* 14 */ PUSH, 0x7, // Arg 2
  /* 16 */ PUSH, 0x2, // Number of args
  /* 18 */ PUSH, 0x16, // Address
  /* 19 */ DBG,
  /* 20 */ CALL,

  /* 21 */ HALT,

  /* 22 */ ADD,
  /* 24 */ PUSH, 0x1,
  /* 25 */ ADD,
  /* 26 */ DBG,
  /* 27 */ RET,
]);

machine.load(program);

machine.run();

debugger;
