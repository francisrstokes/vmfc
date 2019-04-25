const instructions = require('../../src/instructions');

const {
  Struct,
  RawString,
  U8,
  U16,
  U8s,
  U16s,
} = require('construct-js');

/*
--- Bin Structure ---
HEADER:
  Magic header
  [Section Descriptors]
  Section End Marker
  Code Ptr
  Code Length
SECTION_1:
  Data
SECTION_2:
  Data
...
SECTION_N:
  Data
CODE:
  Raw Code
*/

const fillDataSection = (section, struct) => {
  section.forEach(entry => {
    if (entry.type === 'bytes') {
      const bytes = entry.data.map(s => parseInt(s, 16));
      struct.field(entry.name, U8s(bytes));
    } else if (entry.type === 'words') {
      const bytes = entry.data.map(s => parseInt(s, 16));
      struct.field(entry.name, U16s(bytes));
    } else if (entry.type === 'ascii') {
      const bytes = entry.data.split('').map(s => s.charCodeAt(0));
      if (bytes.length % 2 !== 0) bytes.push(0);
      const data = [];

      for (let i = 0; i < bytes.length; i += 2) {
        const b1 = bytes[i];
        const b2 = bytes[i+1];
        data.push((b1 << 8) | b2);
      }

      struct.field(entry.name, U16s(data));
    } else if (entry.type === 'buffer') {
      const bytes = parseInt(entry.data, 16);
      struct.field(entry.name, U8s(bytes));
    }
  });
};

const fillCodeSection = (codeSection, struct, ast) => {
  let currentLabelStruct = Struct('__GLOBAL_VM_ENTRY');
  struct.field('__GLOBAL_VM_ENTRY', currentLabelStruct);

  codeSection.forEach(element => {
    if (element.type === 'label') {
      currentLabelStruct = Struct(element.value);
      struct.field(element.value, currentLabelStruct);
    } else {
      const opcode = instructions[element.kind.toUpperCase()];
      const instructionStruct = Struct(element.kind).field('opcode', U8(opcode));

      if (element.argument) {
        instructionStruct.field('argument', U16(0));
      }

      element.struct = instructionStruct;

      currentLabelStruct.field(
        `${element.kind}_${Math.random().toString(16).slice(2)}`,
        instructionStruct
      );
    }
  });
}

const generator = ast => {
  const {
    sections,
    code: { section: codeSection },
  } = ast;

  const sectionsWithStructs = sections.map(({sectionName, binaryAddress, section}) => {
    const struct = Struct(sectionName);
    fillDataSection(section, struct);
    return {
      struct,
      offset: binaryAddress
    };
  }).sort((a, b) => a.offset > b.offset);

  const code = Struct('VMFCCode');
  fillCodeSection(codeSection, code);

  const header = Struct('VMFCHeader')
    .field('magic', RawString('VMFC'));

  sectionsWithStructs.forEach(({offset, struct}) => {
    const sectionDescriptor = Struct(struct.name)
      .field('pointer', U16(0))
      .field('offset', U16(parseInt(offset, 16)))
      .field('length', U16(struct.computeBufferSize()));

    header.field(`descriptor_${struct.name}`, sectionDescriptor);
  });

  header.field('sectionEndMarker', RawString('ENDS'))
  header.field('codePtr', U16(0));
  header.field('codeLength', U16(code.computeBufferSize()));

  const sectionsStruct = Struct('AllSections');
  sectionsWithStructs.forEach(({struct}) => {
    sectionsStruct.field(struct.name, struct);
  });

  const binBody = Struct('BinaryBody')
    .field('header', header)
    .field('sections', sectionsStruct)
    .field('code', code);

  const resolveLabelAddress = label => {
    const lastSection = sections[sections.length-1];
    const baseCodeAddress = lastSection
      ? parseInt(lastSection.binaryAddress, 16) + sectionsStruct.get(lastSection.sectionName).computeBufferSize()
      : 0;
    return baseCodeAddress + code.getOffset(label);
  };
  const resolveDataAddress = name => {
    for (const {offset, struct} of sectionsWithStructs) {
      if (struct.fields.find(([fName]) => fName === name)) {
        return parseInt(offset, 16) + struct.getOffset(name);
      }
    }
    throw new Error(`Cannot find ${name} in section data`);
  }
  const resolveArgument = argument => {
    switch (argument.type) {
      case 'literal-value': return parseInt(argument.value, 16);
      case 'label-address-reference': return resolveLabelAddress(argument.value);
      case 'data-address-reference': return resolveDataAddress(argument.value);
      case 'argument-arithmetic': {
        const {arg1, arg2} = argument;
        const arg1Val = resolveArgument(arg1);
        const arg2Val = resolveArgument(arg2);

        return (argument.operator === '+')
          ? arg1Val + arg2Val
          : arg1Val - arg2Val;
      }
    }
  }

  ast.code.section.forEach(element => {
    if (element.type === 'instruction' && element.argument) {
      element.struct.get('argument').set(resolveArgument(element.argument));
    }
  });

  sections.forEach(({sectionName}) => {
    const headerPath = `descriptor_${sectionName}.pointer`;
    const sectionPath = `sections.${sectionName}`;
    header.getDeep(headerPath).set(binBody.getDeepOffset(sectionPath));
  });
  header.get('codePtr').set(binBody.getOffset('code'));

  return binBody.toBuffer();
}


module.exports = generator;