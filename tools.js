// Derived from http://stackoverflow.com/a/8545403/106786
function decodeFloat(bytes, signBits, exponentBits, fractionBits, eMin, eMax, littleEndian) {
  let binary = '';
  let i;
  const l = bytes.length;
  for (i = 0; i < l; i++) {
    let bits = bytes[i].toString(2);
    while (bits.length < 8) bits = `0${bits}`;

    if (littleEndian) binary = bits + binary;
    else binary += bits;
  }

  const sign = (binary.charAt(0) === '1') ? -1 : 1;
  let exponent = parseInt(binary.substr(signBits, exponentBits), 2) - eMax;
  const significandBase = binary.substr(signBits + exponentBits, fractionBits);
  let significandBin = `1${significandBase}`;
  i = 0;
  let val = 1;
  let significand = 0;

  if (exponent === -eMax) {
    if (significandBase.indexOf('1') === -1) return 0;

    exponent = eMin;
    significandBin = `0${significandBase}`;
  }

  while (i < significandBin.length) {
    significand += val * parseInt(significandBin.charAt(i), 10);
    val /= 2;
    i += 1;
  }

  // eslint-disable-next-line no-restricted-properties
  return sign * significand * Math.pow(2, exponent);
}

module.exports = {
  decodeFloat
};
