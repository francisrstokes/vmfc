const {
  FUNCTION,
  WHILE_BLOCK,
  NEGATED_EXPR,
  ASSIGNMENT_STATEMENT,
  REASSIGNMENT_STATEMENT,
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR,
  LITERAL_INT,
  STACK_VARIABLE,
  LESS_THAN_EXPR,
  GREATER_THAN_EXPR,
  LESS_THAN_OR_EQUAL_TO_EXPR,
  GREATER_THAN_OR_EQUAL_TO_EXPR,
  EQUAL_TO_EXPR,
  NOT_EQUAL_TO_EXPR,
} = require('../constants');

const Scope = require('./scope');

const randomId = () => Math.random().toString(16).slice(2);

const arithmeticExpressions = [
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR
];

const $ = {};

$.expr = (expr, scope, asm) => {
  switch (expr.type) {
    case LITERAL_INT: return $.literalInt(expr, scope, asm);
    case STACK_VARIABLE: return $.stackVariable(expr, scope, asm);
    case FUNCTION: return $.function(expr, asm);
    case WHILE_BLOCK: return $.while(expr, scope, asm);
    case ASSIGNMENT_STATEMENT: return $.assignment(expr, scope, asm);
    case REASSIGNMENT_STATEMENT: return $.reassignment(expr, scope, asm);
    case ADDITION_EXPR: return $.binaryOperation('add', expr, scope, asm);
    case SUBTRACTION_EXPR: return $.binaryOperation('sub', expr, scope, asm);
    case MULTIPLICATION_EXPR: return $.binaryOperation('mul', expr, scope, asm);
  }
  throw new Error(`Unrecognised expression type! ${JSON.stringify(expr, null, '  ')}`);
};

$.function = (expr, asm) => {
  const scope = new Scope(expr.args);

  asm.label(expr.name.value);

  for (let statementExpr of expr.value) {
    $.expr(statementExpr, scope, asm);
  }

  asm.add('ret');
  asm.unindent();
  return asm;
};

const whileExpressionTable = {
  [EQUAL_TO_EXPR]: 'jne',
  [NOT_EQUAL_TO_EXPR]: 'jeq',
  [LESS_THAN_EXPR]: 'jge',
  [GREATER_THAN_EXPR]: 'jle',
  [LESS_THAN_OR_EQUAL_TO_EXPR]: 'jgt',
  [GREATER_THAN_OR_EQUAL_TO_EXPR]: 'jlt',
};

$.while = (expr, scope, asm) => {
  const newScope = scope.fork();
  const id = randomId();

  asm.label(`while_${id}`);

  switch (expr.eqExpr.type) {
    case EQUAL_TO_EXPR: {
      $.expr(expr.eqExpr.value.a, scope, asm);
      $.expr(expr.eqExpr.value.b, scope, asm);
      asm.add(`push {while_${id}_end}`);
      asm.add('jne');
      break;
    }
    case NOT_EQUAL_TO_EXPR: {
      $.expr(expr.eqExpr.value.a, scope, asm);
      $.expr(expr.eqExpr.value.b, scope, asm);
      asm.add(`push {while_${id}_end}`);
      asm.add('jeq');
      break;
    }
    case LESS_THAN_EXPR: {
      $.expr(expr.eqExpr.value.a, scope, asm);
      $.expr(expr.eqExpr.value.b, scope, asm);
      asm.add(`push {while_${id}_end}`);
      asm.add('jge');
      break;
    }
    case GREATER_THAN_EXPR: {
      $.expr(expr.eqExpr.value.a, scope, asm);
      $.expr(expr.eqExpr.value.b, scope, asm);
      asm.add(`push {while_${id}_end}`);
      asm.add('jle');
      break;
    }
    case LESS_THAN_OR_EQUAL_TO_EXPR: {
      $.expr(expr.eqExpr.value.a, scope, asm);
      $.expr(expr.eqExpr.value.b, scope, asm);
      asm.add(`push {while_${id}_end}`);
      asm.add('jgt');
      break;
    }
    case GREATER_THAN_OR_EQUAL_TO_EXPR: {
      $.expr(expr.eqExpr.value.a, scope, asm);
      $.expr(expr.eqExpr.value.b, scope, asm);
      asm.add(`push {while_${id}_end}`);
      asm.add('jlt');
      break;
    }
    case NEGATED_EXPR: {
      $.expr(expr.eqExpr.value, scope, asm);
      asm.add(`push {while_${id}_end}`);
      asm.add('jnz');
      break;
    }
    default: {
      $.expr(expr.eqExpr, scope, asm);
      asm.add(`push {while_${id}_end}`);
      asm.add('jz');
    }
  }

  for (let statementExpr of expr.value) {
    $.expr(statementExpr, newScope, asm);
  }

  asm.add(`push {while_${id}}`);
  asm.add('jmp');

  asm.unindent();
  asm.label(`while_${id}_end`);
  asm.unindent();

  return asm;
};

$.assignment = (expr, scope, asm) => {
  if (expr.value.type === LITERAL_INT) {
    asm.add(`push 0x${expr.value.value.toString(16)}`);
    scope.addVariable(expr.identifier.value, LITERAL_INT);
  } else if (arithmeticExpressions.includes(expr.value.type)) {
    $.expr(expr.value, scope, asm);
    scope.addVariable(expr.identifier.value, 'ASSIGNMENT');
  }
  return asm;
};

$.reassignment = (expr, scope, asm) => {
  if (expr.value.type === LITERAL_INT) {
    asm.add(`push 0x${expr.value.value.toString(16)}`);
    asm.add(`smv ${scope.getHexAddress(expr.identifier.value)}`);
  } else if (arithmeticExpressions.includes(expr.value.type)) {
    $.expr(expr.value, scope, asm);
    asm.add(`smv ${scope.getHexAddress(expr.identifier.value)}`);
  }
  return asm;
};

$.binaryOperation = (binaryInstruction, expr, scope, asm) => {
  if (expr.value.a.type === LITERAL_INT) {
    asm.add(`push 0x${expr.value.a.value.toString(16)}`);
  } else if (expr.value.a.type === STACK_VARIABLE) {
    const stackVarName = expr.value.a.value.value;
    asm.add(`cps ${scope.getHexAddress(stackVarName)}`);
  } else {
    $.expr(expr.value.a, scope, asm);
  }

  if (expr.value.b.type === LITERAL_INT) {
    asm.add(`push 0x${expr.value.b.value.toString(16)}`);
  } else if (expr.value.b.type === STACK_VARIABLE) {
    const stackVarName = expr.value.b.value.value;
    asm.add(`cps ${scope.getHexAddress(stackVarName)}`);
  } else {
    $.expr(expr.value.b, scope, asm);
  }

  asm.add(binaryInstruction);

  return asm;
};

$.stackVariable = (expr, scope, asm) => {
  asm.add(`cps ${scope.getHexAddress(expr.value.value)}`);
  return asm;
};

$.literalInt = (expr, scope, asm) => {
  asm.add(`push 0x${expr.value.toString(16)}`);
  return asm;
};

module.exports = $.expr;