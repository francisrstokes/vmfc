const {
  str,
  char,
  choice,
  sequenceOf,
  whitespace,
  regex,
  possibly,
  many,
  letters,
  Parser,
  takeLeft,
  endOfInput
} = require('arcsecond');
const {
  newlines,
  Whitespace,
  doParser,
  hex16
} = require('./common');


const validLabel = regex(/^[a-zA-Z0-9\-_]+/)

const label = sequenceOf([
  whitespace,
  char(':'),
  validLabel,
  possibly(Whitespace)
]).map(([_, __, name]) => ({ type: 'label', value: name }));

const argument = takeLeft(choice([
  sequenceOf([
    char('['),
    letters,
    char(']')
  ]).map(([_, name]) => ({ type: 'data-address-reference', value: name })),
  sequenceOf([
    char('{'),
    validLabel,
    char('}')
  ]).map(([_, name]) => ({ type: 'label-address-reference', value: name })),
  hex16.map(value => ({ type: 'value', value }))
])) (possibly(Whitespace));

const singleInstruction = instruction =>
  sequenceOf([
    possibly(Whitespace),
    choice([
      str(instruction),
      str(instruction.toUpperCase()),
    ]),
    possibly(Whitespace),
  ]).map(_ => ({
    type: 'instruction',
    kind: instruction,
    argument: null
  }));

const argumentInstruction = instruction =>
  sequenceOf([
    possibly(Whitespace),
    choice([
      str(instruction),
      str(instruction.toUpperCase()),
    ]),
    Whitespace,
    argument
  ]).map(([_, __, ___, argument]) => ({
    type: 'instruction',
    kind: instruction,
    argument
  }));

const codeSectionItem = takeLeft(choice([
  label,
  singleInstruction('add'),
  singleInstruction('pip'),
  singleInstruction('psp'),
  singleInstruction('inc'),
  singleInstruction('dec'),
  singleInstruction('mul'),
  singleInstruction('sub'),
  singleInstruction('call'),
  singleInstruction('ret'),
  singleInstruction('isp'),
  singleInstruction('dsp'),
  singleInstruction('iip'),
  singleInstruction('dip'),
  singleInstruction('halt'),
  argumentInstruction('push'),
  argumentInstruction('jnz'),
  argumentInstruction('jmp'),
  argumentInstruction('ssp'),
  argumentInstruction('lsf'),
  argumentInstruction('rsf'),
])) (newlines);


module.exports = doParser(function* () {
  yield whitespace;
  yield str('.start');
  yield possibly(Whitespace);
  yield newlines;

  const entries = yield many(codeSectionItem);
  yield endOfInput;

  return Parser.of({
    type: 'code-section',
    section: entries
  });
});

