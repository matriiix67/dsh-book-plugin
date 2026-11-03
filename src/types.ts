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
