const {
  str,
  char,
  choice,
  sequenceOf,
  namedSequenceOf,
  whitespace,
  regex,
  possibly,
  many,
  letters,
  tapParser,
  Parser,
  takeLeft,
} = require('arcsecond');
const {
  newlines,
  Whitespace,
  doParser,
  hex16,
  comment,
  newline,
  commentNoNewline,
  possibleComments,
  sequencedNamed
} = require('./common');


const validLabel = regex(/^[a-zA-Z0-9\-_]+/)

const label = sequenceOf([
  whitespace,
  char(':'),
  validLabel,
  possibly(Whitespace)
]).map(([_, __, name]) => ({ type: 'label', value: name }));

const basicArgument = takeLeft(choice([
  sequenceOf([
    char('['),
    letters,
    char(']')
  ]).map(([_, name]) => ({ type: 'data-address-reference', value: name })),
  sequenceOf([
    str('*['),
    letters,
    char(']')
  ]).map(([_, name]) => ({ type: 'data-value-reference', value: name })),
  sequenceOf([
    char('{'),
    validLabel,
    char('}')
  ]).map(([_, name]) => ({ type: 'label-address-reference', value: name })),
  hex16.map(value => ({ type: 'literal-value', value }))
])) (possibly(Whitespace));

const additionArgument = takeLeft(
  sequencedNamed([
    char('<'),
      ['arg1', basicArgument],
    char('+'),
    Whitespace,
      ['arg2', basicArgument],
    char('>')
  ]).map(({arg1, arg2}) => ({
    type: 'argument-addition',
    arg1,
    arg2,
  }))
) (possibly(Whitespace));

const subtractionArgument = takeLeft(
  sequencedNamed([
    char('<'),
      ['arg1', basicArgument],
    char('-'),
    Whitespace,
      ['arg2', basicArgument],
    char('>')
  ]).map(({arg1, arg2}) => ({
    type: 'argument-subtraction',
    arg1,
    arg2,
  }))
) (possibly(Whitespace));

const argument = choice([
  additionArgument,
  subtractionArgument,
  basicArgument,
]);

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
  commentNoNewline,
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
  argumentInstruction('rsf')
])) (newlines);


module.exports = doParser(function* () {
  yield whitespace;
  yield possibleComments;
  yield whitespace;

  yield str('.code');
  yield possibly(Whitespace);
  yield many(choice([ newline, comment ]));

  const entries = (yield many(codeSectionItem)).filter(entry => {
    return entry.type !== 'comment'
  });

  return Parser.of({
    type: 'code-section',
    section: entries
  });
});

