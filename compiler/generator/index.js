const {
  SECTION_BLOCK,
  COMMENT,
  FUNCTION,
  FUNCTION_CALL,
  IF_ELSE_BLOCK,
  WHILE_BLOCK,
  NEGATED_EXPR,
  ASSIGNMENT_STATEMENT,
  REASSIGNMENT_STATEMENT,
  RETURN_STATEMENT,
  ADDITION_EXPR,
  SUBTRACTION_EXPR,
  MULTIPLICATION_EXPR,
  LEFT_SHIFT_EXPR,
  RIGHT_SHIFT_EXPR,
  AND_EXPR,
  OR_EXPR,
  XOR_EXPR,
  NOT_EXPR,
  LITERAL_INT,
  STACK_VARIABLE,
  INDEXED_STACK_VARIABLE,
  LESS_THAN_EXPR,
  GREATER_THAN_EXPR,
  LESS_THAN_OR_EQUAL_TO_EXPR,
  GREATER_THAN_OR_EQUAL_TO_EXPR,
  EQUAL_TO_EXPR,
  NOT_EQUAL_TO_EXPR,
  LABEL_REFERENCE
} = require('../constants');

const Scope = require('./scope');
const ASM = require('./asm');

const randomId = () => Math.random().toString(16).slice(2);

const $ = {};

const jumpExpression = (label, expr, scope, asm) => {
  switch (expr.type) {
    case EQUAL_TO_EXPR: {
      $.expr(expr.value.a, scope, asm);
      $.expr(expr.value.b, scope, asm);
      asm.add(`push {${label}}`);
      asm.add('jne');
      break;
    }
    case NOT_EQUAL_TO_EXPR: {
      $.expr(expr.value.a, scope, asm);
      $.expr(expr.value.b, scope, asm);
      asm.add(`push {${label}}`);
      asm.add('jeq');
      break;
    }
    case LESS_THAN_EXPR: {
      $.expr(expr.value.a, scope, asm);
      $.expr(expr.value.b, scope, asm);
      asm.add(`push {${label}}`);
      asm.add('jge');
      break;
    }
    case GREATER_THAN_EXPR: {
      $.expr(expr.value.a, scope, asm);
      $.expr(expr.value.b, scope, asm);
      asm.add(`push {${label}}`);
      asm.add('jle');
      break;
    }
    case LESS_THAN_OR_EQUAL_TO_EXPR: {
      $.expr(expr.value.a, scope, asm);
      $.expr(expr.value.b, scope, asm);
      asm.add(`push {${label}}`);
      asm.add('jgt');
      break;
    }
    case GREATER_THAN_OR_EQUAL_TO_EXPR: {
      $.expr(expr.value.a, scope, asm);
      $.expr(expr.value.b, scope, asm);
      asm.add(`push {${label}}`);
      asm.add('jlt');
      break;
    }
    case NEGATED_EXPR: {
      $.expr(expr.value, scope, asm);
      asm.add(`push {${label}}`);
      asm.add('jnz');
      break;
    }
    default: {
      $.expr(expr, scope, asm);
      asm.add(`push {${label}}`);
      asm.add('jz');
    }
  }
  return asm;
}

$.program = ({sections, code}) => {
  const scope = new Scope();
  const asm = new ASM();

  sections.forEach(section => $.section(section, scope, asm));

  asm.add('.code\n');

  const hasMainFn = code.some(expr => expr.type === FUNCTION && expr.name.value === 'main');

  if (hasMainFn) {
    asm.comment('Program Entry Point');
    asm.add('push 0x0');
    asm.add('push {main}');
    asm.add('call');
    asm.add('halt');
    asm.blankLine();
  }

  code.forEach(expr => $.expr(expr, scope, asm));

  if (!hasMainFn) {
    asm.add('halt');
  }

  asm.blankLine();

  return asm;
};

$.expr = (expr, scope, asm) => {
  switch (expr.type) {
    case SECTION_BLOCK:           return $.section(expr, scope, asm);
    case COMMENT:                 return $.comment(expr, scope, asm);
    case LABEL_REFERENCE:         return $.labelReference(expr, scope, asm);
    case LITERAL_INT:             return $.literalInt(expr, scope, asm);
    case STACK_VARIABLE:          return $.stackVariable(expr, scope, asm);
    case INDEXED_STACK_VARIABLE:  return $.indexedStackVariable(expr, scope, asm);
    case FUNCTION:                return $.function(expr, asm);
    case FUNCTION_CALL:           return $.functionCall(expr, scope, asm);
    case IF_ELSE_BLOCK:           return $.ifElse(expr, scope, asm);
    case WHILE_BLOCK:             return $.while(expr, scope, asm);
    case ASSIGNMENT_STATEMENT:    return $.assignment(expr, scope, asm);
    case REASSIGNMENT_STATEMENT:  return $.reassignment(expr, scope, asm);
    case RETURN_STATEMENT:        return $.return(expr, scope, asm);
    case ADDITION_EXPR:           return $.binaryOperation('add', expr, scope, asm);
    case SUBTRACTION_EXPR:        return $.binaryOperation('sub', expr, scope, asm);
    case MULTIPLICATION_EXPR:     return $.binaryOperation('mul', expr, scope, asm);
    case LEFT_SHIFT_EXPR:         return $.binaryOperation('lsf', expr, scope, asm);
    case RIGHT_SHIFT_EXPR:        return $.binaryOperation('rsf', expr, scope, asm);
    case AND_EXPR:                return $.binaryOperation('and', expr, scope, asm);
    case OR_EXPR:                 return $.binaryOperation('or', expr, scope, asm);
    case XOR_EXPR:                return $.binaryOperation('xor', expr, scope, asm);
    case NOT_EXPR:                return $.logicalNot(expr, scope, asm);
  }
  throw new Error(`Unrecognised expression type! ${JSON.stringify(expr, null, '  ')}`);
};

$.section = (expr, scope, asm) => {
  asm.add(`.section ${expr.name.value} 0x${expr.startAddress.value.toString(16)}`);
  asm.indent();

  expr.value.forEach(dataLine => {
    let asmLine = `${dataLine.name.value} ${dataLine.dataType} `;

    switch (dataLine.dataType) {
      case 'words':
      case 'bytes': {
        asmLine += dataLine.value.map(({value}) => `0x${value.toString(16)}`).join(', ');
        break;
      }
      case 'ascii': {
        asmLine += dataLine.value;
        break;
      }
      case 'buffer': {
        asmLine += `0x${dataLine.value.value.toString(16)}`;
        break;
      }
    }

    asm.add(asmLine);
  });

  asm.unindent();

  return asm;
};

$.comment = (expr, scope, asm) => {
  asm.comment(expr.value);
  return asm;
};

$.function = (expr, asm) => {
  const scope = new Scope(expr.args);

  asm.label(expr.name.value);

  for (let statementExpr of expr.value) {
    $.expr(statementExpr, scope, asm);
  }

  asm.unindent();
  asm.blankLine();
  return asm;
};

$.functionCall = (expr, scope, asm) => {
  asm.add(`;; call ${expr.name.value}`);
  expr.args.forEach(argExpr => $.expr(argExpr, scope, asm));
  asm.add(`push 0x${expr.args.length.toString(16)}`);
  asm.add(`push {${expr.name.value}}`);
  asm.add('call');
  return asm;
};

$.while = (expr, scope, asm) => {
  const newScope = scope.fork();
  const id = randomId();

  asm.label(`while_${id}`);

  jumpExpression(`while_${id}_end`, expr.eqExpr, scope, asm);

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

$.ifElse = (expr, scope, asm) => {
  const id = randomId();
  const ifLabel = `if_${id}`;
  const elseLabel = `else_${id}`;
  const fiLabel = `fi_${id}`;

  jumpExpression(elseLabel, expr.eqExpr, scope, asm);

  asm.label(ifLabel);
  const ifScope = scope.fork();
  expr.ifStatements.forEach(ifExpr => $.expr(ifExpr, ifScope, asm));
  asm.add(`push {${fiLabel}}`);
  asm.add('jmp');
  asm.unindent();

  asm.label(elseLabel);
  const elseScope = scope.fork();
  expr.elseStatements.forEach(elseExpr => $.expr(elseExpr, elseScope, asm));
  asm.unindent();
  asm.label(fiLabel);
  asm.unindent();

  return asm;
}

$.assignment = (expr, scope, asm) => {
  if (scope.contains(expr.identifier.value)) {
    throw new Error(`Variable '${expr.identifier.value}' already exists and cannot be assigned with the var keyword`);
  }

  if (expr.isArray) {
    scope.addVariable(expr.identifier.value, LITERAL_INT, expr.size);
    return asm;
  }

  if (expr.value.type === LITERAL_INT) {
    asm.add(`push 0x${expr.value.value.toString(16)}`);
    scope.addVariable(expr.identifier.value, LITERAL_INT);
  } else {
    $.expr(expr.value, scope, asm);
    scope.addVariable(expr.identifier.value, 'ASSIGNMENT');
  }
  return asm;
};

$.reassignment = (expr, scope, asm) => {
  if (!scope.contains(expr.identifier.value)) {
    throw new Error(`Can't reassign undeclared variable '${expr.identifier.value}'`);
  }

  if (expr.index.type === LITERAL_INT && expr.index.value === 0) {
    $.expr(expr.value, scope, asm);
    asm.add(`smv ${scope.getHexAddress(expr.identifier.value)}`);
  } else {
    // Value on stack first
    $.expr(expr.value, scope, asm);

    // Then the calcuated address offset
    $.expr(expr.index, scope, asm);
    asm.add(`push ${scope.getHexAddress(expr.identifier.value)}`);
    asm.add('add');

    asm.add('smvo');
  }

  return asm;
};

$.logicalNot = (expr, scope, asm) => {
  $.expr(expr.value, scope, asm);
  asm.add('not');
  return asm;
}

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

$.indexedStackVariable = (expr, scope, asm) => {
  // Short circuit for 0
  if (expr.index.type === LITERAL_INT && expr.index.value === 0) {
    $.expr(expr.value, scope, asm);
    return asm;
  }

  // Calculate the index
  $.expr(expr.index, scope, asm);
  $.expr(expr.value, scope, asm);
  asm.add('add');

  asm.add('cpos');
  return asm;
};

$.literalInt = (expr, scope, asm) => {
  asm.add(`push 0x${expr.value.toString(16)}`);
  return asm;
};

$.labelReference = (expr, scope, asm) => {
  asm.add(`push {${expr.value.value}}`);
  return asm;
};

$.return = (expr, scope, asm) => {
  $.expr(expr.value, scope, asm);
  asm.add('ret');
  return asm;
};

module.exports = $;