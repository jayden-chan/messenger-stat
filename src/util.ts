const Iconv = require("iconv").Iconv;

export const wordBlacklist = [
  "is",
  "if",
  "do",
  "u",
  "i",
  "be",
  "was",
  "like",
  "have",
  "we",
  "are",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "up",
  "the",
  "and",
  "a",
  "that",
  "I",
  "it",
  "not",
  "he",
  "as",
  "you",
  "this",
  "but",
  "his",
  "they",
  "her",
  "she",
  "or",
  "an",
  "will",
  "my",
  "one",
  "all",
  "would",
  "there",
  "their"
];

export function contentConvert(key: any, value: any): any {
  if (typeof value === "string") {
    const iconv = new Iconv("UTF-8", "ISO-8859-1");
    const buffer = iconv.convert(value);
    return buffer.toString();
  } else {
    return value;
  }
}
