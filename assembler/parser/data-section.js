const {
  str,
  char,
  sequenceOf,
  whitespace,
  possibly,
  many,
  namedSequenceOf,
  sepBy,
  everythingUntil,
  letters,
  Parser
} = require('arcsecond');
const {
  newline,
  Whitespace,
  hex16,
  doParser
} = require('./common');

const dataLineSpecific = doParser(function* () {
  const type = yield letters;
  yield whitespace;

  let data;
  switch (type) {
    case 'bytes': {
      data = yield sepBy (char(',')) (hex16);
      break;
    }
    case 'ascii': {
      data = yield everythingUntil(newline);
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

module.exports = sequenceOf([
  whitespace,
  str('.data'),
  sequenceOf([ possibly(Whitespace), newline ]),
  many(dataLine)
]).map(parsed => ({
  type: 'data-section',
  section: parsed[3]
}));
