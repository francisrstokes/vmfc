const fs = require('fs');
const path = require('path');
const {
  str,
  regex,
  choice,
  digits,
  char,
  possibly,
  Parser,
  recursiveParser,
  takeLeft,
  takeRight,
  many,
  sepBy,
  between,
  tapParser,
  fail
} = require('arcsecond');
const {
  doParser,
  spaces,
  sequencedNamed
} = require('../../assembler/parser/common');

const debuggingParser = tapParser(([index, str, last]) => {
  console.log(`Last value: ${last}`);
  console.log(`The rest: ${str.slice(index)}`);
})

const translateToAssembly = require('../generator');
const Scope = require('../generator/scope');
const ASM = require('../generator/asm');

const {
  ASSIGNMENT_STATEMENT,
  REASSIGNMENT_STATEMENT,
  RETURN_STATEMENT,

  NEGATED_EXPR,
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR,
  FUNCTION,
  FUNCTION_CALL,
  WHILE_BLOCK,
  IF_ELSE_BLOCK,
  IDENTIFIER,
  LITERAL_INT,
  STACK_VARIABLE,
  INDEXED_STACK_VARIABLE,
  LABEL_REFERENCE,

  LESS_THAN_EXPR,
  GREATER_THAN_EXPR,
  LESS_THAN_OR_EQUAL_TO_EXPR,
  GREATER_THAN_OR_EQUAL_TO_EXPR,
  EQUAL_TO_EXPR,
  NOT_EQUAL_TO_EXPR,
} = require('../constants');

const spaceSurrounded = between (possibly(spaces)) (possibly(spaces));
const bracketed = between (spaceSurrounded(char('('))) (spaceSurrounded(char(')')));
const strictBracketed = between (char('(')) (char(')'));
const strictCurlyBracketed = between (char('{')) (char('}'));
const strictSquareBracketed = between (char('[')) (char(']'));

const createIdentifier = identifier => ({ type: IDENTIFIER, value: identifier });
const createInt = value => ({ type: LITERAL_INT, value });
const createBinaryExpression = (type, a, b) => ({ type, value: { a, b } });
const createStackVariable = value => ({ type: STACK_VARIABLE, value });
const createIndexedStackVariable = (value, index) => ({ type: INDEXED_STACK_VARIABLE, value, index });
const createFunction = (name, args, value) => ({ type: FUNCTION, args, name, value });
const createFunctionCall = (name, args) => ({ type: FUNCTION_CALL, args, name });
const createWhile = (eqExpr, value) => ({ type: WHILE_BLOCK, eqExpr, value });
const createIfElse = (eqExpr, ifStatements, elseStatements) => ({ type: IF_ELSE_BLOCK, eqExpr, ifStatements, elseStatements });
const createNegatedExpression = value => ({ type: NEGATED_EXPR, value });
const createLabelReference = value => ({ type: LABEL_REFERENCE, value });
const createReturn = value => ({ type: RETURN_STATEMENT, value });

const identifierP = regex(/^[a-zA-Z_][a-zA-Z0-9_]*/).map(createIdentifier);

const intP = choice([
  regex(/^0x[0-9A-Fa-f]{1,4}/).map(v => parseInt(v, 16)),
  digits.map(v => parseInt(v, 10)),
]).map(createInt);

const stackVariableP = identifierP.map(createStackVariable);
const indexedStackVariableP = recursiveParser(() => sequencedNamed([
  ['name', stackVariableP],
  ['index', strictSquareBracketed(exprP)]
]).map(({name, index}) => createIndexedStackVariable(name, index)));

const binaryExprP = (operator, type) => recursiveParser(() =>
  strictBracketed(sequencedNamed([
    ['a', exprP],
    spaces,
    str(operator),
    spaces,
    ['b', exprP]
  ])).map(({a, b}) => createBinaryExpression(type, a, b))
);

const equalityExprP = recursiveParser(() => choice([
  binaryExprP('==', EQUAL_TO_EXPR),
  binaryExprP('!=', NOT_EQUAL_TO_EXPR),
  binaryExprP('<', LESS_THAN_EXPR),
  binaryExprP('>', GREATER_THAN_EXPR),
  binaryExprP('>=', GREATER_THAN_OR_EQUAL_TO_EXPR),
  binaryExprP('<=', LESS_THAN_OR_EQUAL_TO_EXPR),
  negatedExprP,
  exprP
]));

const negatedExprP = recursiveParser(() => sequencedNamed([
  char('!'),
  ['expr', exprP]
]).map(({expr}) => createNegatedExpression(expr)));

const labelReferenceP = strictCurlyBracketed(identifierP).map(createLabelReference);

const exprP = recursiveParser(() => choice([
  binaryExprP('+', ADDITION_EXPR),
  binaryExprP('-', SUBTRACTION_EXPR),
  binaryExprP('*', MULTIPLICATION_EXPR),

  intP,
  functionCallP,
  indexedStackVariableP,
  stackVariableP,

  labelReferenceP,
  bracketed(exprP)
]));

const assignmentP = doParser(function* () {
  yield regex(/^var[ ]+/);
  const identifier = yield identifierP;

  let nonIntegerReservation = false;
  let isArray = false;
  const size = yield possibly(strictSquareBracketed(exprP)).map(x => {
    if (x === null) return 1;
    if (x.type !== LITERAL_INT) {
      nonIntegerReservation = true;
    }
    isArray = true;
    return x.value;
  });

  if (nonIntegerReservation) {
    return fail(`Cannot create array '${identifier}' with size  that is a non-integer value`);
  } else if (size <= 0) {
    return fail(`Cannot create array '${identifier}' with size <= 0`);
  }

  if (isArray) {
    yield regex(/^[ \n\t]*;/);
    return Parser.of({
      type: ASSIGNMENT_STATEMENT,
      identifier,
      isArray,
      size,
      value: createInt(0)
    });
  }

  yield regex(/^[ ]+=[ ]+/);
  const value = yield exprP;
  yield possibly(spaces);
  yield regex(/^[ \n\t]*;/)

  return Parser.of({
    type: ASSIGNMENT_STATEMENT,
    identifier,
    isArray,
    size,
    value
  });
});

const reassignmentP = doParser(function* () {
  const identifier = yield identifierP;
  const index = yield possibly(strictSquareBracketed(exprP))
    .map(x => (x === null) ? createInt(0) : x);
  yield regex(/^[ ]+=[ ]+/);

  const value = yield exprP;
  yield possibly(spaces);

  yield char(';');

  return Parser.of({
    type: REASSIGNMENT_STATEMENT,
    index,
    identifier,
    value
  });
});

const returnP = recursiveParser(() => doParser(function* () {
  yield regex(/^return[ ]+/);
  const expr = yield exprP;
  yield regex(/^[ \t\n]*;[ \t\n]*/)
  return Parser.of(createReturn(expr));
}));

const statementP = recursiveParser(() => choice([
  returnP,
  whileP,
  ifP,
  functionCallP,
  assignmentP,
  reassignmentP,
]));

const ifP = recursiveParser(() => doParser(function* () {
  yield regex(/^if[ ]*\(/);
  const expr = yield equalityExprP;
  yield regex(/^\)[ ]*\{[ \n\t]*/);
  const ifStatements = yield many(
    takeLeft (statementP) (regex(/^[ \n\t]*/))
  );
  yield regex(/^}[ \n\t]*/);
  const hasElse = yield possibly(regex(/^else[ \n\t]+{[ \n\t]*/)).map(x => x !== null);

  let elseStatements = [];
  if (hasElse) {
    elseStatements = yield many(
      takeLeft (statementP) (regex(/^[ \n\t]*/))
    );
    yield regex(/^}[ \n\t]*/);
  }

  return Parser.of(createIfElse(expr, ifStatements, elseStatements));
}));

const whileP = recursiveParser(() => doParser(function* () {
  yield regex(/^while[ ]*\(/);
  const expr = yield equalityExprP;
  yield regex(/^\)[ ]*\{[ \n\t]+/);

  const statements = yield many(
    takeLeft (statementP) (regex(/^[ \n\t]*/))
  );

  yield regex(/^}[ \n\t]+/);

  return Parser.of(createWhile(expr, statements));
}));

const functionP = doParser(function* () {
  yield regex(/^fn[ ]+/);
  const identifier = yield identifierP;
  yield regex(/^[ ]*[ \n\t]+/);

  const args = yield strictBracketed(
    sepBy(char(','))(spaceSurrounded(identifierP))
  );

  yield regex(/^[ ]*\{[ \n\t]+/);

  const statements = yield many(
    takeLeft (statementP) (regex(/^[ \n\t]*/))
  );

  return Parser.of(createFunction(identifier, args, statements));
});

const functionCallP = doParser(function* () {
  const identifier = yield identifierP;
  const args = yield strictBracketed(
    sepBy(char(','))(spaceSurrounded(exprP))
  );
  yield regex(/^[ \t\n]*/);
  return Parser.of(createFunctionCall(identifier, args));
});


const src = [
  'fn aIfEqual (a, b) {',
  '  if ((a == b)) {',
  '    return a;',
  '  } else {',
  '    return b;',
  '  }',
  '}'
].join('\n');

console.log(src + '\n\n');

// console.log(
functionP
  .run(src)
  // .map(console.log)
  // .leftMap(console.log)
  .map(x => translateToAssembly(x, new Scope(), new ASM()))
  .map(x => {
    console.log(x.getCode());
    return x;
  })
// )
// console.log(
// const s = new Scope();
// s.addVariable('s', 'ASSIGNMENT');
// whileP
//   .run(src)
//   .map(x => translateToAssembly(x, s, new ASM()))
//   .map(x => console.log(x.getCode()))
// )

debugger;