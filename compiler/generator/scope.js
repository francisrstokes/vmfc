class Scope {
  constructor(args = []) {
    this.vars = {};
    this.address = 0;
    args.forEach(arg => {
      this.addVariable(arg.value, 'ARGUMENT')
    });
  }

  addVariable(name, type, size = 2) {
    // Make sure it's 16-bit aligned
    const trueSize = size + (size % 2);

    const address = this.nextAddress();
    this.vars[name] = {
      type,
      size: trueSize,
      addressValue: address,
      hexAddress: `0x${address.toString(16)}`
    };
    this.vars[name].hexAddress = `0x${this.vars[name].addressValue.toString(16)}`;

    // For arrays, increase the address pointer
    this.address += trueSize - 2;
  }


  contains(name) {
    return name in this.vars;
  }

  nextAddress() {
    this.address += 2;
    return this.address;
  }

  getHexAddress(variable) {
    return this.vars[variable].hexAddress;
  }

  fork() {
    const forkedScope = new Scope();
    forkedScope.address = this.address;
    forkedScope.vars = { ...this.vars };
    return forkedScope;
  }
}

module.exports = Scope;
