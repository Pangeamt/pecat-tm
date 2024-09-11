const levenshtein = require("fast-levenshtein");

const levenshteinSimilarity = (s1, s2) => {
  let distance = levenshtein.get(s1.toLowerCase(), s2.toLowerCase());
  let maxLength = Math.max(s1.length, s2.length);
  return (maxLength - distance) / maxLength;
};

const jaccardSimilarity = (str1, str2) => {
  let setA = new Set(str1.toLowerCase().split(" "));
  let setB = new Set(str2.toLowerCase().split(" "));

  let intersection = new Set([...setA].filter((x) => setB.has(x)));
  let union = new Set([...setA, ...setB]);

  const aux = intersection.size / union.size;
  //   return percentage;
  return aux;
};

module.exports = {
  levenshteinSimilarity,
  jaccardSimilarity,
};
