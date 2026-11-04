import {
  mkdir,
  readFile,
  writeFile,
  rename,
  stat,
  readdir,
  copyFile,
  rm,
  appendFile,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import type {
  Book,
  Library,
  Chapter,
  ParsedBook,
  Annotation,
  Request,
  Hit,
  ReviewCard,
} from "../types";
import { ReviewDeck } from "./review";
import { isTerm, sentenceOf } from "../text";
const supported = new Set([
  ".epub",
  ".md",
  ".markdown",
  ".txt",
  ".html",
  ".htm",
]);
// 扫描目录时不收 HTML：目录里的网页多半是附件或说明文档，单独导入即可。
const scanned = new Set([".epub", ".md", ".markdown", ".txt"]);
const MAX_BYTES = 64 * 1024 * 1024;
const WEB_MAX_BYTES = 20 * 1024 * 1024;
const BROWSER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
export class BookshelfLibrary {
  state: Library = { version: 1, books: [], roots: [], annotations: [] };
  job = {
    running: false,
    total: 0,
    done: 0,
    imported: 0,
    skipped: 0,
    errors: [] as string[],
    current: "",
  };
  private writes = Promise.resolve();
  private imports: Promise<unknown> = Promise.resolve();
  private activeWorkers = new Set<Worker>();
  private disposed = false;
  private uploads = new Map<
    string,
    {
      filename: string;
      file: string;
      size: number;
      received: number;
      time: number;
    }
  >();
  readonly ready: Promise<void>;
  readonly review: ReviewDeck;
  constructor(readonly root: string) {
    this.review = new ReviewDeck(root);
    this.ready = this.load();
    this.ready.catch(() => {});
  }
  private async load() {
    await mkdir(this.root, { recursive: true });
    try {
      const value = JSON.parse(
        await readFile(path.join(this.root, "library.json"), "utf8"),
      );
      if (value.version !== 1) throw new Error("书库数据版本与插件版本不匹配");
      this.state = value;
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
    await mkdir(path.join(this.root, "uploads"), { recursive: true });
    await this.review.load();
  }
  private persist() {
    const snapshot = JSON.stringify(this.state);
    const run = this.writes
      .catch(() => {})
      .then(async () => {
        const target = path.join(this.root, "library.json");
        await writeFile(target + ".tmp", snapshot);
        await rename(target + ".tmp", target);
      });
    this.writes = run;
    return run;
  }
  private book(id: unknown) {
    const book = this.state.books.find((b) => b.id === id && !b.removed);
    if (!book) throw new Error("书籍已移出书架，请刷新书库");
    return book;
  }
  async chapter(bookId: unknown, chapterId: unknown) {
    const book = this.book(bookId);
    if (!book.chapters.some((c) => c.id === chapterId))
      throw new Error("章节不存在");
    return JSON.parse(
      await readFile(
        path.join(
          this.root,
          "books",
          book.id,
          book.revision,
          String(chapterId) + ".json",
        ),
        "utf8",
      ),
    ) as Chapter;
  }
  private async parse(file: string, name: string): Promise<ParsedBook> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL("./parse-worker.js", import.meta.url), {
        workerData: { path: file, name },
        resourceLimits: { maxOldGenerationSizeMb: 384 },
      });
      this.activeWorkers.add(worker);
      const timer = setTimeout(() => {
        void worker.terminate();
        reject(new Error("书籍解析超时，请检查文件"));
      }, 45000);
      const cleanup = () => {
        clearTimeout(timer);
        this.activeWorkers.delete(worker);
      };
      worker.once("message", (msg) => {
        cleanup();
        msg.ok ? resolve(msg.value) : reject(new Error(msg.error));
      });
      worker.once("error", (e) => {
        cleanup();
        reject(e);
      });
      worker.once("exit", (code) => {
        cleanup();
        if (code !== 0) reject(new Error("书籍解析进程已结束"));
      });
    });
  }
  private importFile(file: string, name = path.basename(file), source = file) {
    const run = this.imports
      .catch(() => {})
      .then(() => this.doImportFile(file, name, source));
    this.imports = run;
    return run;
  }
  private async doImportFile(file: string, name: string, source: string) {
    const info = await stat(file);
    if (!supported.has(path.extname(name).toLowerCase()))
      throw new Error("请选择 EPUB、Markdown、UTF-8 TXT 或 HTML 文件");
    if (info.size > MAX_BYTES) throw new Error("单本书籍支持 64 MB 以内");
    if (info.size === 0) throw new Error("文件内容为空");
    const existing = this.state.books.find((b) => b.source === source);
    const restoring = existing?.removed === true;
    if (existing?.removed) {
      existing.removed = false;
      await this.persist();
    }
    if (
      existing &&
      existing.size === info.size &&
      existing.mtime === info.mtimeMs
    )
      return restoring ? "imported" : "skipped";
    const revision = createHash("sha256")
      .update(await readFile(file))
      .digest("hex")
      .slice(0, 24);
    const duplicate = this.state.books.find((b) => b.revision === revision);
    if (duplicate) {
      if (duplicate.removed) {
        duplicate.removed = false;
        await this.persist();
        return "imported";
      }
      return "skipped";
    }
    const parsed = await this.parse(file, name);
    if (this.disposed) throw new Error("插件已卸载");
    if (!parsed.chapters.length) throw new Error("文件中缺少可阅读正文");
    const id = existing?.id || revision;
    const bookDir = path.join(this.root, "books", id, revision);
    await mkdir(bookDir, { recursive: true });
    await copyFile(
      file,
      path.join(bookDir, "original" + path.extname(name).toLowerCase()),
    );
    for (const chapter of parsed.chapters)
      await writeFile(
        path.join(bookDir, chapter.id + ".json"),
        JSON.stringify(chapter),
      );
    await writeFile(
      path.join(bookDir, "search.json"),
      JSON.stringify(
        parsed.chapters.flatMap((c) =>
          c.blocks
            .filter((b) => b.text)
            .map((b) => ({
              chapter: c.id,
              chapterTitle: c.title,
              block: b.id,
              text: b.text,
            })),
        ),
      ),
    );
    if (parsed.cover)
      await writeFile(path.join(bookDir, "cover.txt"), parsed.cover);
    const now = Date.now();
    const book: Book = {
      id,
      revision,
      title: existing?.title || parsed.title,
      author: existing?.author || parsed.author,
      language: parsed.language,
      format: path.extname(name).slice(1).toUpperCase(),
      tags: existing?.tags || [],
      status: existing?.status || "unread",
      source,
      size: info.size,
      mtime: info.mtimeMs,
      addedAt: existing?.addedAt || now,
      updatedAt: now,
      cover: parsed.cover ? "available" : undefined,
      chapters: parsed.chapters.map((c) => ({
        id: c.id,
        title: c.title,
        length: c.blocks.length,
      })),
      progress: existing?.progress || {
        chapter: parsed.chapters[0].id,
        block: "p0",
        ratio: 0,
      },
      lastReadAt: existing?.lastReadAt || 0,
    };
    this.state.books = [book, ...this.state.books.filter((b) => b.id !== id)];
    await this.persist();
    return "imported";
  }
  /** 下载网页按单页 HTML 导入；同一链接再次导入时更新为最新内容。 */
  private async importURL(link: string) {
    const url = new URL(link);
    url.hash = "";
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "user-agent": BROWSER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(30000),
      });
    } catch (e) {
      throw new Error(
        (e as Error).name === "TimeoutError" ? "网页下载超时" : "无法访问网页",
      );
    }
    if (!response.ok) throw new Error(`网页返回 ${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (!/html|xml/i.test(type)) throw new Error("链接不是网页");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > WEB_MAX_BYTES) throw new Error("网页超过 20 MB");
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks);
    // 统一转成 UTF-8 保存，并记下网页地址，供解析时补全相对链接。
    const charset =
      type.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] ||
      bytes
        .subarray(0, 4096)
        .toString("latin1")
        .match(/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i)?.[1] ||
      "utf-8";
    let html: string;
    try {
      html = new TextDecoder(charset).decode(bytes);
    } catch {
      html = new TextDecoder().decode(bytes);
    }
    // 注释、脚本和样式常带时间戳或随机值，去掉后同一网页再次导入才能识别为未变化。
    html = html.replace(
      /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>/gi,
      "",
    );
    const href = response.url
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;");
    const file = path.join(this.root, "uploads", randomUUID() + ".html");
    await writeFile(
      file,
      `<meta charset="utf-8"><base href="${href}">\n${html}`,
    );
    try {
      return await this.importFile(file, `${url.hostname}.html`, url.href);
    } finally {
      await rm(file, { force: true });
    }
  }
  private async discover(target: string, files: string[], depth = 0) {
    if (depth > 16 || files.length >= 10000) return;
    const info = await stat(target);
    if (info.isFile()) {
      if (supported.has(path.extname(target).toLowerCase())) files.push(target);
      return;
    }
    if (!info.isDirectory()) return;
    for (const item of await readdir(target, { withFileTypes: true })) {
      if (
        item.name.startsWith(".") ||
        item.name === "node_modules" ||
        item.isSymbolicLink()
      )
        continue;
      const next = path.join(target, item.name);
      if (item.isDirectory()) await this.discover(next, files, depth + 1);
      else if (
        item.isFile() &&
        scanned.has(path.extname(item.name).toLowerCase())
      )
        files.push(next);
    }
  }
  startImport(targets: string[]) {
    if (this.job.running) throw new Error("书库正在扫描，完成后可继续导入");
    this.job = {
      running: true,
      total: 0,
      done: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      current: "正在查找书籍",
    };
    void (async () => {
      const files: string[] = [],
        links: string[] = [];
      for (const target of targets) {
        try {
          if (/^https?:\/\//i.test(target)) {
            links.push(new URL(target).href);
            continue;
          }
          if (!path.isAbsolute(target))
            throw new Error("请填写本地绝对路径或网页链接");
          await this.discover(target, files);
          const info = await stat(target);
          if (info.isDirectory() && !this.state.roots.includes(target))
            this.state.roots.push(target);
        } catch (e) {
          this.job.errors.push(`${target}：${(e as Error).message}`);
        }
      }
      const unique = [...new Set(files)];
      this.job.total = unique.length + links.length;
      for (const file of unique) {
        if (this.disposed) break;
        this.job.current = path.basename(file);
        try {
          const result = await this.importFile(file);
          this.job[result]++;
        } catch (e) {
          this.job.errors.push(
            `${path.basename(file)}：${(e as Error).message}`,
          );
        }
        this.job.done++;
      }
      for (const link of links) {
        if (this.disposed) break;
        this.job.current = new URL(link).hostname;
        try {
          this.job[await this.importURL(link)]++;
        } catch (e) {
          this.job.errors.push(`${link}：${(e as Error).message}`);
        }
        this.job.done++;
      }
      await this.persist();
    })()
      .catch((e) => this.job.errors.push(e.message))
      .finally(() => {
        this.job.running = false;
        this.job.current = "";
      });
    return this.job;
  }
  async search(query: string, bookId?: string): Promise<Hit[]> {
    const terms = query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 8);
    if (!terms.length) return [];
    const hits: Hit[] = [];
    const books = bookId
      ? [this.book(bookId)]
      : this.state.books.filter((b) => !b.removed);
    for (const book of books) {
      const index = JSON.parse(
        await readFile(
          path.join(this.root, "books", book.id, book.revision, "search.json"),
          "utf8",
        ),
      ) as {
        chapter: string;
        chapterTitle: string;
        block: string;
        text: string;
      }[];
      for (const block of index) {
        const text = block.text.toLocaleLowerCase();
        if (terms.every((t) => text.includes(t))) {
          const at = text.indexOf(terms[0]);
          hits.push({
            bookId: book.id,
            title: book.title,
            chapter: block.chapter,
            chapterTitle: block.chapterTitle,
            block: block.block,
            text: block.text.slice(Math.max(0, at - 70), at + 360),
            revision: book.revision,
            url: `bookshelf://${book.id}/${block.chapter}/${block.block}?revision=${book.revision}`,
          });
          if (hits.length >= 40) return hits;
        }
      }
      await new Promise((r) => setImmediate(r));
    }
    return hits;
  }
  private async blockText(source: NonNullable<ReviewCard["source"]>) {
    const chapter = await this.chapter(source.bookId, source.chapter);
    return chapter.blocks.find((p) => p.id === source.block)?.text || "";
  }
  /** 收藏到复习：单词卡附上所在原句，摘录卡附上所在段落。 */
  private async collect(input: Request) {
    const kind = input.kind === "word" ? "word" : "passage";
    const front = String(input.front ?? input.quote ?? "").slice(0, 4000);
    const term = String(input.term || "").slice(0, 200);
    let source: ReviewCard["source"] = null,
      context = String(input.context || "").slice(0, 2000);
    if (input.bookId) {
      const b = this.book(input.bookId);
      const chapter = b.chapters.find((c) => c.id === input.chapter);
      if (!chapter) throw new Error("章节不存在");
      source = {
        bookId: b.id,
        revision: b.revision,
        chapter: chapter.id,
        block: String(input.block || "p0"),
        title: b.title,
        chapterTitle: chapter.title,
      };
      if (!context) {
        const text = await this.blockText(source);
        context = (
          kind === "word" ? sentenceOf(text, term || front) : text
        ).slice(0, 2000);
      }
    }
    return this.review.collect({
      kind,
      front,
      back: String(input.back ?? input.note ?? "").slice(0, 12000),
      context,
      term,
      sense: kind === "word" ? String(input.sense || "").slice(0, 2000) : "",
      source,
    });
  }
  /** 把已有高亮笔记转成复习卡：查词笔记成为单词卡，其余成为摘录卡。 */
  private async importNotes() {
    let imported = 0;
    for (const a of this.state.annotations) {
      if (a.kind !== "highlight" || !a.note.trim()) continue;
      const book = this.state.books.find(
        (b) => b.id === a.bookId && !b.removed,
      );
      const [head, ...rest] = a.note.split("\n");
      const entry = isTerm(a.quote)
        ? head.match(/^([A-Za-z][A-Za-z'’ .-]*?)(?: (\/[^/]*\/))?$/)
        : null;
      try {
        const { created } = await this.collect({
          action: "collect",
          kind: entry ? "word" : "passage",
          front: entry ? entry[1] : a.quote,
          back: entry
            ? [entry[2], rest.join("\n").split("\n\n")[0]]
                .filter(Boolean)
                .join("\n")
            : a.note,
          term: entry ? a.quote : "",
          bookId: book && book.revision === a.revision ? book.id : undefined,
          chapter: a.chapter,
          block: a.block,
        });
        if (created) imported++;
      } catch {
        // 出处失效的笔记跳过，不影响其他笔记导入。
      }
    }
    return imported;
  }
  async call(input: Request): Promise<any> {
    await this.ready;
    switch (input.action) {
      case "assistantSession": {
        const state = this.state as Library & {
          sessions?: Record<string, string>;
        };
        state.sessions ??= {};
        const key = String(input.bookId || "library");
        if (input.sessionId) {
          state.sessions[key] = String(input.sessionId);
          await this.persist();
        }
        return { sessionId: state.sessions[key] || null, cwd: this.root };
      }
      case "list":
        return {
          books: this.state.books.filter((b) => !b.removed),
          roots: this.state.roots,
          job: this.job,
        };
      case "import":
        return this.startImport((input.paths as string[]).slice(0, 100));
      case "removeRoot":
        this.state.roots = this.state.roots.filter(
          (root) => root !== input.path,
        );
        await this.persist();
        return { ok: true };
      case "scan":
        return this.startImport([...this.state.roots]);
      case "job":
        return this.job;
      case "chapter":
        return this.chapter(input.bookId, input.chapter);
      case "cover": {
        const b = this.book(input.bookId);
        return b.cover
          ? readFile(
              path.join(this.root, "books", b.id, b.revision, "cover.txt"),
              "utf8",
            )
          : null;
      }
      case "search":
        return this.search(
          String(input.query || ""),
          input.bookId as string | undefined,
        );
      case "update": {
        const b = this.book(input.bookId);
        const fields = input.fields as any;
        if (fields.title !== undefined)
          b.title = String(fields.title).trim().slice(0, 300) || b.title;
        if (fields.author !== undefined)
          b.author = String(fields.author).slice(0, 300);
        if (fields.tags !== undefined)
          b.tags = (fields.tags as string[])
            .map(String)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 20);
        if (["unread", "reading", "finished"].includes(fields.status))
          b.status = fields.status;
        await this.persist();
        return b;
      }
      case "progress": {
        const b = this.book(input.bookId);
        if (!b.chapters.some((c) => c.id === input.chapter))
          throw new Error("章节不存在");
        b.progress = {
          chapter: String(input.chapter),
          block: String(input.block),
          ratio: Math.max(0, Math.min(1, Number(input.ratio) || 0)),
        };
        b.lastReadAt = Date.now();
        if (b.status === "unread") b.status = "reading";
        await this.persist();
        return b.progress;
      }
      case "annotations":
        return this.state.annotations.filter((a) => a.bookId === input.bookId);
      case "annotate": {
        const b = this.book(input.bookId);
        const chapter = await this.chapter(b.id, input.chapter);
        if (!chapter.blocks.some((p) => p.id === input.block))
          throw new Error("段落不存在");
        // 同一段落只保留一个书签，重复添加时返回已有书签。
        const marked =
          input.kind === "bookmark" &&
          this.state.annotations.find(
            (a) =>
              a.kind === "bookmark" &&
              a.bookId === b.id &&
              a.revision === b.revision &&
              a.chapter === chapter.id &&
              a.block === input.block,
          );
        if (marked) return marked;
        const annotation: Annotation = {
          id: randomUUID(),
          bookId: b.id,
          revision: b.revision,
          chapter: chapter.id,
          block: String(input.block),
          quote: String(input.quote || "").slice(0, 4000),
          note: String(input.note || "").slice(0, 12000),
          kind: input.kind === "bookmark" ? "bookmark" : "highlight",
          createdAt: Date.now(),
        };
        this.state.annotations.push(annotation);
        await this.persist();
        return annotation;
      }
      case "editNote": {
        const annotation = this.state.annotations.find(
          (a) => a.id === input.id,
        );
        if (!annotation) throw new Error("笔记不存在");
        annotation.note = String(input.note || "").slice(0, 12000);
        await this.persist();
        return annotation;
      }
      case "removeAnnotation":
        this.state.annotations = this.state.annotations.filter(
          (a) => a.id !== input.id,
        );
        await this.persist();
        return { ok: true };
      case "remove":
        this.book(input.bookId).removed = true;
        await this.persist();
        return { ok: true };
      case "uploadStart": {
        const size = Number(input.size);
        if (!(size > 0 && size <= MAX_BYTES))
          throw new Error("请选择 64 MB 以内的书籍");
        for (const [id, u] of this.uploads) {
          if (Date.now() - u.time > 3600000) {
            await rm(u.file, { force: true });
            this.uploads.delete(id);
          }
        }
        const id = randomUUID();
        const filename = path.basename(String(input.filename));
        if (!supported.has(path.extname(filename).toLowerCase()))
          throw new Error("请选择 EPUB、Markdown、TXT 或 HTML");
        const file = path.join(this.root, "uploads", id);
        await writeFile(file, "");
        this.uploads.set(id, {
          filename,
          file,
          size,
          received: 0,
          time: Date.now(),
        });
        return { id };
      }
      case "uploadChunk": {
        const u = this.uploads.get(String(input.id));
        if (!u) throw new Error("导入已过期，请重新选择文件");
        const chunk = Buffer.from(String(input.data), "base64");
        if (chunk.length > 768 * 1024 || u.received + chunk.length > u.size)
          throw new Error("上传数据大小异常");
        await appendFile(u.file, chunk);
        u.received += chunk.length;
        u.time = Date.now();
        return { received: u.received };
      }
      case "uploadFinish": {
        const id = String(input.id),
          u = this.uploads.get(id);
        if (!u || u.received !== u.size) throw new Error("文件传输尚未完成");
        if (this.job.running) throw new Error("书库正在扫描，请稍后继续");
        try {
          return {
            result: await this.importFile(
              u.file,
              u.filename,
              "upload:" + u.filename,
            ),
          };
        } finally {
          this.uploads.delete(id);
          await rm(u.file, { force: true });
        }
      }
      case "collect":
        return this.collect(input);
      case "cards":
        return {
          ...this.review.stats(),
          cards: this.review.list(input.due === true),
        };
      case "reviewStats":
        return this.review.stats();
      case "grade":
        return this.review.grade(String(input.id), Number(input.rating));
      case "uncollect":
        await this.review.remove(String(input.id));
        return { ok: true };
      case "importNotes":
        return { imported: await this.importNotes() };
      case "exportNotes": {
        const b = this.book(input.bookId);
        return (
          `# ${b.title} · 阅读笔记\n\n` +
          this.state.annotations
            .filter((a) => a.bookId === b.id)
            .map(
              (a) =>
                `## ${b.chapters.find((c) => c.id === a.chapter)?.title || a.chapter}\n\n> ${a.quote.replaceAll("\n", "\n> ")}\n\n${a.note}\n\n[回到原文](bookshelf://${b.id}/${a.chapter}/${a.block}?revision=${a.revision})\n`,
            )
            .join("\n")
        );
      }
      default:
        throw new Error("未知的书架操作");
    }
  }
  async dispose() {
    this.disposed = true;
    for (const worker of this.activeWorkers) await worker.terminate();
    await this.imports.catch(() => {});
    await this.writes;
    await this.review.dispose();
  }
}
