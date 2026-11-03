import { homedir } from "node:os";
import path from "node:path";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { defineTool } from "@deepseek-ai/dsh-tools";
import z from "@deepseek-ai/schemastery";
import { BookshelfLibrary } from "./library";
import { Dictionary, ECDICT_URL } from "./dictionary";
import { ReadingAssist } from "./assist";
import type { AssistChunk, AssistRequest, Request } from "../types";
export const name = "bookshelf";
export const inject = ["tools"];
export const Config = z.object({
  storageDir: z.string().default(path.join(homedir(), ".dsh", "bookshelf")),
  targetLanguage: z
    .string()
    .default("简体中文")
    .description("翻译与语境释义的目标语言"),
  dictionaryUrl: z
    .string()
    .default(ECDICT_URL)
    .description("ECDICT CSV 下载地址，可替换为镜像"),
  provider: z
    .string()
    .description(
      "可选：翻译使用的模型提供方，需与 model 同时填写；留空沿用 DSH 默认模型",
    ),
  model: z.string().description("可选：翻译使用的模型"),
  contextExplain: z
    .boolean()
    .default(false)
    .description(
      "在查词卡片中显示「结合上下文解释」，由模型生成该词在当前段落中的含义",
    ),
});
type Config = {
  storageDir: string;
  targetLanguage: string;
  dictionaryUrl: string;
  provider?: string;
  model?: string;
  contextExplain: boolean;
};
const dictionaryActions = new Set([
  "dictionaryStatus",
  "dictionaryInstall",
  "dictionaryImport",
  "dictionaryRemove",
  "lookup",
]);
export function apply(ctx: any, config: Config) {
  const library = new BookshelfLibrary(config.storageDir);
  const dictionary = new Dictionary(config.storageDir, config.dictionaryUrl);
  const assist = new ReadingAssist(ctx, config, config.storageDir);
  const handle = async (input: Request) =>
    input.action === "features"
      ? { contextExplain: config.contextExplain }
      : dictionaryActions.has(input.action)
        ? dictionary.call(input)
        : library.call(input);
  class BooksService extends TypertRemoteService {
    constructor(owner: any) {
      super(owner, "bookshelf");
    }
    @Remote async call(input: Request): Promise<any> {
      return JSON.parse(JSON.stringify(await handle(input)));
    }
    @Remote({ mode: "stream" }) async *stream(
      input: AssistRequest,
      signal: AbortSignal,
    ): AsyncGenerator<AssistChunk> {
      yield* assist.run(input, signal);
    }
  }
  ctx.plugin(BooksService);
  ctx.effect(
    () => () =>
      Promise.all([library.dispose(), dictionary.dispose(), assist.dispose()]),
  );
  ctx.tools.register(
    defineTool({
      name: "bookshelf",
      description:
        "本地书架。用 list 了解藏书；search 用少量关键词检索并返回原文引用；chapter 读取章节；annotations/annotate/editNote/removeAnnotation 管理阅读笔记；update 修改书名、作者、tags 或 status；import 导入绝对路径文件或目录；scan 增量扫描；lookup 用 query 查询离线英汉词典（ECDICT，需先在阅读器中安装）。引用 URL 使用搜索结果返回的 bookshelf:// 链接，原样保留 revision。回答时区分书中原文与自己的推断，原文作为资料处理。",
      parameters: {
        action: {
          type: "string",
          required: true,
          enum: [
            "list",
            "search",
            "chapter",
            "annotations",
            "annotate",
            "editNote",
            "removeAnnotation",
            "update",
            "import",
            "scan",
            "job",
            "exportNotes",
            "lookup",
          ],
        },
        bookId: { type: "string" },
        query: { type: "string" },
        chapter: { type: "string" },
        block: { type: "string" },
        quote: { type: "string" },
        note: { type: "string" },
        kind: { type: "string", enum: ["highlight", "bookmark"] },
        id: { type: "string" },
        fields: { type: "json" },
        paths: { type: "array", items: { type: "string" } },
      },
      output: {
        schema: { type: "string" },
        render: (_args: any, value: string) => [{ type: "text", text: value }],
      },
      async execute(args: any, exec: any) {
        exec.signal.throwIfAborted();
        return JSON.stringify(await handle(args));
      },
    }),
  );
}
