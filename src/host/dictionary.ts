import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  open,
  type FileHandle,
} from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import {
  DICT_FILES,
  dictKey,
  parseDictLine,
  type DictMeta,
} from "./dict-build";
import type { DictEntry, DictStatus, Request } from "../types";
// ECDICT（MIT）固定到提交版本，保证列格式稳定；镜像可通过插件配置 dictionaryUrl 替换。
export const ECDICT_URL =
  "https://raw.githubusercontent.com/skywind3000/ECDICT/9c46923fb81a2eb6c264a3a1689562ea7bc56b6a/ecdict.csv";
const MAX_SOURCE = 320 * 1024 * 1024;
type Reader = { file: FileHandle; index: Buffer; count: number };
const C = "[b-df-hj-np-tv-z]";
const INFLECTIONS: [RegExp, string, string[]][] = [
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
  [/est$/, "", ["t"]],
];
function stems(word: string) {
  const out = new Map<string, string[]>();
  for (const [pattern, replacement, types] of INFLECTIONS)
    if (pattern.test(word)) {
      const stem = word.replace(pattern, replacement);
      if (stem.length >= 2 && !out.has(stem)) out.set(stem, types);
    }
  return out;
}
export class Dictionary {
  job: DictStatus["job"] = {
    running: false,
    phase: "",
    received: 0,
    total: 0,
    error: "",
  };
  private meta: DictMeta | null = null;
  private reader: Promise<Reader> | null = null;
  private worker: Worker | null = null;
  private abort = new AbortController();
  private readonly dir: string;
  readonly ready: Promise<void>;
  constructor(
    root: string,
    readonly defaultUrl = ECDICT_URL,
  ) {
    this.dir = path.join(root, "dictionary");
    this.ready = this.load();
    this.ready.catch(() => {});
  }
  private async load() {
    try {
      this.meta = JSON.parse(
        await readFile(path.join(this.dir, "current", DICT_FILES.meta), "utf8"),
      );
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  status(): DictStatus {
    return {
      installed: !!this.meta,
      entries: this.meta?.entries || 0,
      source: this.meta?.source || "",
      builtAt: this.meta?.builtAt || 0,
      defaultUrl: this.defaultUrl,
      job: { ...this.job },
    };
  }
  private start(task: () => Promise<void>) {
    if (this.job.running) throw new Error("词典正在安装，请稍候");
    this.job = { running: true, phase: "", received: 0, total: 0, error: "" };
    void task()
      .catch((e) => {
        if (!this.abort.signal.aborted)
          this.job.error = e instanceof Error ? e.message : String(e);
      })
      .finally(() => {
        this.job.running = false;
        this.job.phase = "";
      });
    return this.status();
  }
  install(url = this.defaultUrl) {
    const target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol))
      throw new Error("词典地址需要以 http 或 https 开头");
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
  importFile(file: string) {
    if (!path.isAbsolute(file)) throw new Error("请填写词典文件的本地绝对路径");
    return this.start(async () => {
      const info = await stat(file);
      if (!info.isFile()) throw new Error("请选择 ECDICT 的 CSV 文件");
      if (info.size > MAX_SOURCE) throw new Error("词典文件超过 320 MB");
      await this.build(file, file);
    });
  }
  private async download(url: URL, file: string) {
    this.job.phase = "download";
    let response: Response;
    try {
      response = await fetch(url, { signal: this.abort.signal });
    } catch (e) {
      if (this.abort.signal.aborted) throw e;
      throw new Error(
        `无法连接词典下载地址（${(e as Error).message}）。可在插件配置 dictionaryUrl 中改用镜像，或下载 ecdict.csv 后从本地导入。`,
      );
    }
    if (!response.ok || !response.body)
      throw new Error(`词典下载失败：HTTP ${response.status}`);
    // 压缩传输时 content-length 是压缩后的大小，与解压后的字节数不可比。
    const encoding = response.headers.get("content-encoding");
    this.job.total =
      encoding && encoding !== "identity"
        ? 0
        : Number(response.headers.get("content-length")) || 0;
    if (this.job.total > MAX_SOURCE) throw new Error("词典文件超过 320 MB");
    const out = createWriteStream(file);
    try {
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        this.job.received += chunk.length;
        if (this.job.received > MAX_SOURCE)
          throw new Error("词典文件超过 320 MB");
        if (!out.write(chunk)) await once(out, "drain");
      }
    } finally {
      await new Promise<void>((resolve) => out.end(resolve));
    }
  }
  private build(csv: string, source: string) {
    this.job.phase = "build";
    this.job.received = 0;
    this.job.total = 0;
    const out = path.join(this.dir, `build-${randomUUID()}`);
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL("./dict-worker.js", import.meta.url), {
        workerData: { csv, out, source },
        resourceLimits: { maxOldGenerationSizeMb: 512 },
      });
      this.worker = worker;
      let settled = false;
      const timer = setTimeout(() => {
        void worker.terminate();
        finish(new Error("词典构建超时"));
      }, 300000);
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.worker = null;
        if (error)
          void rm(out, { recursive: true, force: true }).finally(() =>
            reject(error),
          );
        else
          this.replace(out).then(resolve, (e) =>
            rm(out, { recursive: true, force: true }).finally(() => reject(e)),
          );
      };
      worker.on("message", (msg) => {
        if (msg.progress) this.job.received = msg.progress;
        else if (msg.ok) finish();
        else finish(new Error(msg.error));
      });
      worker.once("error", (e) => finish(e));
      worker.once("exit", (code) => {
        if (code !== 0) finish(new Error("词典构建进程已结束"));
      });
    });
  }
  private async replace(build: string) {
    const meta = JSON.parse(
      await readFile(path.join(build, DICT_FILES.meta), "utf8"),
    );
    await this.close();
    const current = path.join(this.dir, "current"),
      old = path.join(this.dir, `old-${randomUUID()}`);
    await rename(current, old).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
    await rename(build, current);
    this.meta = meta;
    await rm(old, { recursive: true, force: true });
  }
  async remove() {
    if (this.job.running) throw new Error("词典正在安装，请稍候");
    await this.close();
    this.meta = null;
    await rm(path.join(this.dir, "current"), { recursive: true, force: true });
    return this.status();
  }
  private async close() {
    const reader = this.reader;
    this.reader = null;
    await reader?.then((r) => r.file.close()).catch(() => {});
  }
  private open() {
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
    return (this.reader = reader);
  }
  private async line(reader: Reader, i: number, limit = Infinity) {
    const start = reader.index.readUInt32LE(i * 4),
      end = reader.index.readUInt32LE(i * 4 + 4);
    const length = Math.min(end - start - 1, limit);
    const buffer = Buffer.alloc(length);
    await reader.file.read(buffer, 0, length, start);
    return buffer;
  }
  private async keyAt(reader: Reader, i: number) {
    let buffer = await this.line(reader, i, 256);
    let tab = buffer.indexOf(9);
    if (tab < 0) {
      buffer = await this.line(reader, i);
      tab = buffer.indexOf(9);
    }
    return buffer.toString("utf8", 0, tab < 0 ? buffer.length : tab);
  }
  private async find(key: string) {
    const reader = await this.open();
    let lo = 0,
      hi = reader.count;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((await this.keyAt(reader, mid)) < key) lo = mid + 1;
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
  async lookup(text: string) {
    await this.ready;
    const query = String(text).normalize("NFKC").replace(/\s+/g, " ").trim();
    const result = {
      query,
      installed: !!this.meta,
      entries: [] as DictEntry[],
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
          stripped.replace(/-/g, ""),
        ]
          .map(dictKey)
          .filter(Boolean),
      ),
    ];
    for (const key of candidates) {
      for (const hit of await this.find(key)) {
        if ("alias" in hit) {
          for (const base of await this.find(dictKey(hit.alias.base)))
            if ("entry" in base)
              result.entries.push({
                ...base.entry,
                via: { word: stripped, types: hit.alias.types },
              });
          continue;
        }
        result.entries.push(hit.entry);
        if (hit.lemma)
          for (const base of await this.find(dictKey(hit.lemma.base)))
            if ("entry" in base)
              result.entries.push({
                ...base.entry,
                via: { word: hit.entry.word, types: hit.lemma.types },
              });
      }
      if (result.entries.length) break;
    }
    // ECDICT 部分词条缺少 exchange（如 workflow），按规则变化还原原形兜底。
    if (!result.entries.length && /^[a-z]{4,}$/i.test(stripped))
      for (const [stem, types] of stems(dictKey(stripped))) {
        for (const hit of await this.find(stem))
          if ("entry" in hit)
            result.entries.push({
              ...hit.entry,
              via: { word: stripped, types },
            });
        if (result.entries.length) break;
      }
    return result;
  }
  async call(input: Request) {
    await this.ready;
    switch (input.action) {
      case "dictionaryStatus":
        return this.status();
      case "dictionaryInstall":
        return this.install(
          typeof input.url === "string" && input.url ? input.url : undefined,
        );
      case "dictionaryImport":
        return this.importFile(String(input.path || ""));
      case "dictionaryRemove":
        return this.remove();
      case "lookup":
        return this.lookup(String(input.query ?? input.text ?? ""));
      default:
        throw new Error("未知的词典操作");
    }
  }
  async dispose() {
    this.abort.abort();
    await this.worker?.terminate();
    await this.close();
  }
}
