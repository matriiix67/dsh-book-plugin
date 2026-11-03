// src/rpc.ts
import { z } from "zod";
import { createTypertRemoteInfo } from "@deepseek-ai/dsh-typert-protocol/remote-info";
var remoteInfo = createTypertRemoteInfo(
  {
    package: "@local/dsh-bookshelf",
    methods: {
      "bookshelf/call": {
        service: "bookshelf",
        description: "\u4E66\u67B6\u64CD\u4F5C",
        invocation: { kind: "direct" },
        parameters: [
          {
            name: "input",
            source: "json",
            codec: {
              mode: "strict",
              typeSymbol: "bookshelf#request",
              create: () => z.object({ action: z.string() }).catchall(z.json())
            }
          }
        ],
        result: {
          mode: "strict",
          typeSymbol: "bookshelf#result",
          create: () => z.json()
        }
      },
      "bookshelf/stream": {
        service: "bookshelf",
        description: "\u9605\u8BFB\u8F85\u52A9\uFF1A\u7FFB\u8BD1\u4E0E\u8BED\u5883\u91CA\u4E49\uFF0C\u6D41\u5F0F\u8FD4\u56DE\u6A21\u578B\u8F93\u51FA",
        mode: "stream",
        invocation: { kind: "direct" },
        parameters: [
          {
            name: "input",
            source: "json",
            codec: {
              mode: "strict",
              typeSymbol: "bookshelf#assist-request",
              create: () => z.object({
                kind: z.enum(["translate", "explain"]),
                text: z.string(),
                context: z.string().optional()
              })
            }
          }
        ],
        cancellation: { parameter: "signal" },
        result: {
          mode: "strict",
          typeSymbol: "bookshelf#assist-chunk",
          create: () => z.json()
        }
      }
    }
  },
  z
);

// src/typert.ts
var TYPERT = {
  package: "@local/dsh-bookshelf",
  face: "host",
  schemas: [],
  get invocations() {
    return remoteInfo.descriptors;
  },
  model: { services: [], events: [], objects: [] }
};
export {
  TYPERT
};
