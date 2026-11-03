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
