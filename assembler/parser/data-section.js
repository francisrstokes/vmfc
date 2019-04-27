const {
  str,
  char,
  sequenceOf,
  whitespace,
  possibly,
  many,
  many1,
  choice,
  namedSequenceOf,
  sepBy,
  everythingUntil,
  letters,
  Parser
} = require('arcsecond');
const {
  sequencedNamed,
  newline,
  Whitespace,
  hex16,
  doParser,
  comment,
  whitespaceSurrounded
} = require('./common');

const dataLineSpecific = doParser(function* () {
  const type = yield letters;
  yield whitespace;

  let data;
  switch (type) {
    case 'bytes': {
      data = yield sepBy (whitespaceSurrounded(char(','))) (hex16);
      break;
    }
    case 'words': {
      data = yield sepBy (whitespaceSurrounded(char(','))) (hex16);
      break;
    }
    case 'ascii': {
      data = yield everythingUntil(newline);
      break;
    }
    case 'buffer': {
      data = yield hex16;
      break;
    }
  }
  return Parser.of({type, data});
});

const dataLine = namedSequenceOf([
  ['_', whitespace],
  ['name', letters],
  ['_', Whitespace],
  ['data', dataLineSpecific],
  ['_', newline]
]).map(({name, data: {type, data}}) => ({name, type, data}))

const sectionParser = sequencedNamed([
  whitespace,
  many(choice([ comment, newline ])),
  str('.section'),
  Whitespace,
  ['sectionName', letters],
  Whitespace,
  ['binaryAddress', hex16],
  sequenceOf([ possibly(Whitespace), many1(newline) ]),
  ['dataLines', many(choice([
    dataLine,
    comment
  ]))]
]).map(({sectionName, binaryAddress, dataLines}) => ({
  type: 'section',
  sectionName,
  binaryAddress,
  section: dataLines
}));

module.exports = sectionParser;

