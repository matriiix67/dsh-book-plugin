import { z } from "zod";
import { createTypertRemoteInfo } from "@deepseek-ai/dsh-typert-protocol/remote-info";
export const remoteInfo = createTypertRemoteInfo(
  {
    package: "@local/dsh-bookshelf",
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
    },
  } as any,
  z,
);
