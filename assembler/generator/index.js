const instructions = require('../../src/instructions');

const {
  Struct,
  RawString,
  U8,
  U16,
  U8s,
  U16s,
} = require('construct-js');

const randomId = () => Math.random().toString(16).slice(2);

/*
/////////// Binary Structure //////////

=================
      Header
=================

  Raw String: VMFC
  [
    -------------------
    Section Descriptors
    -------------------
    Pointer to start in binary
    Offset in RAM
    Length
  ]
  Section End Marker
  Code Pointer
  Code Length

=================
    Sections
=================

  Data

=================
 End of Sections
=================

  Raw String: ENDS

=================
      Code
=================

  Instructions

///////////////////////////////////////
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

      // For consistent byte ordering, we pack the bytes together into a single 16 bit
      // number. This has the implication that a string of uneven length will naturally
      // be padded with 0x00 at the end
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

const fillCodeSection = (codeSection, struct) => {
  const entryPointLabel = randomId();
  let currentLabelStruct = Struct(entryPointLabel);
  struct.field(entryPointLabel, currentLabelStruct);

  // Create a struct for every label in the program, which groups the instructions
  // until the next label
  codeSection.forEach(element => {
    if (element.type === 'label') {
      currentLabelStruct = Struct(element.value);
      struct.field(element.value, currentLabelStruct);
    } else {
      const opcode = instructions[element.kind.toUpperCase()];
      const instructionStruct = Struct(element.kind).field('opcode', U8(opcode));

      if (element.argument) {
        // If there is an argument it will be resolved later, but all arguments are 16 bits
        // For consistency of encoding this is represented as 2 8-bit numbers
        instructionStruct.field('argument', U8s([0, 0]));
      }

      // Create a reference to the struct on the AST element so we can resolve the argument later
      element.struct = instructionStruct;
      currentLabelStruct.field(`${element.kind}_${randomId()}`, instructionStruct);
    }
  });
}

const generator = ast => {
  const {
    sections,
    code: { section: codeSection },
  } = ast;


  // Build an array of struct/offsets for the sections
  const sectionsWithStructs = sections.map(({sectionName, binaryAddress, section}) => {
    const struct = Struct(sectionName);
    fillDataSection(section, struct);
    return {
      struct,
      offset: binaryAddress
    };
  }).sort((a, b) => a.offset > b.offset);

  // Create the code section
  const code = Struct('VMFCCode');
  // When the code struct is populated the code section of the AST is annotated
  // with references to the struct so variables can later be resolved
  fillCodeSection(codeSection, code);

  // Create a header struct
  const header = Struct('VMFCHeader').field('magic', RawString('VMFC'));

  // Add section information to the header
  sectionsWithStructs.forEach(({offset, struct}) => {
    const sectionDescriptor = Struct(struct.name)
      .field('pointer', U16(0))
      .field('offset', U16(parseInt(offset, 16)))
      .field('length', U16(struct.computeBufferSize()));

    header.field(`descriptor_${struct.name}`, sectionDescriptor);
  });

  // Finalise the header (pointers of sections and code will be filled in later)
  header.field('sectionEndMarker', RawString('ENDS'))
  header.field('codePtr', U16(0));
  header.field('codeLength', U16(code.computeBufferSize()));

  // Create a struct to hold all the section data
  const sectionsStruct = Struct('AllSections');
  sectionsWithStructs.forEach(({struct}) => sectionsStruct.field(struct.name, struct));

  // Create a struct container the entire binary
  const binBody = Struct('BinaryBody')
    .field('header', header)
    .field('sections', sectionsStruct)
    .field('code', code);

  // Functions to resolve label and data arguments, declared inline because they
  // convieniently close over the local structures
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

  // With the binary structure finalised the AST can be traversed and arguments resolved
  ast.code.section.forEach(element => {
    if (element.type === 'instruction' && element.argument) {
      const arg = resolveArgument(element.argument);

      // Byte swap the high and low parts so they are properly and consistently encoded in the binary
      const low = arg & 0x00FF;
      const high = (arg & 0xFF00) >> 8;
      element.struct.get('argument').set([high, low]);
    }
  });

  // Set the header section pointers
  sections.forEach(({sectionName}) => {
    const headerPath = `descriptor_${sectionName}.pointer`;
    const sectionPath = `sections.${sectionName}`;
    header.getDeep(headerPath).set(binBody.getDeepOffset(sectionPath));
  });

  // Set the code pointer
  header.get('codePtr').set(binBody.getOffset('code'));

  // Return the assembled buffer
  return binBody.toBuffer();
}


module.exports = generator;