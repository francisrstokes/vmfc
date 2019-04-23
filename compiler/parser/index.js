const fs = require('fs');
const path = require('path');
const {
  str,
  regex,
  choice,
  digits,
  char,
  fail,
  Parser
} = require('arcsecond');
const {doParser, spaces} = require('../../assembler/parser/common');


const ASSIGNMENT_STATEMENT = 'assignment_statement';
const REASSIGNMENT_STATEMENT = 'reassignment_statement';

const TYPE_IDENTIFIER = 'type_identifier';
const IDENTIFIER = 'identifier';
const LITERAL_INT = 'literal_int';

const createTypeIdentifier = typeName => _ => ({ type: TYPE_IDENTIFIER, value: typeName });
const createIdentifier = identifier => ({ type: IDENTIFIER, value: identifier });
const createInt = value => ({ type: LITERAL_INT, value });

// type       = choice [int]
// identifier = regex /^[a-zA-Z_][a-zA-Z0-9_]+/
// intValue   = choice [digits, hex]
// assignment = [type, identifier, valueBasedOnType]

const typeP = choice([
  str('int').map(createTypeIdentifier('int'))
]);

const identifierP = regex(/^[a-zA-Z_][a-zA-Z0-9_]*/).map(createIdentifier);

const intP = choice([
  digits.map(v => parseInt(v, 10)),
  regex(/^0x[0-9A-Fa-f]{1, 4}/).map(v => parseInt(v, 16))
]).map(createInt);

const valueP = choice([ intP ]);

const assignmentP = doParser(function* () {
  const type = yield typeP;
  yield spaces;
  const identifier = yield identifierP;
  yield spaces;
  yield char('=');
  yield spaces;

  let value;
  if (type.value === 'int') {
    value = yield intP;
  } else {
    return yield fail(`Unsupported type ${type.value}`);
  }

  yield char(';');

  return Parser.of({
    type: ASSIGNMENT_STATEMENT,
    value: {
      type,
      identifier,
      value
    }
  });
});

const reassignmentP = doParser(function* () {
  const identifier = yield identifierP;
  yield spaces;
  yield char('=');
  yield spaces;

  const value = yield valueP.leftMap(() => `Unknown value type`);
  yield char(';');

  return Parser.of({
    type: REASSIGNMENT_STATEMENT,
    value: {
      type,
      identifier,
      value
    }
  });
});



fs.readFile(path.join(__dirname, '../test.vmc'), 'utf8', (err, data) => {
  if (err) {
    debugger;
  }

  console.log(
    reassignmentP.run('a = 42;')
  )
  debugger;
});