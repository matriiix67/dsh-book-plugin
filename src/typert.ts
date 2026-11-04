import { remoteInfo } from "./rpc";
export const TYPERT = {
  package: "@matriiix67/dsh-book-plugin",
  face: "host",
  schemas: [],
  get invocations() {
    return remoteInfo.descriptors;
  },
  model: { services: [], events: [], objects: [] },
};
