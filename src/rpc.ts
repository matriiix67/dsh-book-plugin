import { z } from "zod";
import { createTypertRemoteInfo } from "@deepseek-ai/dsh-typert-protocol/remote-info";
export const remoteInfo = createTypertRemoteInfo(
  {
    package: "@matriiix67/dsh-book-plugin",
    methods: {
      "bookshelf/call": {
        service: "bookshelf",
        description: "书架操作",
        invocation: { kind: "direct" },
        parameters: [
          {
            name: "input",
            source: "json",
            codec: {
              mode: "strict",
              typeSymbol: "bookshelf#request",
              create: () => z.object({ action: z.string() }).catchall(z.json()),
            },
          },
        ],
        result: {
          mode: "strict",
          typeSymbol: "bookshelf#result",
          create: () => z.json(),
        },
      },
      "bookshelf/stream": {
        service: "bookshelf",
        description: "阅读辅助：翻译与语境释义，流式返回模型输出",
        mode: "stream",
        invocation: { kind: "direct" },
        parameters: [
          {
            name: "input",
            source: "json",
            codec: {
              mode: "strict",
              typeSymbol: "bookshelf#assist-request",
              create: () =>
                z.object({
                  kind: z.enum(["translate", "explain"]),
                  text: z.string(),
                  context: z.string().optional(),
                }),
            },
          },
        ],
        cancellation: { parameter: "signal" },
        result: {
          mode: "strict",
          typeSymbol: "bookshelf#assist-chunk",
          create: () => z.json(),
        },
      },
    },
  } as any,
  z,
);
