const validator = ast => {
  const {
    rodata: { section: rodataSection },
    data: { section: dataSection },
    code: { section: codeSection }
  } = ast;

  const dataNames = [];
  dataSection.forEach(element => {
    if (dataNames.includes(element.name)) {
      throw new Error(`Duplicate name '${element.aname}' found in data section`);
    }
    dataNames.push(element.name);
  });

  rodataSection.forEach(element => {
    if (dataNames.includes(element.name)) {
      throw new Error(`Duplicate name '${element.name}' found in rodata section`);
    }
    dataNames.push(element.name);
  });

  const labelNames = [];
  codeSection.forEach(element => {
    if (element.type === 'label') {
      if (labelNames.includes(element.value)) {
        throw new Error(`Duplicate label '${element.value}' found in code section`);
      }
      labelNames.push(element.value);
    }
  });

  codeSection.forEach(element => {
    if (element.type !== 'label' && element.argument && element.argument.type !== 'literal-value') {
      if (element.argument.type !== 'argument-arithmetic') {
        const referenceArray = element.argument.type === 'data-address-reference'
          ? dataNames
          : labelNames;

        if (!referenceArray.includes(element.argument.value)) {
          throw new Error(`Unknown reference ${element.argument.value} (${element.argument.type})`);
        }
      }
    }
  })

  return true;
}

module.exports = validator;