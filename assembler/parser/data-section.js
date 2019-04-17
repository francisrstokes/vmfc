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
  newline,
  Whitespace,
  hex16,
  doParser,
  comment
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

const dataParser = sequenceOf([
  whitespace,
  many(choice([ comment, newline ])),
  str('.data'),
  sequenceOf([ possibly(Whitespace), many1(newline) ]),
  many(choice([
    dataLine,
    comment
  ])).map(matches => matches.filter(match => match.type !== 'comment'))
]).map(parsed => ({
  type: 'data-section',
  section: parsed[4]
}));

const roDataParser = sequenceOf([
  whitespace,
  many(choice([ comment, newline ])),
  str('.rodata'),
  sequenceOf([ possibly(Whitespace), many1(newline) ]),
  many(choice([
    dataLine,
    comment
  ])).map(matches => matches.filter(match => match.type !== 'comment'))
]).map(parsed => ({
  type: 'rodata-section',
  section: parsed[4]
}));

module.exports = {
  dataParser,
  roDataParser
};
