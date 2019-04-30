const {
  FUNCTION,
  ASSIGNMENT_STATEMENT,
  REASSIGNMENT_STATEMENT,
  BRACKET_EXPR,
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR,
  IDENTIFIER,
  LITERAL_INT,
  STACK_VARIABLE,
} = require('../constants');

const Scope = require('./scope');

const arithmeticExpressions = [
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR
];

const translations = {
  expr: (expr, scope, asm) => {
    switch (expr.type) {
      case FUNCTION: return translations.function(expr, asm);
      case ASSIGNMENT_STATEMENT: return translations.assignment(expr, scope, asm);
      case REASSIGNMENT_STATEMENT: return translations.reassignment(expr, scope, asm);
      case ADDITION_EXPR: return translations.binaryOperation('add', expr, scope, asm);
      case SUBTRACTION_EXPR: return translations.binaryOperation('sub', expr, scope, asm);
      case MULTIPLICATION_EXPR: return translations.binaryOperation('mul', expr, scope, asm);
    }
    throw new Error(`Unrecognised expression type! ${JSON.stringify(expr, null, '  ')}`);
  },

  function: (expr, asm) => {
    const scope = new Scope(expr.args);

    asm += `${expr.name.value}:\n`

    for (let statementExpr of expr.value) {
      asm = translations.expr(statementExpr, scope, asm);
    }

    asm += 'ret\n\n';
    return asm;
  },

  assignment: (expr, scope, asm) => {
    if (expr.value.type === LITERAL_INT) {
      asm += `push 0x${expr.value.value.toString(16)}\n`;
      scope.addVariable(expr.identifier.value, LITERAL_INT);
    } else if (arithmeticExpressions.includes(expr.value.type)) {
      asm = translations.expr(expr.value, scope, asm);
      scope.addVariable(expr.identifier.value, 'ASSIGNMENT');
    }
    return asm;
  },

  reassignment: (expr, scope, asm) => {
    if (expr.value.type === LITERAL_INT) {
      asm += `push 0x${expr.value.value.toString(16)}\n`;
      asm += `smv ${scope.getHexAddress(expr.identifier.value)}\n`;
    } else if (arithmeticExpressions.includes(expr.value.type)) {
      asm = translations.expr(expr.value, scope, asm);
      asm += `smv ${scope.getHexAddress(expr.identifier.value)}\n`;
    }
    return asm;
  },

  binaryOperation: (binaryInstruction, expr, scope, asm) => {
    if (expr.value.a.type === LITERAL_INT) {
      asm += `push 0x${expr.value.a.value.toString(16)}\n`;
    } else if (expr.value.a.type === STACK_VARIABLE) {
      const stackVarName = expr.value.a.value.value;
      asm += `cps ${scope.getHexAddress(stackVarName)}\n`;
    } else {
      asm = translations.expr(expr.value.a, scope, asm);
    }

    if (expr.value.b.type === LITERAL_INT) {
      asm += `push 0x${expr.value.b.value.toString(16)}\n`;
    } else if (expr.value.b.type === STACK_VARIABLE) {
      const stackVarName = expr.value.b.value.value;
      asm += `cps ${scope.getHexAddress(stackVarName)}\n`;
    } else {
      asm = translations.expr(expr.value.b, scope, asm);
    }

    asm += `${binaryInstruction}\n`;
    return asm;
  }
}

module.exports = translations.expr;