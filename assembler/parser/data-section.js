const {
  str,
  sequenceOf,
  whitespace,
  possibly,
  many,
  many1,
  choice,
  sepBy,
  everythingUntil,
  letters,
  Parser,
  regex,
} = require('arcsecond');
const {
  sequencedNamed,
  newline,
  Whitespace,
  hex16,
  doParser,
  comment,
} = require('./common');

const whitespacedComma = regex(/^[ \t]*,[ \t]*/);

const dataLineSpecific = doParser(function* () {
  const type = yield letters;
  yield whitespace;

  let data;
  switch (type) {
    case 'bytes': {
      data = yield sepBy (whitespacedComma) (hex16);
      break;
    }
    case 'words': {
      data = yield sepBy (whitespacedComma) (hex16);
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

const dataLine = doParser(function* () {
  yield regex(/^[ \t]*/);
  const name = yield  letters;
  yield Whitespace;
  const {type, data} = yield dataLineSpecific;
  yield regex(/^[ \r\t\n]+/);

  return Parser.of({name, type, data});
});


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

