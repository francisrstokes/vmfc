const validator = ast => {
  const {
    sections,
    code: { section: codeSection }
  } = ast;

  const dataNames = {};
  sections.forEach(({sectionName, section}) => {
    section.forEach(({name}) => {
      if (Object.keys(dataNames).includes(name)) {
        throw new Error(`Duplicate data item '${name}' found in sections '${sectionName}' and '${dataNames[name]}'`);
      }
      dataNames[name] = sectionName
    });
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
  });


  // Assert that no sections overlap
  const sSizes = sections.reduce((acc, {sectionName, section}) => {
    acc[sectionName] = section.reduce((acc, cur) => {
      if(cur.type === 'bytes' || cur.type === 'ascii') return acc + cur.data.length;
      if(cur.type === 'words') return acc + cur.data.length * 2;
      if(cur.type === 'buffer') return acc + parseInt(cur.data, 16);
    }, 0);
    return acc;
  }, {});

  sections.forEach(({binaryAddress, sectionName}, i) => {
    if (i + 1 >= sections.length-1) return;
    const next = sections[i+1];

    if (sSizes[sectionName] + parseInt(binaryAddress, 16) >= parseInt(next.binaryAddress, 16)) {
      throw new Error(`Section ${sectionName} overlaps with section ${next.sectionName}`);
    }
  });

  return true;
}

module.exports = validator;