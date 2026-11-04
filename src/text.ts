// 阅读器与宿主共用的文本判断。
export function isTerm(text: string) {
  const term = text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  if (/\p{Script=Han}/u.test(term)) return term.length <= 6;
  return (
    term.length <= 60 &&
    /^[\p{L}\p{M}][\p{L}\p{M}'’-]*(?: [\p{L}\p{M}'’-]+){0,3}$/u.test(term)
  );
}
// 取出段落中包含该词的句子，作为单词卡的例句。
export function sentenceOf(text: string, term: string) {
  const needle = term.trim().toLocaleLowerCase();
  if (!needle) return "";
  const sentences = new Intl.Segmenter(undefined, { granularity: "sentence" });
  for (const { segment } of sentences.segment(text))
    if (segment.toLocaleLowerCase().includes(needle))
      return segment.trim().slice(0, 400);
  return "";
}
