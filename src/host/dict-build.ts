import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import type { DictEntry } from "../types";
// 词典按小写词头排序写入单个 TSV，另存每行的字节偏移，查询时在磁盘上二分查找。
export const DICT_FILES = {
  data: "entries.tsv",
  index: "entries.idx",
  meta: "meta.json",
};
export type DictMeta = {
  version: 1;
  entries: number;
  aliases: number;
  source: string;
  builtAt: number;
};
const FORM_TYPES = new Set(["p", "d", "i", "3", "r", "t", "s"]);
export function dictKey(word: string) {
  return word.normalize("NFKC").replace(/[’‘]/g, "'").trim().toLowerCase();
}
const clean = (value: string | undefined) =>
  (value || "").replace(/[\t\r\n]+/g, " ").trim();
async function* csvRows(file: string) {
  let field = "",
    row: string[] = [],
    quoted = false,
    afterQuote = false;
  for await (const chunk of createReadStream(file, {
    encoding: "utf8",
    highWaterMark: 1 << 20,
  })) {
    const rows: string[][] = [];
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (afterQuote) {
        afterQuote = false;
        if (c === '"') {
          field += '"';
          continue;
        }
        quoted = false;
      }
      if (quoted) {
        if (c === '"') afterQuote = true;
        else field += c;
        continue;
      }
      if (c === '"' && field === "") quoted = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        field = "";
        row = [];
      } else if (c !== "\r") field += c;
    }
    yield* rows;
  }
  if (field || row.length) yield [...row, field];
}
export async function buildDictionary(
  csv: string,
  out: string,
  source: string,
  progress?: (rows: number) => void,
): Promise<DictMeta> {
  const keys: string[] = [],
    lines: string[] = [],
    known = new Set<string>(),
    forms: [string, string, string][] = [];
  let column: Record<string, number> | undefined;
  for await (const row of csvRows(csv)) {
    if (!column) {
      column = Object.fromEntries(
        row.map((name, i) => [name.replace(/^﻿/, "").trim(), i]),
      );
      if (column.word === undefined || column.translation === undefined)
        throw new Error(
          "词典文件需要包含 word 与 translation 列（ECDICT CSV 格式）",
        );
      continue;
    }
    const get = (name: string) =>
      column![name] === undefined ? "" : clean(row[column![name]]);
    const word = get("word");
    const key = dictKey(word);
    if (!key || known.has(key)) continue;
    known.add(key);
    const exchange = get("exchange");
    keys.push(key);
    lines.push(
      [
        key,
        word,
        get("phonetic"),
        get("translation"),
        get("definition"),
        get("tag"),
        get("collins"),
        get("oxford"),
        exchange,
      ].join("\t"),
    );
    for (const item of exchange.split("/")) {
      const [type, value] = item.split(":");
      if (FORM_TYPES.has(type) && value)
        forms.push([dictKey(value), word, type]);
    }
    if (keys.length % 50000 === 0) progress?.(keys.length);
  }
  const entries = keys.length;
  if (!entries) throw new Error("词典文件中没有可用词条");
  // 词形变化（went、apples 等）若没有独立词条，记为指向原形的别名行。
  const aliases = new Map<string, Map<string, Set<string>>>();
  for (const [form, base, type] of forms) {
    if (!form || known.has(form)) continue;
    const bases = aliases.get(form) || new Map<string, Set<string>>();
    aliases.set(form, bases);
    const types = bases.get(base) || new Set<string>();
    bases.set(base, types);
    types.add(type);
  }
  for (const [form, bases] of aliases)
    for (const [base, types] of [...bases].slice(0, 4)) {
      keys.push(form);
      lines.push(`${form}\t@${base}\t${[...types].join(",")}`);
    }
  const order = Array.from(keys.keys()).sort((a, b) =>
    keys[a] < keys[b] ? -1 : keys[a] > keys[b] ? 1 : a - b,
  );
  await mkdir(out, { recursive: true });
  const index = Buffer.allocUnsafe((order.length + 1) * 4);
  const stream = createWriteStream(path.join(out, DICT_FILES.data));
  let offset = 0,
    batch: string[] = [],
    batchSize = 0;
  for (let i = 0; i < order.length; i++) {
    const line = lines[order[i]] + "\n";
    index.writeUInt32LE(offset, i * 4);
    offset += Buffer.byteLength(line);
    batch.push(line);
    batchSize += line.length;
    if (batchSize > 1 << 20 || i === order.length - 1) {
      if (!stream.write(batch.join(""))) await once(stream, "drain");
      batch = [];
      batchSize = 0;
    }
  }
  index.writeUInt32LE(offset, order.length * 4);
  await new Promise<void>((resolve, reject) => {
    stream.once("error", reject);
    stream.end(resolve);
  });
  await writeFile(path.join(out, DICT_FILES.index), index);
  const meta: DictMeta = {
    version: 1,
    entries,
    aliases: order.length - entries,
    source,
    builtAt: Date.now(),
  };
  await writeFile(path.join(out, DICT_FILES.meta), JSON.stringify(meta));
  return meta;
}
const lines = (value: string) =>
  value
    .split("\\n")
    .map((s) => s.trim())
    .filter(Boolean);
export function parseDictLine(line: string):
  | { key: string; alias: { base: string; types: string[] } }
  | {
      key: string;
      entry: DictEntry;
      lemma?: { base: string; types: string[] };
    } {
  const [key, word, ...rest] = line.split("\t");
  if (word.startsWith("@"))
    return {
      key,
      alias: { base: word.slice(1), types: (rest[0] || "").split(",") },
    };
  const [phonetic, translation, definition, tag, collins, oxford, exchange] =
    rest;
  const items = (exchange || "")
    .split("/")
    .map((item) => item.split(":"))
    .filter(([type, value]) => type && value);
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
      forms: items
        .filter(([type]) => FORM_TYPES.has(type))
        .map(([type, value]) => ({ type, word: value })),
    },
    lemma:
      base && dictKey(base) !== key
        ? {
            base,
            types: [...(items.find(([type]) => type === "1")?.[1] || "")],
          }
        : undefined,
  };
}
