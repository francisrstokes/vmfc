const {
  char,
  regex,
  Parser,
  possibly,
  many1,
  takeLeft,
  many,
  namedSequenceOf,
  everythingUntil,
  sequenceOf,
  whitespace,
  between
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

const possibleComments = many(
  takeLeft(comment)(newlines)
);

const doParser = gen => Do(gen, Parser);

const sequencedNamed = parsers => namedSequenceOf(
  parsers.map(p => Array.isArray(p) ? p : ['_ARCSECOND_IGNORED__', p])
).map(v => {
  delete v._ARCSECOND_IGNORED__;
  return v;
});

const whitespaceSurrounded = between(possibly(Whitespace))(possibly(Whitespace));

module.exports = {
  newline,
  newlines,
  Whitespace,
  doParser,
  hex16,
  comment,
  commentNoNewline,
  possibleComments,
  sequencedNamed,
  spaces: Whitespace,
  whitespaceSurrounded
};
