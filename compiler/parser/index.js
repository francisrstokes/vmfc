const {
  COMMENT,
  ASSIGNMENT_STATEMENT,
  REASSIGNMENT_STATEMENT,
  RETURN_STATEMENT,

  NEGATED_EXPR,
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR,
  LEFT_SHIFT_EXPR,
  RIGHT_SHIFT_EXPR,
  AND_EXPR,
  OR_EXPR,
  XOR_EXPR,
  NOT_EXPR,
  FUNCTION,
  FUNCTION_CALL,

  SECTION_BLOCK,
  DATA_LINE,
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

const {
  sepBy1,
  letters,
  everythingUntil,
  str,
  choice,
  regex,
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
  fail,
  endOfInput,
  toValue
} = require('arcsecond');

const {
  doParser,
  spaces,
  sequencedNamed
} = require('../../assembler/parser/common');

const debuggingParser = tapParser(([index, str, last]) => {
  console.log(`Last value: ${last}`);
  console.log(`The rest: ${str.slice(index)}`);
});

const arbitrarySpace = regex(/^[ \t\n\r]*/);
const spaceSurrounded = between (possibly(spaces)) (possibly(spaces));
const arbitrarySpaceSurrounded = between (possibly(arbitrarySpace)) (possibly(arbitrarySpace));
const bracketed = between (spaceSurrounded(char('('))) (spaceSurrounded(char(')')));
const strictBracketed = between (char('(')) (char(')'));
const strictCurlyBracketed = between (char('{')) (char('}'));
const strictSquareBracketed = between (char('[')) (char(']'));

const createIdentifier = identifier => ({ type: IDENTIFIER, value: identifier });
const createInt = value => ({ type: LITERAL_INT, value });
const createBinaryExpression = (type, a, b) => ({ type, value: { a, b } });
const createLogicalNotExpression = value => ({ type: NOT_EXPR, value });
const createStackVariable = value => ({ type: STACK_VARIABLE, value });
const createIndexedStackVariable = (value, index) => ({ type: INDEXED_STACK_VARIABLE, value, index });
const createFunction = (name, args, value) => ({ type: FUNCTION, args, name, value });
const createFunctionCall = (name, args) => ({ type: FUNCTION_CALL, args, name });
const createWhile = (eqExpr, value) => ({ type: WHILE_BLOCK, eqExpr, value });
const createIfElse = (eqExpr, ifStatements, elseStatements) => ({ type: IF_ELSE_BLOCK, eqExpr, ifStatements, elseStatements });
const createNegatedExpression = value => ({ type: NEGATED_EXPR, value });
const createLabelReference = value => ({ type: LABEL_REFERENCE, value });
const createReturn = value => ({ type: RETURN_STATEMENT, value });
const createComment = value => ({ type: COMMENT, value });
const createDataLine = (name, type, value) => ({ type: DATA_LINE, name,  dataType: type, value });
const createSection = (name, value, startAddress) => ({ type: SECTION_BLOCK, name, value, startAddress });

const createProgram = (sections, code) => ({ sections, code });

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

const commentP = sequencedNamed([
  regex(/^[ \t\r]*\/\//),
  ['comment', everythingUntil(choice([
    char('\n'),
    endOfInput
  ]))],
  regex(/^[ \t\r]*/)
]).map(({comment}) => createComment(comment));

const binaryExprP = (operator, type) => recursiveParser(() => doParser(function* () {
  yield regex(/^[ \t\n]*\([ \t\n]*/);

  const a = yield exprP;

  yield regex(/^[ \t\n]*/);
  yield str(operator);
  yield regex(/^[ \t\n]*/);

  const b = yield exprP;

  yield regex(/^[ \t\n]*\)[ \t\n]*/);
  return Parser.of(createBinaryExpression(type, a, b));
}));

const logicalNotExprP = recursiveParser(() => doParser(function* () {
  yield regex(/^[ \t\n]*~/);
  const expr = yield exprP;
  yield regex(/^[ \t\n]*/);
  return Parser.of(createLogicalNotExpression(expr));
}));

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
  binaryExprP('<<', LEFT_SHIFT_EXPR),
  binaryExprP('>>', RIGHT_SHIFT_EXPR),
  binaryExprP('^', XOR_EXPR),
  binaryExprP('|', OR_EXPR),
  binaryExprP('&', AND_EXPR),
  logicalNotExprP,

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
  commentP,
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

  yield regex(/^\}[ \t]*/);

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

const dataLineP = doParser(function* () {
  const name = yield identifierP;
  yield regex(/^[ \t\r]+/);

  let value;

  const type = yield letters;
  yield arbitrarySpace;

  switch (type) {
    case 'bytes':
    case 'words': {
      value = yield sepBy1
        (arbitrarySpaceSurrounded(char(',')))
        (intP);
      yield regex(/^[ \r\t\n]*;/);
      break;
    }
    case 'ascii': {
      value = yield everythingUntil(char('\n'));
      break;
    }
    case 'buffer': {
      value = yield intP;
      yield regex(/^[ \r\t\n]*;/);
      break;
    }
    default: {
      return fail(`Unrecognized section data type '${type}'`);
    }
  }

  yield arbitrarySpace;
  return Parser.of(createDataLine(name, type, value));
});

const sectionP = recursiveParser(() => doParser(function* () {
  yield regex(/^[ \t\n\r]*section[ \t\r]+/);
  const name = yield identifierP;

  yield regex(/^[ \t\r]+/);
  const startAddress = yield intP;

  yield regex(/^[ \t\r]+\{[ \n\t\r]*/);

  const dataLines = yield many(dataLineP);

  yield regex(/^[ \n\t\r]*\}[ \n\t\r]*/);

  return Parser.of(createSection(name, dataLines, startAddress));
}));

const programP = doParser(function* () {
  yield arbitrarySpace;
  const sections = yield many(sectionP);
  const code = yield many(choice([
    takeRight(regex(/^[ \t\n]*/))(functionP),
    takeRight(regex(/^[ \t\n]*/))(commentP)
  ]));

  return Parser.of(createProgram(sections, code));
});

module.exports = input => toValue(programP.run(input));
