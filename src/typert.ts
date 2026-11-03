import { remoteInfo } from "./rpc";
export const TYPERT = {
  package: "@local/dsh-bookshelf",
  face: "host",
  schemas: [],
  get invocations() {
    return remoteInfo.descriptors;
  },
  model: { services: [], events: [], objects: [] },
};
