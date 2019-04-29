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
} = require('./constants');

const arithmeticExpressions = [
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR
];

const nextStackAddress = scope => {
  return `0x${(2 + Object.keys(scope).length * 2).toString(16)}`;
}

const translations = {
  expr: (expr, scope, asm) => {
    if (expr.type === FUNCTION) {
      return translations.function(expr, asm);
    } else if (expr.type === ASSIGNMENT_STATEMENT) {
      return translations.assignment(expr, scope, asm);
    } else if (expr.type === ADDITION_EXPR) {
      return translations.binaryOperation('add', expr, scope, asm);
    } else if (expr.type === SUBTRACTION_EXPR) {
      return translations.binaryOperation('sub', expr, scope, asm);
    } else if (expr.type === MULTIPLICATION_EXPR) {
      return translations.binaryOperation('mul', expr, scope, asm);
    }
    throw new Error(`Unrecognised expression type! ${JSON.stringify(expr, null, '  ')}`);
  },

  function: (expr, asm) => {
    const scope = expr.args.reduce((acc, cur) => {
      acc[cur.value] = {
        type: 'ARGUMENT',
        cpsAddress: nextStackAddress(acc)
      }
      return acc;
    }, {});

    asm += `${expr.name.value}:\n`

    for (let statementExpr of expr.value) {
      asm = translations.expr(statementExpr, scope, asm);
    }

    asm += 'ret\n';
    return asm;
  },

  assignment: (expr, scope, asm) => {
    if (expr.value.type === LITERAL_INT) {
      asm += `push 0x${expr.value.value.toString(16)}\n`;
      scope[expr.identifier.value] = {
        type: LITERAL_INT,
        cpsAddress: nextStackAddress(scope)
      };
    } else if (arithmeticExpressions.includes(expr.value.type)) {
      asm = translations.expr(expr.value, scope, asm);
      scope[expr.identifier.value] = {
        type: 'ASSIGNMENT',
        cpsAddress: nextStackAddress(scope)
      };
    }
    return asm;
  },

  binaryOperation: (binaryInstruction, expr, scope, asm) => {
    if (expr.value.a.type === LITERAL_INT) {
      asm += `push 0x${expr.value.a.value.toString(16)}\n`;
    } else if (expr.value.a.type === STACK_VARIABLE) {
      const stackVarName = expr.value.a.value.value;
      asm += `cps ${scope[stackVarName].cpsAddress}\n`;
    } else {
      asm = translations.expr(expr.value.a, scope, asm);
    }

    if (expr.value.b.type === LITERAL_INT) {
      asm += `push 0x${expr.value.b.value.toString(16)}\n`;
    } else if (expr.value.b.type === STACK_VARIABLE) {
      const stackVarName = expr.value.b.value.value;
      asm += `cps ${scope[stackVarName].cpsAddress}\n`;
    } else {
      asm = translations.expr(expr.value.b, scope, asm);
    }

    asm += `${binaryInstruction}\n`;
    return asm;
  }
}

module.exports = translations.expr;