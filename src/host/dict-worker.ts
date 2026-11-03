import { parentPort, workerData } from "node:worker_threads";
import { buildDictionary } from "./dict-build";
try {
  parentPort!.postMessage({
    ok: true,
    value: await buildDictionary(
      workerData.csv,
      workerData.out,
      workerData.source,
      (rows) => parentPort!.postMessage({ progress: rows }),
    ),
  });
} catch (e) {
  parentPort!.postMessage({
    ok: false,
    error: e instanceof Error ? e.message : String(e),
  });
}
