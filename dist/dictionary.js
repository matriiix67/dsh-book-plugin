// src/host/dictionary.ts
import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  open
} from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";

// src/host/dict-build.ts
var DICT_FILES = {
  data: "entries.tsv",
  index: "entries.idx",
  meta: "meta.json"
};
var FORM_TYPES = /* @__PURE__ */ new Set(["p", "d", "i", "3", "r", "t", "s"]);
function dictKey(word) {
  return word.normalize("NFKC").replace(/[’‘]/g, "'").trim().toLowerCase();
}
var lines = (value) => value.split("\\n").map((s) => s.trim()).filter(Boolean);
function parseDictLine(line) {
  const [key, word, ...rest] = line.split("	");
  if (word.startsWith("@"))
    return {
      key,
      alias: { base: word.slice(1), types: (rest[0] || "").split(",") }
    };
  const [phonetic, translation, definition, tag, collins, oxford, exchange] = rest;
  const items = (exchange || "").split("/").map((item) => item.split(":")).filter(([type, value]) => type && value);
  const base = items.find(([type]) => type === "0")?.[1];
  return {
    key,
    entry: {
      word,
      phonetic: phonetic || "",
      translation: lines(translation || ""),
      definition: lines(definition || "").slice(0, 8),
      tags: (tag || "").split(" ").filter(Boolean),
      collins: Number(collins) || 0,
      oxford: oxford === "1",
      forms: items.filter(([type]) => FORM_TYPES.has(type)).map(([type, value]) => ({ type, word: value }))
    },
    lemma: base && dictKey(base) !== key ? {
      base,
      types: [...items.find(([type]) => type === "1")?.[1] || ""]
    } : void 0
  };
}

// src/host/dictionary.ts
var ECDICT_URL = "https://raw.githubusercontent.com/skywind3000/ECDICT/9c46923fb81a2eb6c264a3a1689562ea7bc56b6a/ecdict.csv";
var MAX_SOURCE = 320 * 1024 * 1024;
var C = "[b-df-hj-np-tv-z]";
var INFLECTIONS = [
  [/ies$/, "y", []],
  [/(s|x|z|ch|sh|o)es$/, "$1", []],
  [/(?<!s)s$/, "", []],
  [/ied$/, "y", ["p", "d"]],
  [new RegExp(`(${C})\\1ed$`), "$1", ["p", "d"]],
  [/ed$/, "e", ["p", "d"]],
  [/ed$/, "", ["p", "d"]],
  [new RegExp(`(${C})\\1ing$`), "$1", ["i"]],
  [/ing$/, "e", ["i"]],
  [/ing$/, "", ["i"]],
  [/ier$/, "y", ["r"]],
  [/iest$/, "y", ["t"]],
  [/er$/, "", ["r"]],
  [/est$/, "", ["t"]]
];
function stems(word) {
  const out = /* @__PURE__ */ new Map();
  for (const [pattern, replacement, types] of INFLECTIONS)
    if (pattern.test(word)) {
      const stem = word.replace(pattern, replacement);
      if (stem.length >= 2 && !out.has(stem)) out.set(stem, types);
    }
  return out;
}
var Dictionary = class {
  constructor(root, defaultUrl = ECDICT_URL) {
    this.defaultUrl = defaultUrl;
    this.dir = path.join(root, "dictionary");
    this.ready = this.load();
    this.ready.catch(() => {
    });
  }
  job = {
    running: false,
    phase: "",
    received: 0,
    total: 0,
    error: ""
  };
  meta = null;
  reader = null;
  worker = null;
  abort = new AbortController();
  dir;
  ready;
  async load() {
    try {
      this.meta = JSON.parse(
        await readFile(path.join(this.dir, "current", DICT_FILES.meta), "utf8")
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  status() {
    return {
      installed: !!this.meta,
      entries: this.meta?.entries || 0,
      source: this.meta?.source || "",
      builtAt: this.meta?.builtAt || 0,
      defaultUrl: this.defaultUrl,
      job: { ...this.job }
    };
  }
  start(task) {
    if (this.job.running) throw new Error("\u8BCD\u5178\u6B63\u5728\u5B89\u88C5\uFF0C\u8BF7\u7A0D\u5019");
    this.job = { running: true, phase: "", received: 0, total: 0, error: "" };
    void task().catch((e) => {
      if (!this.abort.signal.aborted)
        this.job.error = e instanceof Error ? e.message : String(e);
    }).finally(() => {
      this.job.running = false;
      this.job.phase = "";
    });
    return this.status();
  }
  install(url = this.defaultUrl) {
    const target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol))
      throw new Error("\u8BCD\u5178\u5730\u5740\u9700\u8981\u4EE5 http \u6216 https \u5F00\u5934");
    return this.start(async () => {
      await mkdir(this.dir, { recursive: true });
      const file = path.join(this.dir, `download-${randomUUID()}.csv`);
      try {
        await this.download(target, file);
        await this.build(file, target.href);
      } finally {
        await rm(file, { force: true });
      }
    });
  }
  importFile(file) {
    if (!path.isAbsolute(file)) throw new Error("\u8BF7\u586B\u5199\u8BCD\u5178\u6587\u4EF6\u7684\u672C\u5730\u7EDD\u5BF9\u8DEF\u5F84");
    return this.start(async () => {
      const info = await stat(file);
      if (!info.isFile()) throw new Error("\u8BF7\u9009\u62E9 ECDICT \u7684 CSV \u6587\u4EF6");
      if (info.size > MAX_SOURCE) throw new Error("\u8BCD\u5178\u6587\u4EF6\u8D85\u8FC7 320 MB");
      await this.build(file, file);
    });
  }
  async download(url, file) {
    this.job.phase = "download";
    let response;
    try {
      response = await fetch(url, { signal: this.abort.signal });
    } catch (e) {
      if (this.abort.signal.aborted) throw e;
      throw new Error(
        `\u65E0\u6CD5\u8FDE\u63A5\u8BCD\u5178\u4E0B\u8F7D\u5730\u5740\uFF08${e.message}\uFF09\u3002\u53EF\u5728\u63D2\u4EF6\u914D\u7F6E dictionaryUrl \u4E2D\u6539\u7528\u955C\u50CF\uFF0C\u6216\u4E0B\u8F7D ecdict.csv \u540E\u4ECE\u672C\u5730\u5BFC\u5165\u3002`
      );
    }
    if (!response.ok || !response.body)
      throw new Error(`\u8BCD\u5178\u4E0B\u8F7D\u5931\u8D25\uFF1AHTTP ${response.status}`);
    const encoding = response.headers.get("content-encoding");
    this.job.total = encoding && encoding !== "identity" ? 0 : Number(response.headers.get("content-length")) || 0;
    if (this.job.total > MAX_SOURCE) throw new Error("\u8BCD\u5178\u6587\u4EF6\u8D85\u8FC7 320 MB");
    const out = createWriteStream(file);
    try {
      for await (const chunk of response.body) {
        this.job.received += chunk.length;
        if (this.job.received > MAX_SOURCE)
          throw new Error("\u8BCD\u5178\u6587\u4EF6\u8D85\u8FC7 320 MB");
        if (!out.write(chunk)) await once(out, "drain");
      }
    } finally {
      await new Promise((resolve) => out.end(resolve));
    }
  }
  build(csv, source) {
    this.job.phase = "build";
    this.job.received = 0;
    this.job.total = 0;
    const out = path.join(this.dir, `build-${randomUUID()}`);
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL("./dict-worker.js", import.meta.url), {
        workerData: { csv, out, source },
        resourceLimits: { maxOldGenerationSizeMb: 512 }
      });
      this.worker = worker;
      let settled = false;
      const timer = setTimeout(() => {
        void worker.terminate();
        finish(new Error("\u8BCD\u5178\u6784\u5EFA\u8D85\u65F6"));
      }, 3e5);
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.worker = null;
        if (error)
          void rm(out, { recursive: true, force: true }).finally(
            () => reject(error)
          );
        else
          this.replace(out).then(
            resolve,
            (e) => rm(out, { recursive: true, force: true }).finally(() => reject(e))
          );
      };
      worker.on("message", (msg) => {
        if (msg.progress) this.job.received = msg.progress;
        else if (msg.ok) finish();
        else finish(new Error(msg.error));
      });
      worker.once("error", (e) => finish(e));
      worker.once("exit", (code) => {
        if (code !== 0) finish(new Error("\u8BCD\u5178\u6784\u5EFA\u8FDB\u7A0B\u5DF2\u7ED3\u675F"));
      });
    });
  }
  async replace(build) {
    const meta = JSON.parse(
      await readFile(path.join(build, DICT_FILES.meta), "utf8")
    );
    await this.close();
    const current = path.join(this.dir, "current"), old = path.join(this.dir, `old-${randomUUID()}`);
    await rename(current, old).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
    await rename(build, current);
    this.meta = meta;
    await rm(old, { recursive: true, force: true });
  }
  async remove() {
    if (this.job.running) throw new Error("\u8BCD\u5178\u6B63\u5728\u5B89\u88C5\uFF0C\u8BF7\u7A0D\u5019");
    await this.close();
    this.meta = null;
    await rm(path.join(this.dir, "current"), { recursive: true, force: true });
    return this.status();
  }
  async close() {
    const reader = this.reader;
    this.reader = null;
    await reader?.then((r) => r.file.close()).catch(() => {
    });
  }
  open() {
    if (this.reader) return this.reader;
    const reader = (async () => {
      const dir = path.join(this.dir, "current");
      const index = await readFile(path.join(dir, DICT_FILES.index));
      const file = await open(path.join(dir, DICT_FILES.data), "r");
      return { file, index, count: index.length / 4 - 1 };
    })();
    reader.catch(() => {
      if (this.reader === reader) this.reader = null;
    });
    return this.reader = reader;
  }
  async line(reader, i, limit = Infinity) {
    const start = reader.index.readUInt32LE(i * 4), end = reader.index.readUInt32LE(i * 4 + 4);
    const length = Math.min(end - start - 1, limit);
    const buffer = Buffer.alloc(length);
    await reader.file.read(buffer, 0, length, start);
    return buffer;
  }
  async keyAt(reader, i) {
    let buffer = await this.line(reader, i, 256);
    let tab = buffer.indexOf(9);
    if (tab < 0) {
      buffer = await this.line(reader, i);
      tab = buffer.indexOf(9);
    }
    return buffer.toString("utf8", 0, tab < 0 ? buffer.length : tab);
  }
  async find(key) {
    const reader = await this.open();
    let lo = 0, hi = reader.count;
    while (lo < hi) {
      const mid = lo + hi >>> 1;
      if (await this.keyAt(reader, mid) < key) lo = mid + 1;
      else hi = mid;
    }
    const found = [];
    for (let i = lo; i < reader.count && found.length < 4; i++) {
      const parsed = parseDictLine((await this.line(reader, i)).toString());
      if (parsed.key !== key) break;
      found.push(parsed);
    }
    return found;
  }
  async lookup(text) {
    await this.ready;
    const query = String(text).normalize("NFKC").replace(/\s+/g, " ").trim();
    const result = {
      query,
      installed: !!this.meta,
      entries: []
    };
    if (!this.meta || !query || query.length > 80) return result;
    const stripped = query.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    const candidates = [
      ...new Set(
        [
          query,
          stripped,
          stripped.replace(/['’]s$/i, ""),
          stripped.replace(/-/g, " "),
          stripped.replace(/-/g, "")
        ].map(dictKey).filter(Boolean)
      )
    ];
    for (const key of candidates) {
      for (const hit of await this.find(key)) {
        if ("alias" in hit) {
          for (const base of await this.find(dictKey(hit.alias.base)))
            if ("entry" in base)
              result.entries.push({
                ...base.entry,
                via: { word: stripped, types: hit.alias.types }
              });
          continue;
        }
        result.entries.push(hit.entry);
        if (hit.lemma) {
          for (const base of await this.find(dictKey(hit.lemma.base)))
            if ("entry" in base)
              result.entries.push({
                ...base.entry,
                via: { word: hit.entry.word, types: hit.lemma.types }
              });
        }
      }
      if (result.entries.length) break;
    }
    if (!result.entries.length && /^[a-z]{4,}$/i.test(stripped))
      for (const [stem, types] of stems(dictKey(stripped))) {
        for (const hit of await this.find(stem))
          if ("entry" in hit)
            result.entries.push({
              ...hit.entry,
              via: { word: stripped, types }
            });
        if (result.entries.length) break;
      }
    return result;
  }
  async call(input) {
    await this.ready;
    switch (input.action) {
      case "dictionaryStatus":
        return this.status();
      case "dictionaryInstall":
        return this.install(
          typeof input.url === "string" && input.url ? input.url : void 0
        );
      case "dictionaryImport":
        return this.importFile(String(input.path || ""));
      case "dictionaryRemove":
        return this.remove();
      case "lookup":
        return this.lookup(String(input.query ?? input.text ?? ""));
      default:
        throw new Error("\u672A\u77E5\u7684\u8BCD\u5178\u64CD\u4F5C");
    }
  }
  async dispose() {
    this.abort.abort();
    await this.worker?.terminate();
    await this.close();
  }
};
export {
  Dictionary,
  ECDICT_URL
};
