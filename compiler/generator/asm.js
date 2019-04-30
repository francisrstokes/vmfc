class ASM {
  constructor() {
    this.code = [];
    this.indentLevel = 0;
  }

  add(line) {
    this.code.push(`${'  '.repeat(this.indentLevel)}${line}`);
  }

  label(name) {
    this.add(`${name}:`);
    this.indent();
  }

  indent() {
    this.indentLevel++;
  }

  unindent() {
    if (this.indentLevel > 0) {
      this.indentLevel--;
    }
  }

  getCode() {
    return this.code.join('\n');
  }
}

module.exports = ASM;
