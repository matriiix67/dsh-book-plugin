export type Status = "unread" | "reading" | "finished";
export type Block = { id: string; html: string; text: string };
export type Chapter = { id: string; title: string; blocks: Block[] };
export type Book = {
  removed?: boolean;
  id: string;
  revision: string;
  title: string;
  author: string;
  language: string;
  format: string;
  tags: string[];
  status: Status;
  source: string;
  size: number;
  mtime: number;
  addedAt: number;
  updatedAt: number;
  cover?: string;
  chapters: { id: string; title: string; length: number }[];
  progress: { chapter: string; block: string; ratio: number };
  lastReadAt: number;
};
export type Annotation = {
  id: string;
  bookId: string;
  revision: string;
  chapter: string;
  block: string;
  quote: string;
  note: string;
  kind: "highlight" | "bookmark";
  createdAt: number;
};
export type Hit = {
  bookId: string;
  title: string;
  chapter: string;
  chapterTitle: string;
  block: string;
  text: string;
  revision: string;
  url: string;
};
export type ReviewCard = {
  id: string;
  kind: "word" | "passage";
  /** 单词卡为词条原形，摘录卡为原文。 */
  front: string;
  /** 释义、译文或笔记。 */
  back: string;
  /** 单词卡为所在原句，摘录卡为所在段落。 */
  context: string;
  /** 原句中实际出现的写法，复习时据此标出单词。 */
  term: string;
  /** 单词卡收藏的义项，如「n. 绕路」；为空表示整个词条。 */
  sense?: string;
  source: {
    bookId: string;
    revision: string;
    chapter: string;
    block: string;
    title: string;
    chapterTitle: string;
  } | null;
  createdAt: number;
  due: number;
  /** FSRS 记忆状态，时间均为毫秒时间戳。 */
  memory: {
    stability: number;
    difficulty: number;
    scheduled_days: number;
    learning_steps: number;
    reps: number;
    lapses: number;
    state: 0 | 1 | 2 | 3;
    last_review: number | null;
  };
  /** 仅出现在复习队列中：依次为忘了、模糊、记得、简单后的下次到期时间。 */
  preview?: number[];
};
export type ReviewStats = { total: number; due: number; next: number | null };
export type Library = {
  version: 1;
  books: Book[];
  roots: string[];
  annotations: Annotation[];
};
export type ParsedBook = {
  title: string;
  author: string;
  language: string;
  cover?: string;
  chapters: Chapter[];
};
export type Request = { action: string; [key: string]: unknown };
export type DictEntry = {
  word: string;
  phonetic: string;
  translation: string[];
  definition: string[];
  tags: string[];
  collins: number;
  oxford: boolean;
  forms: { type: string; word: string }[];
  /** 查询词经词形变化得到本词条时，记录原查询词与变化类型。 */
  via?: { word: string; types: string[] };
};
export type DictStatus = {
  installed: boolean;
  entries: number;
  source: string;
  builtAt: number;
  defaultUrl: string;
  job: {
    running: boolean;
    phase: "" | "download" | "build";
    received: number;
    total: number;
    error: string;
  };
};
export type AssistRequest = {
  kind: "translate" | "explain";
  text: string;
  context?: string;
};
export type AssistChunk =
  | { type: "delta"; text: string }
  | { type: "done"; model: string; cached: boolean }
  | { type: "error"; message: string };
