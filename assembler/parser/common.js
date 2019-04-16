const {
  char,
  regex,
  Parser,
  possibly,
  many1,
  takeLeft,
  many,
  sepBy1,
  everythingUntil,
  sequenceOf,
  whitespace
} = require('arcsecond');
const Do = require('lazy-do');

const newline = char('\n');
const newlines = many1(newline);
const Whitespace = regex(/^[ ]+/);
const hex16 = regex(/^0x[0-9A-Fa-f]{1,4}/i);

const commentNoNewline = sequenceOf([
  possibly(whitespace),
  char(';'),
  everythingUntil(char('\n'))
]).map(([_, __, value]) => ({ type: 'comment',  value }));

const comment = takeLeft(commentNoNewline)(newline);

const comments = sepBy1(newline)(comment);
const possibleComments = many(
  takeLeft(comment)(newlines)
);

const doParser = gen => Do(gen, Parser);

module.exports = {
  newline,
  newlines,
  Whitespace,
  doParser,
  hex16,
  comment,
  commentNoNewline,
  comments,
  possibleComments
};
