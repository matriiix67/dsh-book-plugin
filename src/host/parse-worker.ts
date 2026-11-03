import { parentPort, workerData } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import { parseBook } from "./parser";
try {
  parentPort!.postMessage({
    ok: true,
    value: parseBook(await readFile(workerData.path), workerData.name),
  });
} catch (e) {
  parentPort!.postMessage({
    ok: false,
    error: e instanceof Error ? e.message : String(e),
  });
}
