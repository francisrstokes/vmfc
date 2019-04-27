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

module.exports = {
  validateMagicNumber,
  getHeaderInformation,
};
