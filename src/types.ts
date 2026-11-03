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
