const instructions = require('./instructions');

const {
  Struct,
  RawString,
  U16,
  U16s,
} = require('construct-js');

/*
--- Bin Structure ---
HEADER:
  Magic header
  ROData Ptr
  ROData Length
  Data Ptr
  Data Length
  Code Ptr
  Code Length
RODATA:
  Raw Data
DATA:
  Raw Data
CODE:
  Raw Code
*/

const fillDataSection = (section, struct) => {
  section.forEach(entry => {
    if (entry.type === 'bytes') {
      const bytes = entry.data.map(s => parseInt(s, 16));
      struct.field(entry.name, U16s(bytes));
    } else if (entry.type === 'ascii') {
      const bytes = entry.data.split('').map(s => s.charCodeAt(0));
      struct.field(entry.name, U16s(bytes));
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
      const instructionStruct = Struct(element.kind)
          .field('opcode', U16(instructions[element.kind].opcode));

      // Push is a special case
      if (element.kind === 'push') {
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
    rodata: { section: rodataSection },
    data: { section: dataSection },
    code: { section: codeSection },
  } = ast;

  const header = Struct('VMFCHeader', false)
    .field('magic', RawString('VMFC'))
    .field('rodataPtr', U16(0))
    .field('rodataLength', U16(0))
    .field('dataPtr', U16(0))
    .field('dataLength', U16(0))
    .field('codePtr', U16(0))
    .field('codeLength', U16(0));

  const data = Struct('VMFCData');
  fillDataSection(dataSection, data);

  const rodata = Struct('VMFCROData');
  fillDataSection(rodataSection, rodata);

  header.get('rodataLength').set(rodata.computeBufferSize())
  header.get('dataLength').set(data.computeBufferSize())

  const code = Struct('VMFCCode');
  fillCodeSection(codeSection, code);

  const binBody = Struct('BinaryBody')
    .field('rodata', rodata)
    .field('data', data)
    .field('code', code);

  const resolveLabelAddress = label => binBody.getDeepOffset(`code.${label}`);
  const resolveDataAddress = name => {
    const segment = data.find(item => item.name === name)
      ? 'data'
      : 'rodata';
    return binBody.getDeepOffset(`${segment}.${name}`);
  };

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
    if (element.type === 'instruction') {
      if (element.kind === 'push') {
        element.struct.get('argument').set(resolveArgument(element.argument));
      }
    }
  });

  const finalExecutable = Struct('VMFCExecutable')
    .field('header', header)
    .field('body', binBody);

  header.get('rodataPtr').set(finalExecutable.getDeepOffset('body.rodata'));
  header.get('dataPtr').set(finalExecutable.getDeepOffset('body.data'));
  header.get('codePtr').set(finalExecutable.getDeepOffset('body.code'));
  header.get('codeLength').set(finalExecutable.getDeep('body.code').computeBufferSize());

  return finalExecutable.toBuffer();
}


module.exports = generator;