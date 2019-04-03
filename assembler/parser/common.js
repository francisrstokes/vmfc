const {
  char,
  regex,
  Parser,
  many1
} = require('arcsecond');
const Do = require('lazy-do');

const newline = char('\n');
const newlines = many1(newline);
const Whitespace = regex(/^[ ]+/);
const hex16 = regex(/^0x[0-9A-Fa-f]{1,4}/i);

const doParser = gen => Do(gen, Parser);

module.exports = {
  newline,
  newlines,
  Whitespace,
  doParser,
  hex16
};
