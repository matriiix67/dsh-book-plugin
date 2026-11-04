// 阅读器与宿主共用的文本判断。
export function isTerm(text: string) {
  const term = text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  if (/\p{Script=Han}/u.test(term)) return term.length <= 6;
  return (
    term.length <= 60 &&
    /^[\p{L}\p{M}][\p{L}\p{M}'’-]*(?: [\p{L}\p{M}'’-]+){0,3}$/u.test(term)
  );
}
// 以中文为主的文字：有汉字、没有日文假名，且汉字数不少于其他文字的词数。
export function isChinese(text: string) {
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return false;
  const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  const words = text.match(/(?:(?!\p{Script=Han})\p{L})+/gu)?.length ?? 0;
  return han > 0 && han >= words;
}
// 翻译目标语言是否为中文，简体繁体都算。
export function isChineseTarget(language: string) {
  return /中文|汉语|漢語|华语|華語|chinese|^zh\b/i.test(language);
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
