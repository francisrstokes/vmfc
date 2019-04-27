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

const label = sequencedNamed([
  whitespace,
  char(':'),
  ['name', validLabel],
  possibly(Whitespace),
  ['comment', possibly(commentNoNewline)],
]).map(({comment, name}) => ({
  type: 'label',
  value: name,
  endOfLineComment: comment
}));

const basicArgument = takeLeft(choice([
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

  hex16.map(value => ({ type: 'literal-value', value }))
])) (possibly(Whitespace));

const arithmeticArgument = takeLeft(
  sequencedNamed([
    char('<'),
      ['arg1', basicArgument],
      ['operator', regex(/^[+\-]/)],
    Whitespace,
      ['arg2', basicArgument],
    char('>')
  ]).map(({arg1, arg2, operator}) => ({
    type: 'argument-arithmetic',
    arg1,
    arg2,
    operator
  }))
) (possibly(Whitespace));

const argument = choice([ arithmeticArgument, basicArgument ]);

const singleInstruction = instruction =>
  sequencedNamed([
    possibly(Whitespace),
    choice([
      str(instruction),
      str(instruction.toUpperCase()),
    ]),
    possibly(Whitespace),
    ['comment', possibly(commentNoNewline)],
  ]).map(({comment}) => ({
    type: 'instruction',
    kind: instruction,
    argument: null,
    endOfLineComment: comment
  }));


const argumentInstruction = instruction =>
  sequencedNamed([
    possibly(Whitespace),
    choice([
      str(instruction),
      str(instruction.toUpperCase()),
    ]),
    Whitespace,
    ['argument', argument],
    possibly(Whitespace),
    ['comment', possibly(commentNoNewline)],
  ]).map(({comment, argument}) => ({
    type: 'instruction',
    kind: instruction,
    argument,
    endOfLineComment: comment
  }));

const codeSectionItem = takeLeft(choice([
  commentNoNewline,
  label,
  argumentInstruction('push'),
  argumentInstruction('cps'),
  argumentInstruction('smv'),
  singleInstruction('pip'),
  singleInstruction('psp'),
  singleInstruction('add'),
  singleInstruction('inc'),
  singleInstruction('dec'),
  singleInstruction('mul'),
  singleInstruction('sub'),
  singleInstruction('lsf'),
  singleInstruction('rsf'),
  singleInstruction('call'),
  singleInstruction('ret'),
  singleInstruction('isp'),
  singleInstruction('dsp'),
  singleInstruction('iip'),
  singleInstruction('dip'),
  singleInstruction('jnz'),
  singleInstruction('jmp'),
  singleInstruction('ssp'),
  singleInstruction('pms'),
  singleInstruction('pmf'),
  singleInstruction('msm'),
  singleInstruction('jeq'),
  singleInstruction('jne'),
  singleInstruction('jgt'),
  singleInstruction('jlt'),
  singleInstruction('jge'),
  singleInstruction('jle'),
  singleInstruction('and'),
  singleInstruction('or'),
  singleInstruction('xor'),
  singleInstruction('not'),
  singleInstruction('halt'),
  singleInstruction('dbg'),
  singleInstruction('nop'),
])) (newlines);


module.exports = doParser(function* () {
  yield whitespace;
  yield possibleComments;
  yield whitespace;

  yield str('.code');
  yield possibly(Whitespace);
  yield many(choice([ newline, comment ]))

  const entries = (yield many(codeSectionItem));

  return Parser.of({
    type: 'code-section',
    section: entries
  });
});

