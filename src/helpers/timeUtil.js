exports.covertJavascriptToPosgresTimestamp = (javascriptDateNow) => {
  return javascriptDateNow / 1000;
}