// src/host/library.ts
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  stat,
  readdir,
  copyFile,
  rm,
  appendFile
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
var supported = /* @__PURE__ */ new Set([".epub", ".md", ".markdown", ".txt"]);
var MAX_BYTES = 64 * 1024 * 1024;
var BookshelfLibrary = class {
  constructor(root) {
    this.root = root;
    this.ready = this.load();
    this.ready.catch(() => {
    });
  }
  state = { version: 1, books: [], roots: [], annotations: [] };
  job = {
    running: false,
    total: 0,
    done: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    current: ""
  };
  writes = Promise.resolve();
  imports = Promise.resolve();
  activeWorkers = /* @__PURE__ */ new Set();
  disposed = false;
  uploads = /* @__PURE__ */ new Map();
  ready;
  async load() {
    await mkdir(this.root, { recursive: true });
    try {
      const value = JSON.parse(
        await readFile(path.join(this.root, "library.json"), "utf8")
      );
      if (value.version !== 1) throw new Error("\u4E66\u5E93\u6570\u636E\u7248\u672C\u4E0E\u63D2\u4EF6\u7248\u672C\u4E0D\u5339\u914D");
      this.state = value;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    await mkdir(path.join(this.root, "uploads"), { recursive: true });
  }
  persist() {
    const snapshot = JSON.stringify(this.state);
    const run = this.writes.catch(() => {
    }).then(async () => {
      const target = path.join(this.root, "library.json");
      await writeFile(target + ".tmp", snapshot);
      await rename(target + ".tmp", target);
    });
    this.writes = run;
    return run;
  }
  book(id) {
    const book = this.state.books.find((b) => b.id === id && !b.removed);
    if (!book) throw new Error("\u4E66\u7C4D\u5DF2\u79FB\u51FA\u4E66\u67B6\uFF0C\u8BF7\u5237\u65B0\u4E66\u5E93");
    return book;
  }
  async chapter(bookId, chapterId) {
    const book = this.book(bookId);
    if (!book.chapters.some((c) => c.id === chapterId))
      throw new Error("\u7AE0\u8282\u4E0D\u5B58\u5728");
    return JSON.parse(
      await readFile(
        path.join(
          this.root,
          "books",
          book.id,
          book.revision,
          String(chapterId) + ".json"
        ),
        "utf8"
      )
    );
  }
  async parse(file, name) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL("./parse-worker.js", import.meta.url), {
        workerData: { path: file, name },
        resourceLimits: { maxOldGenerationSizeMb: 384 }
      });
      this.activeWorkers.add(worker);
      const timer = setTimeout(() => {
        void worker.terminate();
        reject(new Error("\u4E66\u7C4D\u89E3\u6790\u8D85\u65F6\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6"));
      }, 45e3);
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
        if (code !== 0) reject(new Error("\u4E66\u7C4D\u89E3\u6790\u8FDB\u7A0B\u5DF2\u7ED3\u675F"));
      });
    });
  }
  importFile(file, name = path.basename(file), source = file) {
    const run = this.imports.catch(() => {
    }).then(() => this.doImportFile(file, name, source));
    this.imports = run;
    return run;
  }
  async doImportFile(file, name, source) {
    const info = await stat(file);
    if (!supported.has(path.extname(name).toLowerCase()))
      throw new Error("\u8BF7\u9009\u62E9 EPUB\u3001Markdown \u6216 UTF-8 TXT \u6587\u4EF6");
    if (info.size > MAX_BYTES) throw new Error("\u5355\u672C\u4E66\u7C4D\u652F\u6301 64 MB \u4EE5\u5185");
    if (info.size === 0) throw new Error("\u6587\u4EF6\u5185\u5BB9\u4E3A\u7A7A");
    const existing = this.state.books.find((b) => b.source === source);
    const restoring = existing?.removed === true;
    if (existing?.removed) {
      existing.removed = false;
      await this.persist();
    }
    if (existing && existing.size === info.size && existing.mtime === info.mtimeMs)
      return restoring ? "imported" : "skipped";
    const revision = createHash("sha256").update(await readFile(file)).digest("hex").slice(0, 24);
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
    if (this.disposed) throw new Error("\u63D2\u4EF6\u5DF2\u5378\u8F7D");
    if (!parsed.chapters.length) throw new Error("\u6587\u4EF6\u4E2D\u7F3A\u5C11\u53EF\u9605\u8BFB\u6B63\u6587");
    const id = existing?.id || revision;
    const bookDir = path.join(this.root, "books", id, revision);
    await mkdir(bookDir, { recursive: true });
    await copyFile(
      file,
      path.join(bookDir, "original" + path.extname(name).toLowerCase())
    );
    for (const chapter of parsed.chapters)
      await writeFile(
        path.join(bookDir, chapter.id + ".json"),
        JSON.stringify(chapter)
      );
    await writeFile(
      path.join(bookDir, "search.json"),
      JSON.stringify(
        parsed.chapters.flatMap(
          (c) => c.blocks.filter((b) => b.text).map((b) => ({
            chapter: c.id,
            chapterTitle: c.title,
            block: b.id,
            text: b.text
          }))
        )
      )
    );
    if (parsed.cover)
      await writeFile(path.join(bookDir, "cover.txt"), parsed.cover);
    const now = Date.now();
    const book = {
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
      cover: parsed.cover ? "available" : void 0,
      chapters: parsed.chapters.map((c) => ({
        id: c.id,
        title: c.title,
        length: c.blocks.length
      })),
      progress: existing?.progress || {
        chapter: parsed.chapters[0].id,
        block: "p0",
        ratio: 0
      },
      lastReadAt: existing?.lastReadAt || 0
    };
    this.state.books = [book, ...this.state.books.filter((b) => b.id !== id)];
    await this.persist();
    return "imported";
  }
  async discover(target, files, depth = 0) {
    if (depth > 16 || files.length >= 1e4) return;
    const info = await stat(target);
    if (info.isFile()) {
      if (supported.has(path.extname(target).toLowerCase())) files.push(target);
      return;
    }
    if (!info.isDirectory()) return;
    for (const item of await readdir(target, { withFileTypes: true })) {
      if (item.name.startsWith(".") || item.name === "node_modules" || item.isSymbolicLink())
        continue;
      const next = path.join(target, item.name);
      if (item.isDirectory()) await this.discover(next, files, depth + 1);
      else if (item.isFile() && supported.has(path.extname(item.name).toLowerCase()))
        files.push(next);
    }
  }
  startImport(targets) {
    if (this.job.running) throw new Error("\u4E66\u5E93\u6B63\u5728\u626B\u63CF\uFF0C\u5B8C\u6210\u540E\u53EF\u7EE7\u7EED\u5BFC\u5165");
    this.job = {
      running: true,
      total: 0,
      done: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      current: "\u6B63\u5728\u67E5\u627E\u4E66\u7C4D"
    };
    void (async () => {
      const files = [];
      for (const target of targets) {
        try {
          if (!path.isAbsolute(target)) throw new Error("\u8BF7\u586B\u5199\u672C\u5730\u7EDD\u5BF9\u8DEF\u5F84");
          await this.discover(target, files);
          const info = await stat(target);
          if (info.isDirectory() && !this.state.roots.includes(target))
            this.state.roots.push(target);
        } catch (e) {
          this.job.errors.push(`${target}\uFF1A${e.message}`);
        }
      }
      const unique = [...new Set(files)];
      this.job.total = unique.length;
      for (const file of unique) {
        if (this.disposed) break;
        this.job.current = path.basename(file);
        try {
          const result = await this.importFile(file);
          this.job[result]++;
        } catch (e) {
          this.job.errors.push(
            `${path.basename(file)}\uFF1A${e.message}`
          );
        }
        this.job.done++;
      }
      await this.persist();
    })().catch((e) => this.job.errors.push(e.message)).finally(() => {
      this.job.running = false;
      this.job.current = "";
    });
    return this.job;
  }
  async search(query, bookId) {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
    if (!terms.length) return [];
    const hits = [];
    const books = bookId ? [this.book(bookId)] : this.state.books.filter((b) => !b.removed);
    for (const book of books) {
      const index = JSON.parse(
        await readFile(
          path.join(this.root, "books", book.id, book.revision, "search.json"),
          "utf8"
        )
      );
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
            url: `bookshelf://${book.id}/${block.chapter}/${block.block}?revision=${book.revision}`
          });
          if (hits.length >= 40) return hits;
        }
      }
      await new Promise((r) => setImmediate(r));
    }
    return hits;
  }
  async call(input) {
    await this.ready;
    switch (input.action) {
      case "assistantSession": {
        const state = this.state;
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
          job: this.job
        };
      case "import":
        return this.startImport(input.paths.slice(0, 100));
      case "removeRoot":
        this.state.roots = this.state.roots.filter(
          (root) => root !== input.path
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
        return b.cover ? readFile(
          path.join(this.root, "books", b.id, b.revision, "cover.txt"),
          "utf8"
        ) : null;
      }
      case "search":
        return this.search(
          String(input.query || ""),
          input.bookId
        );
      case "update": {
        const b = this.book(input.bookId);
        const fields = input.fields;
        if (fields.title !== void 0)
          b.title = String(fields.title).trim().slice(0, 300) || b.title;
        if (fields.author !== void 0)
          b.author = String(fields.author).slice(0, 300);
        if (fields.tags !== void 0)
          b.tags = fields.tags.map(String).map((t) => t.trim()).filter(Boolean).slice(0, 20);
        if (["unread", "reading", "finished"].includes(fields.status))
          b.status = fields.status;
        await this.persist();
        return b;
      }
      case "progress": {
        const b = this.book(input.bookId);
        if (!b.chapters.some((c) => c.id === input.chapter))
          throw new Error("\u7AE0\u8282\u4E0D\u5B58\u5728");
        b.progress = {
          chapter: String(input.chapter),
          block: String(input.block),
          ratio: Math.max(0, Math.min(1, Number(input.ratio) || 0))
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
          throw new Error("\u6BB5\u843D\u4E0D\u5B58\u5728");
        const annotation = {
          id: randomUUID(),
          bookId: b.id,
          revision: b.revision,
          chapter: chapter.id,
          block: String(input.block),
          quote: String(input.quote || "").slice(0, 4e3),
          note: String(input.note || "").slice(0, 12e3),
          kind: input.kind === "bookmark" ? "bookmark" : "highlight",
          createdAt: Date.now()
        };
        this.state.annotations.push(annotation);
        await this.persist();
        return annotation;
      }
      case "editNote": {
        const annotation = this.state.annotations.find(
          (a) => a.id === input.id
        );
        if (!annotation) throw new Error("\u7B14\u8BB0\u4E0D\u5B58\u5728");
        annotation.note = String(input.note || "").slice(0, 12e3);
        await this.persist();
        return annotation;
      }
      case "removeAnnotation":
        this.state.annotations = this.state.annotations.filter(
          (a) => a.id !== input.id
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
          throw new Error("\u8BF7\u9009\u62E9 64 MB \u4EE5\u5185\u7684\u4E66\u7C4D");
        for (const [id2, u] of this.uploads) {
          if (Date.now() - u.time > 36e5) {
            await rm(u.file, { force: true });
            this.uploads.delete(id2);
          }
        }
        const id = randomUUID();
        const filename = path.basename(String(input.filename));
        if (!supported.has(path.extname(filename).toLowerCase()))
          throw new Error("\u8BF7\u9009\u62E9 EPUB\u3001Markdown \u6216 TXT");
        const file = path.join(this.root, "uploads", id);
        await writeFile(file, "");
        this.uploads.set(id, {
          filename,
          file,
          size,
          received: 0,
          time: Date.now()
        });
        return { id };
      }
      case "uploadChunk": {
        const u = this.uploads.get(String(input.id));
        if (!u) throw new Error("\u5BFC\u5165\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6587\u4EF6");
        const chunk = Buffer.from(String(input.data), "base64");
        if (chunk.length > 768 * 1024 || u.received + chunk.length > u.size)
          throw new Error("\u4E0A\u4F20\u6570\u636E\u5927\u5C0F\u5F02\u5E38");
        await appendFile(u.file, chunk);
        u.received += chunk.length;
        u.time = Date.now();
        return { received: u.received };
      }
      case "uploadFinish": {
        const id = String(input.id), u = this.uploads.get(id);
        if (!u || u.received !== u.size) throw new Error("\u6587\u4EF6\u4F20\u8F93\u5C1A\u672A\u5B8C\u6210");
        if (this.job.running) throw new Error("\u4E66\u5E93\u6B63\u5728\u626B\u63CF\uFF0C\u8BF7\u7A0D\u540E\u7EE7\u7EED");
        try {
          return {
            result: await this.importFile(
              u.file,
              u.filename,
              "upload:" + u.filename
            )
          };
        } finally {
          this.uploads.delete(id);
          await rm(u.file, { force: true });
        }
      }
      case "exportNotes": {
        const b = this.book(input.bookId);
        return `# ${b.title} \xB7 \u9605\u8BFB\u7B14\u8BB0

` + this.state.annotations.filter((a) => a.bookId === b.id).map(
          (a) => `## ${b.chapters.find((c) => c.id === a.chapter)?.title || a.chapter}

> ${a.quote.replaceAll("\n", "\n> ")}

${a.note}

[\u56DE\u5230\u539F\u6587](bookshelf://${b.id}/${a.chapter}/${a.block}?revision=${a.revision})
`
        ).join("\n");
      }
      default:
        throw new Error("\u672A\u77E5\u7684\u4E66\u67B6\u64CD\u4F5C");
    }
  }
  async dispose() {
    this.disposed = true;
    for (const worker of this.activeWorkers) await worker.terminate();
    await this.imports.catch(() => {
    });
    await this.writes;
  }
};
export {
  BookshelfLibrary
};
