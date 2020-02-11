const { Iconv } = require("iconv");

/**
 * If the input is a string, transcode it from ISO-8859-1 encoding
 * (given by facebook) to UTF-8, usable by NodeJS
 */
export function transcodeStrings(_key: any, value: any): any {
  if (typeof value === "string") {
    const iconv = new Iconv("UTF-8", "ISO-8859-1");
    const buffer = iconv.convert(value);
    return buffer.toString();
  } else {
    return value;
  }
}
