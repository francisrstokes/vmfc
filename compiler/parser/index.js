const fs = require('fs');
const path = require('path');
const {
  str,
  regex,
  choice,
  digits,
  char,
  fail,
  possibly,
  Parser,
  recursiveParser,
  takeLeft,
  takeRight,
  many,
  sepBy,
  between
} = require('arcsecond');
const {
  doParser,
  spaces,
  sequencedNamed
} = require('../../assembler/parser/common');

const translateToAssembly = require('../index');

const {
  ASSIGNMENT_STATEMENT,
  REASSIGNMENT_STATEMENT,
  BRACKET_EXPR,
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR,
  FUNCTION,
  IDENTIFIER,
  LITERAL_INT,
  STACK_VARIABLE,
} = require('../constants');

const spaceSurrounded = between (possibly(spaces)) (possibly(spaces));
const bracketed = between (spaceSurrounded(char('('))) (spaceSurrounded(char(')')));
const strictBracketed = between (char('(')) (char(')'));

const createIdentifier = identifier => ({ type: IDENTIFIER, value: identifier });
const createInt = value => ({ type: LITERAL_INT, value });
const createBinaryExpression = (type, a, b) => ({ type, value: { a, b } });
const createStackVariable = value => ({ type: STACK_VARIABLE, value });
const createFunction = (name, args, value) => ({ type: FUNCTION, name, value });

const identifierP = regex(/^[a-zA-Z_][a-zA-Z0-9_]*/).map(createIdentifier);

const intP = choice([
  regex(/^0x[0-9A-Fa-f]{1,4}/).map(v => parseInt(v, 16)),
  digits.map(v => parseInt(v, 10)),
]).map(createInt);

const stackVariableP = takeRight(char('$'))(identifierP).map(createStackVariable);

const binaryExprP = (operator, type) => recursiveParser(() =>
  strictBracketed(sequencedNamed([
    ['a', exprP],
    spaces,
    str(operator),
    spaces,
    ['b', exprP]
  ])).map(({a, b}) => createBinaryExpression(type, a, b))
);

const exprP = recursiveParser(() => choice([
  binaryExprP('+', ADDITION_EXPR),
  binaryExprP('-', SUBTRACTION_EXPR),
  binaryExprP('*', MULTIPLICATION_EXPR),

  intP,
  stackVariableP,

  bracketed(exprP)
]));

const assignmentP = doParser(function* () {
  yield regex(/^var[ ]+/);
  const identifier = yield identifierP;
  yield regex(/^[ ]+=[ ]+/);

  const value = yield exprP;
  yield possibly(spaces);

  yield char(';');

  return Parser.of({
    type: ASSIGNMENT_STATEMENT,
    identifier,
    value
  });
});

const reassignmentP = doParser(function* () {
  const identifier = yield identifierP;
  yield spaces;
  yield char('=');
  yield spaces;

  const value = yield exprP;
  yield spaces;

  yield char(';');

  return Parser.of({
    type: REASSIGNMENT_STATEMENT,
    identifier,
    value
  });
});

const functionP = doParser(function* () {
  yield regex(/^fn[ ]+/);
  const identifier = yield identifierP;
  yield regex(/^[ ]*[ \n\t]+/);

  const args = yield strictBracketed(
    sepBy(char(','))(spaceSurrounded(identifierP))
  );

  yield regex(/^[ ]*\{[ \n\t]+/);

  const statements = yield many(
    takeLeft (assignmentP) (regex(/^[ \n\t]+/))
  );

  const returnStatement = yield takeRight (regex(/^return[ ]+/)) (
    takeLeft(exprP)(regex(/^[ ]*;[ \t\n]+}/))
  );

  return Parser.of({
    type: FUNCTION,
    name: identifier,
    args,
    value: [
      ...statements,
      returnStatement
    ]
  });
})


const src = [
  'fn someFnName (a, b) {',
  '  var x = ($a + 0x5);',
  '  return (($x * $b) + $a);',
  '}',
].join('\n');

console.log(src);

console.log(
  functionP
    .run(src)
    .map(x => translateToAssembly(x, {}, ''))
)

debugger;