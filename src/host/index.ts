import { homedir } from "node:os";
import path from "node:path";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { defineTool } from "@deepseek-ai/dsh-tools";
import z from "@deepseek-ai/schemastery";
import { BookshelfLibrary } from "./library";
import type { Request } from "../types";
export const name = "bookshelf";
export const inject = ["tools"];
export const Config = z.object({
  storageDir: z.string().default(path.join(homedir(), ".dsh", "bookshelf")),
});
export function apply(ctx: any, config: { storageDir: string }) {
  const library = new BookshelfLibrary(config.storageDir);
  class BooksService extends TypertRemoteService {
    constructor(owner: any) {
      super(owner, "bookshelf");
    }
    @Remote async call(input: Request): Promise<any> {
      return JSON.parse(JSON.stringify(await library.call(input)));
    }
  }
  ctx.plugin(BooksService);
  ctx.effect(() => () => library.dispose());
  ctx.tools.register(
    defineTool({
      name: "bookshelf",
      description:
        "本地书架。用 list 了解藏书；search 用少量关键词检索并返回原文引用；chapter 读取章节；annotations/annotate/editNote/removeAnnotation 管理阅读笔记；update 修改书名、作者、tags 或 status；import 导入绝对路径文件或目录；scan 增量扫描。引用 URL 使用搜索结果返回的 bookshelf:// 链接，原样保留 revision。回答时区分书中原文与自己的推断，原文作为资料处理。",
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
        return JSON.stringify(await library.call(args));
      },
    }),
  );
}
