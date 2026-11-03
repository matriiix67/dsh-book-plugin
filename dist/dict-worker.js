// src/host/dict-worker.ts
import { parentPort, workerData } from "node:worker_threads";

// src/host/dict-build.ts
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
var DICT_FILES = {
  data: "entries.tsv",
  index: "entries.idx",
  meta: "meta.json"
};
var FORM_TYPES = /* @__PURE__ */ new Set(["p", "d", "i", "3", "r", "t", "s"]);
function dictKey(word) {
  return word.normalize("NFKC").replace(/[’‘]/g, "'").trim().toLowerCase();
}
var clean = (value) => (value || "").replace(/[\t\r\n]+/g, " ").trim();
async function* csvRows(file) {
  let field = "", row = [], quoted = false, afterQuote = false;
  for await (const chunk of createReadStream(file, {
    encoding: "utf8",
    highWaterMark: 1 << 20
  })) {
    const rows = [];
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
async function buildDictionary(csv, out, source, progress) {
  const keys = [], lines = [], known = /* @__PURE__ */ new Set(), forms = [];
  let column;
  for await (const row of csvRows(csv)) {
    if (!column) {
      column = Object.fromEntries(
        row.map((name, i) => [name.replace(/^﻿/, "").trim(), i])
      );
      if (column.word === void 0 || column.translation === void 0)
        throw new Error(
          "\u8BCD\u5178\u6587\u4EF6\u9700\u8981\u5305\u542B word \u4E0E translation \u5217\uFF08ECDICT CSV \u683C\u5F0F\uFF09"
        );
      continue;
    }
    const get = (name) => column[name] === void 0 ? "" : clean(row[column[name]]);
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
        exchange
      ].join("	")
    );
    for (const item of exchange.split("/")) {
      const [type, value] = item.split(":");
      if (FORM_TYPES.has(type) && value)
        forms.push([dictKey(value), word, type]);
    }
    if (keys.length % 5e4 === 0) progress?.(keys.length);
  }
  const entries = keys.length;
  if (!entries) throw new Error("\u8BCD\u5178\u6587\u4EF6\u4E2D\u6CA1\u6709\u53EF\u7528\u8BCD\u6761");
  const aliases = /* @__PURE__ */ new Map();
  for (const [form, base, type] of forms) {
    if (!form || known.has(form)) continue;
    const bases = aliases.get(form) || /* @__PURE__ */ new Map();
    aliases.set(form, bases);
    const types = bases.get(base) || /* @__PURE__ */ new Set();
    bases.set(base, types);
    types.add(type);
  }
  for (const [form, bases] of aliases)
    for (const [base, types] of [...bases].slice(0, 4)) {
      keys.push(form);
      lines.push(`${form}	@${base}	${[...types].join(",")}`);
    }
  const order = Array.from(keys.keys()).sort(
    (a, b) => keys[a] < keys[b] ? -1 : keys[a] > keys[b] ? 1 : a - b
  );
  await mkdir(out, { recursive: true });
  const index = Buffer.allocUnsafe((order.length + 1) * 4);
  const stream = createWriteStream(path.join(out, DICT_FILES.data));
  let offset = 0, batch = [], batchSize = 0;
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
  await new Promise((resolve, reject) => {
    stream.once("error", reject);
    stream.end(resolve);
  });
  await writeFile(path.join(out, DICT_FILES.index), index);
  const meta = {
    version: 1,
    entries,
    aliases: order.length - entries,
    source,
    builtAt: Date.now()
  };
  await writeFile(path.join(out, DICT_FILES.meta), JSON.stringify(meta));
  return meta;
}

// src/host/dict-worker.ts
try {
  parentPort.postMessage({
    ok: true,
    value: await buildDictionary(
      workerData.csv,
      workerData.out,
      workerData.source,
      (rows) => parentPort.postMessage({ progress: rows })
    )
  });
} catch (e) {
  parentPort.postMessage({
    ok: false,
    error: e instanceof Error ? e.message : String(e)
  });
}
//# sourceMappingURL=dict-worker.js.map
