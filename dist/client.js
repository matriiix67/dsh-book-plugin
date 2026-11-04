window.__ModuleLoader__.load({id:"@matriiix67/dsh-book-plugin", factory(require) { var module={exports:{}}; var exports=module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply3,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);

// src/rpc.ts
var import_zod = require("zod");

// node_modules/@deepseek-ai/dsh-typert-protocol/lib/types/remote-info.js
function createTypertRemoteInfo(spec, zod) {
  return new RemoteInfo(spec, zod);
}
var RemoteInfo = class {
  spec;
  zod;
  index;
  constructor(spec, zod) {
    this.spec = spec;
    this.zod = zod;
  }
  get package() {
    return this.spec.package;
  }
  get descriptors() {
    return this.resolve().descriptors;
  }
  get methods() {
    return this.resolve().methods;
  }
  resolve() {
    if (this.index !== void 0)
      return this.index;
    const zod = this.zod;
    const descriptors = [];
    const methods = /* @__PURE__ */ Object.create(null);
    for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
      const separator = endpoint.indexOf("/");
      const namespace = endpoint.slice(0, separator);
      const method = endpoint.slice(separator + 1);
      const parameters = definition.parameters.map((parameter) => ({ ...parameter, wire: parameter.wire ?? parameter.name }));
      const descriptor = {
        ...definition,
        id: `${this.spec.package}#${endpoint}`,
        namespace,
        method,
        parameters,
        result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
      };
      if (definition.invocation.kind === "direct") {
        const inputs = [];
        const direct = Object.assign(descriptor, {
          input(options) {
            const strict = options?.strict === true;
            return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
          },
          invoke(remote, input, signal) {
            const named = input;
            const values = parameters.map((parameter) => named[parameter.wire]);
            if (definition.cancellation !== void 0)
              values.push(signal);
            const receiver = Reflect.get(remote, namespace);
            const call = Reflect.get(receiver, method);
            return call.apply(receiver, values);
          }
        });
        methods[endpoint] = direct;
      }
      descriptors.push(descriptor);
    }
    return this.index = { descriptors, methods };
  }
};
function optional(parameter) {
  return parameter.source === "json" && parameter.acceptsUndefined === true;
}
var NamedInput = class {
  parameters;
  strict;
  zod;
  schema;
  projection;
  constructor(parameters, strict, zod) {
    this.parameters = parameters;
    this.strict = strict;
    this.zod = zod;
  }
  codec(parameter) {
    return this.strict ? parameter.strictCodec : parameter.codec;
  }
  create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
    const value = this.codec(parameter).create();
    return [parameter.wire, optional(parameter) ? value.optional() : value.nonoptional()];
  })));
  get jsonSchema() {
    return this.project().jsonSchema;
  }
  get jsonSchemaError() {
    return this.project().jsonSchemaError;
  }
  project() {
    if (this.projection !== void 0)
      return this.projection;
    const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
    if (unavailable !== void 0) {
      return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
    }
    return this.projection = {
      jsonSchema: {
        type: "object",
        properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
          ...this.codec(parameter).jsonSchema,
          ...parameter.description === void 0 ? {} : { description: parameter.description }
        }])),
        required: this.parameters.filter((parameter) => !optional(parameter)).map((parameter) => parameter.wire),
        additionalProperties: false
      }
    };
  }
};
var ResultValue = class {
  spec;
  projection;
  constructor(spec) {
    this.spec = spec;
  }
  get mode() {
    return this.spec.mode;
  }
  get typeSymbol() {
    return this.spec.typeSymbol;
  }
  get create() {
    return this.spec.create;
  }
  get decode() {
    return this.spec.decode;
  }
  get encode() {
    return this.spec.encode;
  }
  get description() {
    return this.spec.description;
  }
  get jsonSchemaError() {
    return this.spec.jsonSchemaError;
  }
  get jsonSchema() {
    if (this.projection === void 0) {
      const schema = this.spec.jsonSchema;
      this.projection = { value: schema === void 0 ? void 0 : { ...schema, description: this.spec.description } };
    }
    return this.projection.value;
  }
};

// src/rpc.ts
var remoteInfo = createTypertRemoteInfo(
  {
    package: "@matriiix67/dsh-book-plugin",
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
              create: () => import_zod.z.object({ action: import_zod.z.string() }).catchall(import_zod.z.json())
            }
          }
        ],
        result: {
          mode: "strict",
          typeSymbol: "bookshelf#result",
          create: () => import_zod.z.json()
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
              create: () => import_zod.z.object({
                kind: import_zod.z.enum(["translate", "explain"]),
                text: import_zod.z.string(),
                context: import_zod.z.string().optional()
              })
            }
          }
        ],
        cancellation: { parameter: "signal" },
        result: {
          mode: "strict",
          typeSymbol: "bookshelf#assist-chunk",
          create: () => import_zod.z.json()
        }
      }
    }
  },
  import_zod.z
);

// src/text.ts
function isTerm(text2) {
  const term = text2.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  if (/\p{Script=Han}/u.test(term)) return term.length <= 6;
  return term.length <= 60 && /^[\p{L}\p{M}][\p{L}\p{M}'’-]*(?: [\p{L}\p{M}'’-]+){0,3}$/u.test(term);
}
function isChinese(text2) {
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text2)) return false;
  const han = text2.match(/\p{Script=Han}/gu)?.length ?? 0;
  const words = text2.match(/(?:(?!\p{Script=Han})\p{L})+/gu)?.length ?? 0;
  return han > 0 && han >= words;
}
function isChineseTarget(language) {
  return /中文|汉语|漢語|华语|華語|chinese|^zh\b/i.test(language);
}

// src/client/style.css
var style_default = '.bs-app {\n  --bs-bg: var(--dsw-alias-bg-base, #151516);\n  --bs-panel: var(--dsw-alias-bg-layer-1, #202122);\n  --bs-text: var(--dsw-alias-label-primary, #ececea);\n  --bs-muted: var(--dsw-alias-label-tertiary, #969a97);\n  --bs-line: var(--dsw-alias-border-l1, #343638);\n  --bs-accent: var(--dsw-alias-brand-primary, #80ab99);\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  background: var(--bs-bg);\n  color: var(--bs-text);\n  font-family: inherit;\n  font-size: 13px;\n  overflow: hidden;\n  --assistant-width: 365px;\n}\n.bs-app *,\n.bs-modal * {\n  box-sizing: border-box;\n}\n.bs-app button,\n.bs-app input,\n.bs-app textarea,\n.bs-app select,\n.bs-modal button,\n.bs-modal input,\n.bs-modal textarea,\n.bs-modal select {\n  font: inherit;\n  color: inherit;\n}\n.bs-app button,\n.bs-modal button {\n  border: 1px solid transparent;\n  border-radius: 7px;\n  background: transparent;\n  padding: 7px 10px;\n  cursor: pointer;\n  transition:\n    background 0.15s,\n    color 0.15s;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 7px;\n}\n.bs-app button:hover,\n.bs-modal button:hover {\n  background: var(--bs-panel, #303331);\n}\n.bs-app button:disabled,\n.bs-modal button:disabled {\n  opacity: 0.45;\n  cursor: default;\n}\n.bs-app :focus-visible,\n.bs-modal :focus-visible {\n  outline: 2px solid var(--bs-accent, #80ab99);\n  outline-offset: 3px;\n}\n.bs-app .bs-primary,\n.bs-modal .bs-primary {\n  background: var(--bs-accent, #80ab99);\n  color: var(--dsw-alias-label-primary-inverted, #10271f);\n  border-color: transparent;\n  font-weight: 600;\n}\n.bs-app .bs-primary:hover,\n.bs-modal .bs-primary:hover {\n  filter: brightness(1.08);\n  background: var(--bs-accent, #80ab99);\n}\n.bs-top {\n  min-height: 52px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 24px;\n  padding-left: max(24px, var(--dsh-frame-leading-clearance, 0px));\n  border-bottom: 1px solid var(--bs-line);\n  flex-shrink: 0;\n}\n.bs-top > span,\n.bs-assistant > header > span {\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  font-weight: 600;\n}\n.bs-top > button {\n  color: var(--bs-muted);\n}\n.bs-workspace {\n  display: flex;\n  flex: 1;\n  min-height: 0;\n  min-width: 0;\n}\n.bs-library {\n  flex: 1;\n  min-width: 300px;\n  padding: 42px clamp(22px, 4vw, 58px);\n  overflow: auto;\n  scrollbar-gutter: stable;\n}\n.bs-eyebrow {\n  font-size: 10px;\n  letter-spacing: 2.3px;\n  color: var(--bs-muted);\n  margin: 0 0 10px;\n}\n.bs-library-heading {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 30px;\n  flex-wrap: wrap;\n}\n.bs-library h1 {\n  font-size: 29px;\n  font-weight: 550;\n  letter-spacing: 1px;\n  margin: 0 0 12px;\n}\n.bs-library h1 small {\n  font: 12px system-ui;\n  vertical-align: middle;\n  letter-spacing: 0;\n  border: 1px solid var(--bs-line);\n  border-radius: 4px;\n  padding: 2px 6px;\n  color: var(--bs-muted);\n  margin-left: 7px;\n}\n.bs-muted {\n  color: var(--bs-muted);\n  line-height: 1.6;\n}\n.bs-actions {\n  display: flex;\n  gap: 8px;\n}\n.bs-actions > button:not(.bs-primary),\n.bs-search-row > button {\n  border-color: var(--bs-line);\n}\n.bs-filter-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  border-bottom: 1px solid var(--bs-line);\n  padding-bottom: 12px;\n  gap: 8px;\n}\n.bs-tabs {\n  display: flex;\n  gap: 4px;\n}\n.bs-tabs button {\n  color: var(--bs-muted);\n  white-space: nowrap;\n}\n.bs-tabs button[aria-pressed="true"] {\n  background: var(--bs-panel);\n  color: var(--bs-text);\n}\n.bs-app select {\n  border: 1px solid var(--bs-line);\n  border-radius: 6px;\n  padding: 6px;\n  background: var(--bs-bg);\n  font-size: 12px;\n  max-width: 120px;\n}\n.bs-search-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin: 18px 0 27px;\n}\n.bs-search {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n  min-width: 80px;\n  background: var(--bs-panel);\n  border: 1px solid var(--bs-line);\n  border-radius: 8px;\n  padding: 0 10px;\n}\n.bs-search > span {\n  font-size: 22px;\n  color: var(--bs-muted);\n}\n.bs-search input {\n  flex: 1;\n  min-width: 0;\n  background: transparent;\n  border: 0;\n  outline: 0;\n  padding: 9px 0;\n}\n.bs-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));\n  column-gap: 25px;\n  row-gap: 34px;\n}\n.bs-card {\n  min-width: 0;\n  position: relative;\n  content-visibility: auto;\n  contain-intrinsic-size: auto 315px;\n}\n.bs-card .bs-card-open {\n  display: block;\n  padding: 0;\n  width: 100%;\n  text-align: left;\n  border-radius: 3px;\n}\n.bs-card .bs-card-open:hover {\n  background: transparent;\n}\n.bs-cover {\n  aspect-ratio: 1/1.44;\n  width: 100%;\n  position: relative;\n  overflow: hidden;\n  border-radius: 2px;\n  background: hsl(var(--book-hue) 20% 29%);\n  box-shadow: 2px 6px 15px #0003;\n  transition:\n    transform 0.2s,\n    box-shadow 0.2s;\n}\n.bs-card-open:hover .bs-cover {\n  transform: translateY(-4px);\n  box-shadow: 2px 10px 20px #0005;\n}\n.bs-cover:after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  box-shadow:\n    inset 3px 0 5px #fff2,\n    inset -1px 0 2px #0003;\n  pointer-events: none;\n}\n.bs-cover img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.bs-cover-type {\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  padding: 21px 17px;\n  color: #f4ecda;\n  background: linear-gradient(\n    100deg,\n    #0002,\n    transparent 8%,\n    #ffffff05 90%,\n    #0002\n  );\n  position: relative;\n}\n.bs-cover-type:after {\n  content: "";\n  position: absolute;\n  inset: 11px;\n  border: 1px solid #ffffff25;\n  pointer-events: none;\n}\n.bs-cover-type small {\n  font-size: 8px;\n  letter-spacing: 1.5px;\n  opacity: 0.65;\n}\n.bs-cover-type strong {\n  font-family: Georgia, "Songti SC", serif;\n  font-size: clamp(20px, 2vw, 30px);\n  font-weight: 500;\n  line-height: 1.45;\n  margin: auto 0 17px;\n  display: -webkit-box;\n  -webkit-line-clamp: 4;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n.bs-cover-type span {\n  font-size: 10px;\n  opacity: 0.65;\n}\n.bs-cover-type svg {\n  margin-top: auto;\n  opacity: 0.4;\n}\n.bs-card h3 {\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 1.6;\n  margin: 11px 0 4px;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n.bs-card p {\n  margin: 0;\n  color: var(--bs-muted);\n  font-size: 11px;\n  line-height: 1.5;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n.bs-card-meta {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin-top: 8px;\n  color: var(--bs-muted);\n  font-size: 10px;\n}\n.bs-card-meta > span {\n  border: 1px solid var(--bs-line);\n  border-radius: 3px;\n  padding: 2px 4px;\n}\n.bs-card-meta > button {\n  margin-left: auto;\n  font-size: 17px;\n  line-height: 10px;\n  padding: 2px 6px;\n}\n.bs-card progress {\n  height: 3px;\n  width: 100%;\n  accent-color: var(--bs-accent);\n  margin-top: 9px;\n  border: 0;\n}\n.bs-empty {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  min-height: 360px;\n  padding: 40px 15px;\n  gap: 12px;\n}\n.bs-empty > svg {\n  color: var(--bs-accent);\n  opacity: 0.6;\n}\n.bs-empty h2 {\n  font-size: 23px;\n  font-weight: 500;\n  margin: 10px 0 0;\n}\n.bs-empty p {\n  color: var(--bs-muted);\n  line-height: 1.8;\n  margin: 0 0 12px;\n}\n.bs-empty small {\n  color: var(--bs-muted);\n  font-size: 11px;\n  margin-top: 14px;\n}\n.bs-file-input {\n  display: none;\n}\n.bs-assistant {\n  flex: 0 0 var(--assistant-width);\n  width: var(--assistant-width);\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  background: var(--bs-bg);\n}\n.bs-assistant > header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  padding: 14px 16px;\n  border-bottom: 1px solid var(--bs-line);\n  min-height: 53px;\n}\n.bs-assistant > header button {\n  font-size: 11px;\n  color: var(--bs-muted);\n}\n.bs-assistant-scope {\n  font-size: 11px;\n  color: var(--bs-muted);\n  padding: 12px 18px;\n  border-bottom: 1px solid var(--bs-line);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.bs-chat {\n  flex: 1;\n  min-height: 0;\n  overflow: auto;\n  padding: 15px 18px;\n}\n.bs-chat-empty {\n  margin: 65px 0 20px;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 10px;\n}\n.bs-chat-empty > svg {\n  color: var(--bs-accent);\n  margin-bottom: 10px;\n}\n.bs-chat-empty h3 {\n  font-size: 19px;\n  font-weight: 500;\n  margin: 0;\n  line-height: 1.6;\n}\n.bs-chat-empty p {\n  color: var(--bs-muted);\n  font-size: 12px;\n  line-height: 1.8;\n  margin-bottom: 20px;\n}\n.bs-chat-empty button {\n  font-size: 12px;\n  border: 1px solid var(--bs-line);\n  width: 100%;\n  justify-content: space-between;\n  text-align: left;\n  line-height: 1.6;\n}\n.bs-message {\n  margin: 10px 0 28px;\n  overflow-wrap: anywhere;\n}\n.bs-message > small {\n  color: var(--bs-muted);\n  font-size: 10px;\n  display: block;\n  margin-bottom: 8px;\n}\n.bs-message-text {\n  white-space: pre-wrap;\n  line-height: 1.9;\n}\n.bs-message-user .bs-message-text {\n  padding: 12px 14px;\n  border-radius: 10px;\n  background: var(--bs-panel);\n  font-size: 12px;\n}\n.bs-app .bs-citation {\n  display: inline;\n  padding: 1px 5px;\n  color: var(--bs-accent);\n  border: 1px solid var(--bs-line);\n  font-size: 12px;\n}\n.bs-composer {\n  border: 1px solid var(--bs-line);\n  border-radius: 12px;\n  background: var(--bs-panel);\n  margin: 12px 14px 18px;\n  padding: 12px;\n  flex-shrink: 0;\n}\n.bs-composer textarea {\n  resize: none;\n  width: 100%;\n  min-height: 66px;\n  max-height: 160px;\n  border: 0;\n  background: transparent;\n  outline: 0;\n  line-height: 1.6;\n}\n.bs-composer footer {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 6px;\n  margin-top: 8px;\n}\n.bs-composer small {\n  color: var(--bs-muted);\n  font-size: 10px;\n}\n.bs-resizer {\n  flex: 0 0 5px;\n  cursor: col-resize;\n  touch-action: none;\n  border-left: 1px solid var(--bs-line);\n  background: transparent;\n}\n.bs-resizer:hover {\n  background: var(--bs-accent);\n}\n.bs-toc-resizer {\n  flex-basis: 5px;\n  margin-right: -4px;\n  position: relative;\n  z-index: 1;\n}\n.bs-lookup-resizer {\n  cursor: row-resize;\n  border-left: 0;\n  border-top: 1px solid var(--bs-line);\n  margin-bottom: -4px;\n  position: relative;\n  z-index: 1;\n}\n.bs-notice {\n  padding: 10px 22px;\n  background: var(--bs-panel);\n  border-bottom: 1px solid var(--bs-line);\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  line-height: 1.6;\n  flex-shrink: 0;\n}\n.bs-import-progress {\n  padding: 10px;\n  background: var(--bs-panel);\n  display: flex;\n  gap: 15px;\n  align-items: center;\n  margin-bottom: 20px;\n  font-size: 12px;\n}\n.bs-import-progress progress {\n  width: 90px;\n  accent-color: var(--bs-accent);\n}\n.bs-import-result {\n  margin: 0 0 20px;\n  color: var(--bs-muted);\n  font-size: 11px;\n}\n.bs-import-result p {\n  overflow-wrap: anywhere;\n}\n.bs-results > button {\n  display: block;\n  width: 100%;\n  text-align: left;\n  border: 1px solid var(--bs-line);\n  margin-bottom: 10px;\n  padding: 15px;\n  line-height: 1.8;\n}\n.bs-results small {\n  color: var(--bs-muted);\n}\n.bs-results p {\n  margin: 8px 0;\n}\n.bs-results span {\n  color: var(--bs-accent);\n  font-size: 11px;\n}\n.bs-load-more {\n  display: block !important;\n  margin: 25px auto;\n}\n.bs-reader {\n  flex: 1;\n  min-width: 300px;\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n}\n.bs-reader-toolbar {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 10px 15px;\n  border-bottom: 1px solid var(--bs-line);\n  flex-shrink: 0;\n}\n.bs-reader-toolbar > span {\n  flex: 1;\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  text-align: center;\n  font-size: 12px;\n  color: var(--bs-muted);\n  padding: 0 8px;\n}\n.bs-reader-body {\n  --toc-width: 158px;\n  flex: 1;\n  min-height: 0;\n  display: flex;\n}\n.bs-toc {\n  flex: 0 0 min(var(--toc-width), 50%);\n  padding: 12px 9px;\n  overflow: auto;\n}\n.bs-toc > .bs-tabs {\n  position: sticky;\n  top: -12px;\n  background: var(--bs-bg);\n  padding: 5px 0 10px;\n}\n.bs-toc > button {\n  display: flex;\n  width: 100%;\n  justify-content: flex-start;\n  text-align: left;\n  font-size: 11px;\n  line-height: 1.8;\n  margin: 3px 0;\n  gap: 8px;\n}\n.bs-toc button small {\n  opacity: 0.5;\n  font-size: 10px;\n}\n.bs-toc .bs-selected {\n  background: var(--bs-panel);\n  color: var(--bs-accent);\n}\n.bs-page-column {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n}\n.bs-page {\n  flex: 1;\n  min-width: 0;\n  min-height: 0;\n  overflow: auto;\n  padding: 35px clamp(25px, 4vw, 70px) 70px;\n  scrollbar-gutter: stable;\n  line-height: 1.95;\n  font-family: Georgia, "Songti SC", "Noto Serif CJK SC", serif;\n}\n.bs-page-heading small {\n  font: 11px system-ui;\n  color: var(--bs-muted);\n}\n.bs-page-heading h1 {\n  font-size: 1.6em;\n  line-height: 1.5;\n  font-weight: 500;\n  margin: 12px 0 35px;\n}\n.bs-block {\n  position: relative;\n  border-radius: 3px;\n  scroll-margin-top: 30px;\n}\n.bs-block p {\n  margin: 0 0 1.1em;\n}\n.bs-block img {\n  max-width: 100%;\n  height: auto;\n  display: block;\n  margin: auto;\n}\n.bs-block pre {\n  overflow: auto;\n  font-size: 0.8em;\n  background: var(--bs-panel);\n  padding: 14px;\n}\n.bs-block table {\n  border-collapse: collapse;\n  font-size: 0.8em;\n  display: block;\n  overflow: auto;\n}\n.bs-block td,\n.bs-block th {\n  border: 1px solid var(--bs-line);\n  padding: 6px;\n}\n.bs-block h1,\n.bs-block h2,\n.bs-block h3 {\n  font-size: 1.25em;\n  font-weight: 600;\n  line-height: 1.6;\n}\n.bs-block blockquote {\n  border-left: 2px solid var(--bs-accent);\n  margin: 1em 0;\n  padding-left: 20px;\n  color: var(--bs-muted);\n}\n.bs-page ::highlight(bs-highlight) {\n  background-color: rgb(232 190 72 / 0.3);\n}\n.bs-paper .bs-page ::highlight(bs-highlight) {\n  background-color: rgb(244 196 48 / 0.45);\n}\n.bs-app .bs-bookmark {\n  position: absolute;\n  left: -25px;\n  top: 3px;\n  font: 14px system-ui;\n  padding: 2px 4px;\n  opacity: 0;\n  color: var(--bs-muted);\n}\n.bs-block:hover .bs-bookmark,\n.bs-bookmark:focus-visible {\n  opacity: 1;\n}\n.bs-app .bs-bookmarked .bs-bookmark {\n  opacity: 1;\n  color: var(--bs-accent);\n}\n.bs-flash {\n  animation: bs-flash 2.4s ease-out;\n}\n.bs-chapter-nav {\n  display: flex;\n  justify-content: space-between;\n  border-top: 1px solid var(--bs-line);\n  padding-top: 20px;\n  margin-top: 40px;\n  font: 12px system-ui;\n}\n.bs-paper .bs-page {\n  background: #f1eadb;\n  color: #39392f;\n}\n.bs-paper .bs-page .bs-muted,\n.bs-paper .bs-page-heading small {\n  color: #747464;\n}\n.bs-note {\n  border-bottom: 1px solid var(--bs-line);\n  padding: 10px 0;\n  font-size: 11px;\n}\n.bs-note > button {\n  text-align: left;\n  display: -webkit-box;\n  -webkit-line-clamp: 4;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  line-height: 1.8;\n  padding: 0;\n}\n.bs-note p {\n  line-height: 1.8;\n  color: var(--bs-muted);\n  white-space: pre-wrap;\n}\n.bs-note > div button {\n  font-size: 10px;\n  color: var(--bs-muted);\n  padding: 4px;\n}\n.bs-modal {\n  --bs-bg: var(--dsw-alias-bg-base, #202122);\n  --bs-panel: var(--dsw-alias-bg-layer-1, #303331);\n  --bs-text: var(--dsw-alias-label-primary, #eeefeb);\n  --bs-muted: var(--dsw-alias-label-tertiary, #999d99);\n  --bs-line: var(--dsw-alias-border-l1, #424441);\n  --bs-accent: var(--dsw-alias-brand-primary, #80ab99);\n  background: var(--bs-bg);\n  color: var(--bs-text);\n  border: 1px solid var(--bs-line);\n  border-radius: 14px;\n  max-width: min(480px, calc(100vw - 36px));\n  width: 480px;\n  max-height: 85vh;\n  padding: 22px;\n  box-shadow: 0 18px 80px #0006;\n  font: 13px system-ui;\n  overflow: auto;\n}\n.bs-modal::backdrop {\n  background: #0006;\n  backdrop-filter: blur(4px);\n}\n.bs-modal header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 10px;\n  margin-bottom: 18px;\n}\n.bs-modal h3 {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 550;\n}\n.bs-modal label {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  margin: 15px 0;\n  color: var(--bs-muted);\n  font-size: 12px;\n}\n.bs-modal input,\n.bs-modal textarea,\n.bs-modal select {\n  width: 100%;\n  padding: 10px;\n  background: var(--bs-panel);\n  border: 1px solid var(--bs-line);\n  border-radius: 7px;\n  outline: 0;\n  color: var(--bs-text);\n}\n.bs-modal textarea {\n  min-height: 130px;\n  resize: vertical;\n}\n.bs-modal footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: 8px;\n  margin-top: 22px;\n}\n.bs-modal blockquote {\n  border-left: 2px solid var(--bs-accent);\n  margin: 0 0 16px;\n  padding: 8px 14px;\n  max-height: 160px;\n  overflow: auto;\n  line-height: 1.8;\n  color: var(--bs-muted);\n}\n.bs-source,\n.bs-roots p {\n  font-size: 11px;\n  overflow-wrap: anywhere;\n  line-height: 1.7;\n}\n.bs-error {\n  padding: 12px;\n  border: 1px solid var(--bs-line);\n  border-radius: 7px;\n  line-height: 1.7;\n  overflow-wrap: anywhere;\n}\n.bs-error button {\n  display: block;\n  margin-top: 8px;\n}\n.bs-top button {\n  app-region: no-drag;\n}\n.bs-assistant-hidden .bs-library {\n  max-width: 1350px;\n  margin: 0 auto;\n  width: 100%;\n}\n@keyframes bs-flash {\n  0%,\n  25% {\n    background: color-mix(in srgb, var(--bs-accent) 28%, transparent);\n  }\n  100% {\n    background: transparent;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  .bs-app * {\n    animation: none !important;\n    transition: none !important;\n  }\n}\n@media (max-width: 1100px) {\n  .bs-app {\n    --assistant-width: 310px;\n  }\n  .bs-library {\n    padding: 28px 24px;\n  }\n  .bs-grid {\n    gap: 22px 18px;\n    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));\n  }\n  .bs-reader-body {\n    --toc-width: 120px;\n  }\n  .bs-page {\n    padding: 25px 27px 50px;\n  }\n  .bs-assistant header {\n    padding: 12px;\n  }\n  .bs-library-heading {\n    gap: 14px;\n  }\n}\n@media (max-width: 760px) {\n  .bs-workspace {\n    position: relative;\n  }\n  .bs-assistant {\n    position: absolute;\n    inset: 0 0 0 auto;\n    width: min(100%, 365px);\n    z-index: 4;\n    border-left: 1px solid var(--bs-line);\n    box-shadow: -16px 0 50px #0004;\n  }\n  .bs-resizer {\n    display: none;\n  }\n  .bs-library {\n    min-width: 0;\n    padding: 24px 18px;\n  }\n  .bs-grid {\n    grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));\n  }\n  .bs-top {\n    padding: 0 16px;\n  }\n  .bs-library h1 {\n    font-size: 26px;\n  }\n  .bs-reader-body {\n    --toc-width: 100px;\n  }\n  .bs-toc {\n    padding: 8px 4px;\n  }\n  .bs-reader-body .bs-toc-resizer,\n  .bs-lookup > .bs-lookup-resizer {\n    display: block;\n  }\n  .bs-toc .bs-tabs button {\n    font-size: 10px;\n    padding: 5px;\n  }\n  .bs-reader {\n    min-width: 0;\n  }\n  .bs-reader-toolbar {\n    padding: 8px 5px;\n  }\n  .bs-reader-toolbar button {\n    font-size: 11px;\n    padding: 5px;\n  }\n  .bs-page {\n    padding: 24px 22px;\n  }\n  .bs-filter-row > .bs-tabs {\n    gap: 0;\n  }\n  .bs-filter-row > .bs-tabs button {\n    font-size: 11px;\n    padding: 6px;\n  }\n  .bs-filter-row select {\n    font-size: 10px;\n    max-width: 88px;\n  }\n}\n.bs-selection-bar {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 9px 12px;\n  border-top: 1px solid var(--bs-line);\n  background: var(--bs-panel);\n  flex-shrink: 0;\n  font: 12px system-ui;\n}\n.bs-selection-bar span {\n  flex: 1;\n  min-width: 0;\n  max-height: 7.5em;\n  overflow: auto;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n  color: var(--bs-muted);\n}\n.bs-selection-bar button {\n  white-space: nowrap;\n  border-color: var(--bs-line);\n}\n.bs-highlight-bar span {\n  white-space: pre-line;\n}\n.bs-highlight-bar b {\n  color: var(--bs-text);\n  font-weight: 600;\n  margin-right: 8px;\n}\n.bs-message-text {\n  white-space: normal;\n}\n.bs-message-text p {\n  margin: 0 0 0.9em;\n}\n.bs-message-text a {\n  color: var(--dsw-alias-brand-text, var(--bs-text));\n  text-decoration: underline;\n  text-underline-offset: 3px;\n}\n.bs-message-text a[href^="bookshelf:"] {\n  display: inline-block;\n  max-width: 100%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  vertical-align: bottom;\n  border-bottom: 1px solid var(--bs-line);\n  text-decoration: none;\n  padding: 0 3px;\n}\n.bs-message-text a[href^="bookshelf:"]::after {\n  content: " \u2197";\n  color: var(--bs-muted);\n}\n.bs-message-text blockquote {\n  margin: 10px 0;\n  border-left: 2px solid var(--bs-accent);\n  padding-left: 12px;\n  color: var(--bs-muted);\n}\n.bs-message-text pre {\n  background: var(--bs-panel);\n  padding: 10px;\n  overflow: auto;\n}\n.bs-message-text h1,\n.bs-message-text h2,\n.bs-message-text h3 {\n  font-size: 1.1em;\n  margin: 20px 0 12px;\n}\n.bs-message-text ul,\n.bs-message-text ol {\n  padding-left: 22px;\n}\n.bs-message-text table {\n  font-size: 12px;\n  display: block;\n  overflow: auto;\n  border-collapse: collapse;\n}\n.bs-message-text th,\n.bs-message-text td {\n  border: 1px solid var(--bs-line);\n  padding: 5px 8px;\n}\n.bs-lookup {\n  flex: 0 0 auto;\n  height: var(--lookup-height, 240px);\n  min-height: 120px;\n  max-height: 75%;\n  display: flex;\n  flex-direction: column;\n  background: var(--bs-panel);\n  font: 13px/1.7 system-ui;\n}\n.bs-lookup > header,\n.bs-lookup > footer {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 7px 12px 7px 16px;\n}\n.bs-lookup > header {\n  border-bottom: 1px solid var(--bs-line);\n}\n.bs-lookup > header strong {\n  font-size: 12px;\n  color: var(--bs-accent);\n}\n.bs-lookup > header span {\n  flex: 1;\n  min-width: 0;\n  max-height: 6.4em;\n  overflow: auto;\n  overflow-wrap: anywhere;\n  color: var(--bs-muted);\n  font:\n    15px/1.6 Georgia,\n    "Songti SC",\n    "Noto Serif CJK SC",\n    serif;\n}\n.bs-lookup > footer small {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--bs-muted);\n  font-size: 12px;\n}\n.bs-lookup > footer {\n  border-top: 1px solid var(--bs-line);\n  flex-wrap: wrap;\n}\n.bs-lookup > footer small {\n  font-size: 11px;\n}\n.bs-lookup > footer button,\n.bs-context-explain > button,\n.bs-dict-setup form button {\n  border-color: var(--bs-line);\n  font-size: 12px;\n  white-space: nowrap;\n}\n.bs-lookup-body {\n  flex: 1;\n  min-height: 0;\n  overflow: auto;\n  padding: 12px 16px 8px;\n}\n.bs-lookup .bs-error {\n  margin: 8px 0;\n}\n.bs-translation {\n  margin: 0 0 8px;\n  white-space: pre-wrap;\n  font-family: Georgia, "Songti SC", "Noto Serif CJK SC", serif;\n  font-size: 15px;\n  line-height: 1.85;\n}\n.bs-dict-entry {\n  padding-bottom: 10px;\n  margin-bottom: 10px;\n  border-bottom: 1px dashed var(--bs-line);\n}\n.bs-dict-entry h4 {\n  margin: 0;\n  display: flex;\n  align-items: baseline;\n  flex-wrap: wrap;\n  gap: 10px;\n  font-size: 17px;\n  font-weight: 600;\n}\n.bs-phonetic {\n  font-size: 13px;\n  font-weight: 400;\n  color: var(--bs-muted);\n}\n.bs-dict-via {\n  margin: 0 0 4px;\n  font-size: 11px;\n  color: var(--bs-accent);\n}\n.bs-dict-tags {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 5px;\n  margin: 5px 0 2px;\n}\n.bs-dict-tags span {\n  padding: 0 6px;\n  border: 1px solid var(--bs-line);\n  border-radius: 4px;\n  font-size: 10px;\n  color: var(--bs-muted);\n}\n.bs-dict-entry ul {\n  margin: 6px 0;\n  padding-left: 18px;\n}\n.bs-pos {\n  margin-right: 4px;\n  color: var(--bs-muted);\n}\n.bs-app .bs-sense {\n  display: inline;\n  padding: 1px 3px;\n  border: 0;\n  border-radius: 4px;\n  line-height: inherit;\n  text-align: left;\n  white-space: normal;\n}\n.bs-app .bs-sense[aria-pressed="true"] {\n  background: color-mix(in srgb, var(--bs-accent) 28%, transparent);\n  box-shadow: inset 0 -1.5px 0 var(--bs-accent);\n}\n.bs-sense-hint {\n  margin: 0 0 8px;\n  font-size: 12px;\n}\n.bs-dict-forms {\n  margin: 4px 0;\n  font-size: 12px;\n  color: var(--bs-muted);\n}\n.bs-dict-entry summary {\n  cursor: pointer;\n  font-size: 12px;\n  color: var(--bs-muted);\n}\n.bs-context-explain h4 {\n  margin: 0 0 4px;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 12px;\n  font-weight: 600;\n  color: var(--bs-accent);\n}\n.bs-context-explain h4 .bs-sense {\n  font-size: 11px;\n  font-weight: 400;\n  color: var(--bs-muted);\n}\n.bs-context-explain h4 .bs-sense[aria-pressed="true"] {\n  color: var(--bs-text);\n}\n.bs-context-explain .bs-message-text p:last-child {\n  margin-bottom: 0;\n}\n.bs-dict-setup {\n  display: grid;\n  gap: 10px;\n  padding-bottom: 12px;\n  margin-bottom: 10px;\n  border-bottom: 1px dashed var(--bs-line);\n}\n.bs-dict-setup p {\n  margin: 0;\n}\n.bs-dict-setup > button {\n  justify-self: start;\n}\n.bs-dict-setup form {\n  display: flex;\n  gap: 6px;\n}\n.bs-dict-setup input {\n  flex: 1;\n  min-width: 0;\n  padding: 6px 10px;\n  border: 1px solid var(--bs-line);\n  border-radius: 7px;\n  background: var(--bs-bg);\n}\n.bs-badge {\n  margin-left: 6px;\n  padding: 0 6px;\n  border-radius: 9px;\n  background: var(--bs-accent);\n  color: var(--dsw-alias-label-primary-inverted, #10271f);\n  font-size: 11px;\n  font-weight: 600;\n  line-height: 17px;\n}\n.bs-review .bs-filter-row > button {\n  border-color: var(--bs-line);\n  font-size: 12px;\n}\n.bs-review-card {\n  max-width: 680px;\n  margin: 36px auto 0;\n  padding: 26px 30px 20px;\n  border: 1px solid var(--bs-line);\n  border-radius: 12px;\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n}\n.bs-review-card h2 {\n  font-size: 34px;\n  font-weight: 500;\n  letter-spacing: 0.5px;\n  margin: 4px 0 0;\n  overflow-wrap: anywhere;\n}\n.bs-review-card blockquote {\n  margin: 4px 0 0;\n  font-size: 18px;\n  line-height: 1.8;\n  max-height: 40vh;\n  overflow: auto;\n}\n.bs-review-context {\n  margin: 0;\n  font-size: 15px;\n  line-height: 1.8;\n  color: var(--bs-muted);\n}\n.bs-review mark {\n  background: rgb(232 190 72 / 0.3);\n  color: var(--bs-text);\n  border-radius: 2px;\n  padding: 0 2px;\n}\n.bs-review-answer {\n  border-top: 1px dashed var(--bs-line);\n  padding-top: 14px;\n}\n.bs-review-answer p {\n  margin: 0 0 10px;\n  font-size: 15px;\n  line-height: 1.8;\n  white-space: pre-line;\n}\n.bs-app .bs-review-answer button {\n  padding: 0;\n  font-size: 12px;\n  color: var(--bs-accent);\n}\n.bs-review-card footer {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 8px;\n  margin-top: 4px;\n}\n.bs-review-card footer .bs-primary {\n  grid-column: 1 / -1;\n  justify-content: center;\n  padding: 10px;\n}\n.bs-app .bs-review-card footer button:not(.bs-primary) {\n  flex-direction: column;\n  justify-content: center;\n  gap: 2px;\n  padding: 9px 6px;\n  border-color: var(--bs-line);\n}\n.bs-review-card footer small {\n  color: var(--bs-muted);\n  font-size: 11px;\n}\n.bs-review-hint {\n  margin: 0;\n  font-size: 11px;\n  text-align: center;\n}\n.bs-review-list article {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 12px 0;\n  border-bottom: 1px solid var(--bs-line);\n}\n.bs-review-list article > div {\n  flex: 1;\n  min-width: 0;\n}\n.bs-review-list strong {\n  font-weight: 550;\n  overflow-wrap: anywhere;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n.bs-review-list p {\n  margin: 4px 0;\n  color: var(--bs-muted);\n  font-size: 12px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.bs-review-list small {\n  color: var(--bs-muted);\n  font-size: 11px;\n}\n.bs-app .bs-review-list button {\n  font-size: 11px;\n  color: var(--bs-muted);\n  border-color: var(--bs-line);\n}\n';

// node_modules/marked/lib/marked.esm.js
function L() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var T = L();
function Z(u3) {
  T = u3;
}
var C = { exec: () => null };
function k(u3, e = "") {
  let t = typeof u3 == "string" ? u3 : u3.source, n = { replace: (r, i) => {
    let s = typeof i == "string" ? i : i.source;
    return s = s.replace(m.caret, "$1"), t = t.replace(r, s), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var me = (() => {
  try {
    return !!new RegExp("(?<=1)(?<!1)");
  } catch {
    return false;
  }
})();
var m = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceTabs: /^\t+/, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (u3) => new RegExp(`^( {0,3}${u3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}#`), htmlBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}<(?:[a-z].*>|!--)`, "i") };
var xe = /^(?:[ \t]*(?:\n|$))+/;
var be = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var Re = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var I = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var Te = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var N = /(?:[*+-]|\d{1,9}[.)])/;
var re = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var se = k(re).replace(/bull/g, N).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var Oe = k(re).replace(/bull/g, N).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var Q = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
var we = /^[^\n]+/;
var F = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
var ye = k(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", F).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var Pe = k(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, N).getRegex();
var v = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var j = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var Se = k("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", j).replace("tag", v).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var ie = k(Q).replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex();
var $e = k(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ie).getRegex();
var U = { blockquote: $e, code: be, def: ye, fences: Re, heading: Te, hr: I, html: Se, lheading: se, list: Pe, newline: xe, paragraph: ie, table: C, text: we };
var te = k("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex();
var _e = { ...U, lheading: Oe, table: te, paragraph: k(Q).replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", te).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex() };
var Le = { ...U, html: k(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", j).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: C, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: k(Q).replace("hr", I).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", se).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Me = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var ze = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var oe = /^( {2,}|\\)\n(?!\s*$)/;
var Ae = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var D = /[\p{P}\p{S}]/u;
var K = /[\s\p{P}\p{S}]/u;
var ae = /[^\s\p{P}\p{S}]/u;
var Ce = k(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, K).getRegex();
var le = /(?!~)[\p{P}\p{S}]/u;
var Ie = /(?!~)[\s\p{P}\p{S}]/u;
var Ee = /(?:[^\s\p{P}\p{S}]|~)/u;
var Be = k(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", me ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
var ue = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
var qe = k(ue, "u").replace(/punct/g, D).getRegex();
var ve = k(ue, "u").replace(/punct/g, le).getRegex();
var pe = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var De = k(pe, "gu").replace(/notPunctSpace/g, ae).replace(/punctSpace/g, K).replace(/punct/g, D).getRegex();
var He = k(pe, "gu").replace(/notPunctSpace/g, Ee).replace(/punctSpace/g, Ie).replace(/punct/g, le).getRegex();
var Ze = k("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ae).replace(/punctSpace/g, K).replace(/punct/g, D).getRegex();
var Ge = k(/\\(punct)/, "gu").replace(/punct/g, D).getRegex();
var Ne = k(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var Qe = k(j).replace("(?:-->|$)", "-->").getRegex();
var Fe = k("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Qe).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var q = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/;
var je = k(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", q).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var ce = k(/^!?\[(label)\]\[(ref)\]/).replace("label", q).replace("ref", F).getRegex();
var he = k(/^!?\[(ref)\](?:\[\])?/).replace("ref", F).getRegex();
var Ue = k("reflink|nolink(?!\\()", "g").replace("reflink", ce).replace("nolink", he).getRegex();
var ne = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
var W = { _backpedal: C, anyPunctuation: Ge, autolink: Ne, blockSkip: Be, br: oe, code: ze, del: C, emStrongLDelim: qe, emStrongRDelimAst: De, emStrongRDelimUnd: Ze, escape: Me, link: je, nolink: he, punctuation: Ce, reflink: ce, reflinkSearch: Ue, tag: Fe, text: Ae, url: C };
var Ke = { ...W, link: k(/^!?\[(label)\]\((.*?)\)/).replace("label", q).getRegex(), reflink: k(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", q).getRegex() };
var G = { ...W, emStrongRDelimAst: He, emStrongLDelim: ve, url: k(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", ne).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: k(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", ne).getRegex() };
var We = { ...G, br: k(oe).replace("{2,}", "*").getRegex(), text: k(G.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var E = { normal: U, gfm: _e, pedantic: Le };
var M = { normal: W, gfm: G, breaks: We, pedantic: Ke };
var Xe = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var ke = (u3) => Xe[u3];
function w(u3, e) {
  if (e) {
    if (m.escapeTest.test(u3)) return u3.replace(m.escapeReplace, ke);
  } else if (m.escapeTestNoEncode.test(u3)) return u3.replace(m.escapeReplaceNoEncode, ke);
  return u3;
}
function X(u3) {
  try {
    u3 = encodeURI(u3).replace(m.percentDecode, "%");
  } catch {
    return null;
  }
  return u3;
}
function J(u3, e) {
  let t = u3.replace(m.findPipe, (i, s, a) => {
    let o = false, l = s;
    for (; --l >= 0 && a[l] === "\\"; ) o = !o;
    return o ? "|" : " |";
  }), n = t.split(m.splitPipe), r = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
  else for (; n.length < e; ) n.push("");
  for (; r < n.length; r++) n[r] = n[r].trim().replace(m.slashPipe, "|");
  return n;
}
function z2(u3, e, t) {
  let n = u3.length;
  if (n === 0) return "";
  let r = 0;
  for (; r < n; ) {
    let i = u3.charAt(n - r - 1);
    if (i === e && !t) r++;
    else if (i !== e && t) r++;
    else break;
  }
  return u3.slice(0, n - r);
}
function de(u3, e) {
  if (u3.indexOf(e[1]) === -1) return -1;
  let t = 0;
  for (let n = 0; n < u3.length; n++) if (u3[n] === "\\") n++;
  else if (u3[n] === e[0]) t++;
  else if (u3[n] === e[1] && (t--, t < 0)) return n;
  return t > 0 ? -2 : -1;
}
function ge(u3, e, t, n, r) {
  let i = e.href, s = e.title || null, a = u3[1].replace(r.other.outputLinkReplace, "$1");
  n.state.inLink = true;
  let o = { type: u3[0].charAt(0) === "!" ? "image" : "link", raw: t, href: i, title: s, text: a, tokens: n.inlineTokens(a) };
  return n.state.inLink = false, o;
}
function Je(u3, e, t) {
  let n = u3.match(t.other.indentCodeCompensation);
  if (n === null) return e;
  let r = n[1];
  return e.split(`
`).map((i) => {
    let s = i.match(t.other.beginningSpace);
    if (s === null) return i;
    let [a] = s;
    return a.length >= r.length ? i.slice(r.length) : i;
  }).join(`
`);
}
var y = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || T;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : z2(n, `
`) };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], r = Je(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: r };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let r = z2(n, "#");
        (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
      }
      return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: z2(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = z2(t[0], `
`).split(`
`), r = "", i = "", s = [];
      for (; n.length > 0; ) {
        let a = false, o = [], l;
        for (l = 0; l < n.length; l++) if (this.rules.other.blockquoteStart.test(n[l])) o.push(n[l]), a = true;
        else if (!a) o.push(n[l]);
        else break;
        n = n.slice(l);
        let p = o.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        r = r ? `${r}
${p}` : p, i = i ? `${i}
${c}` : c;
        let g = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(c, s, true), this.lexer.state.top = g, n.length === 0) break;
        let h = s.at(-1);
        if (h?.type === "code") break;
        if (h?.type === "blockquote") {
          let R = h, f = R.raw + `
` + n.join(`
`), O = this.blockquote(f);
          s[s.length - 1] = O, r = r.substring(0, r.length - R.raw.length) + O.raw, i = i.substring(0, i.length - R.text.length) + O.text;
          break;
        } else if (h?.type === "list") {
          let R = h, f = R.raw + `
` + n.join(`
`), O = this.list(f);
          s[s.length - 1] = O, r = r.substring(0, r.length - h.raw.length) + O.raw, i = i.substring(0, i.length - R.raw.length) + O.raw, n = f.substring(s.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: r, tokens: s, text: i };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), r = n.length > 1, i = { type: "list", raw: "", ordered: r, start: r ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
      let s = this.rules.other.listItemRegex(n), a = false;
      for (; e; ) {
        let l = false, p = "", c = "";
        if (!(t = s.exec(e)) || this.rules.block.hr.test(e)) break;
        p = t[0], e = e.substring(p.length);
        let g = t[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (O) => " ".repeat(3 * O.length)), h = e.split(`
`, 1)[0], R = !g.trim(), f = 0;
        if (this.options.pedantic ? (f = 2, c = g.trimStart()) : R ? f = t[1].length + 1 : (f = t[2].search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = g.slice(f), f += t[1].length), R && this.rules.other.blankLine.test(h) && (p += h + `
`, e = e.substring(h.length + 1), l = true), !l) {
          let O = this.rules.other.nextBulletRegex(f), V = this.rules.other.hrRegex(f), Y = this.rules.other.fencesBeginRegex(f), ee = this.rules.other.headingBeginRegex(f), fe = this.rules.other.htmlBeginRegex(f);
          for (; e; ) {
            let H = e.split(`
`, 1)[0], A;
            if (h = H, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), A = h) : A = h.replace(this.rules.other.tabCharGlobal, "    "), Y.test(h) || ee.test(h) || fe.test(h) || O.test(h) || V.test(h)) break;
            if (A.search(this.rules.other.nonSpaceChar) >= f || !h.trim()) c += `
` + A.slice(f);
            else {
              if (R || g.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Y.test(g) || ee.test(g) || V.test(g)) break;
              c += `
` + h;
            }
            !R && !h.trim() && (R = true), p += H + `
`, e = e.substring(H.length + 1), g = A.slice(f);
          }
        }
        i.loose || (a ? i.loose = true : this.rules.other.doubleBlankLine.test(p) && (a = true)), i.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), i.raw += p;
      }
      let o = i.items.at(-1);
      if (o) o.raw = o.raw.trimEnd(), o.text = o.text.trimEnd();
      else return;
      i.raw = i.raw.trimEnd();
      for (let l of i.items) {
        if (this.lexer.state.top = false, l.tokens = this.lexer.blockTokens(l.text, []), l.task) {
          if (l.text = l.text.replace(this.rules.other.listReplaceTask, ""), l.tokens[0]?.type === "text" || l.tokens[0]?.type === "paragraph") {
            l.tokens[0].raw = l.tokens[0].raw.replace(this.rules.other.listReplaceTask, ""), l.tokens[0].text = l.tokens[0].text.replace(this.rules.other.listReplaceTask, "");
            for (let c = this.lexer.inlineQueue.length - 1; c >= 0; c--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[c].src)) {
              this.lexer.inlineQueue[c].src = this.lexer.inlineQueue[c].src.replace(this.rules.other.listReplaceTask, "");
              break;
            }
          }
          let p = this.rules.other.listTaskCheckbox.exec(l.raw);
          if (p) {
            let c = { type: "checkbox", raw: p[0] + " ", checked: p[0] !== "[ ]" };
            l.checked = c.checked, i.loose ? l.tokens[0] && ["paragraph", "text"].includes(l.tokens[0].type) && "tokens" in l.tokens[0] && l.tokens[0].tokens ? (l.tokens[0].raw = c.raw + l.tokens[0].raw, l.tokens[0].text = c.raw + l.tokens[0].text, l.tokens[0].tokens.unshift(c)) : l.tokens.unshift({ type: "paragraph", raw: c.raw, text: c.raw, tokens: [c] }) : l.tokens.unshift(c);
          }
        }
        if (!i.loose) {
          let p = l.tokens.filter((g) => g.type === "space"), c = p.length > 0 && p.some((g) => this.rules.other.anyLine.test(g.raw));
          i.loose = c;
        }
      }
      if (i.loose) for (let l of i.items) {
        l.loose = true;
        for (let p of l.tokens) p.type === "text" && (p.type = "paragraph");
      }
      return i;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) return { type: "html", block: true, raw: t[0], pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: t[0] };
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: t[0], href: r, title: i };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = J(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], s = { type: "table", raw: t[0], header: [], align: [], rows: [] };
    if (n.length === r.length) {
      for (let a of r) this.rules.other.tableAlignRight.test(a) ? s.align.push("right") : this.rules.other.tableAlignCenter.test(a) ? s.align.push("center") : this.rules.other.tableAlignLeft.test(a) ? s.align.push("left") : s.align.push(null);
      for (let a = 0; a < n.length; a++) s.header.push({ text: n[a], tokens: this.lexer.inline(n[a]), header: true, align: s.align[a] });
      for (let a of i) s.rows.push(J(a, s.header.length).map((o, l) => ({ text: o, tokens: this.lexer.inline(o), header: false, align: s.align[l] })));
      return s;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) return { type: "heading", raw: t[0], depth: t[2].charAt(0) === "=" ? 1 : 2, text: t[1], tokens: this.lexer.inline(t[1]) };
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n)) return;
        let s = z2(n.slice(0, -1), "\\");
        if ((n.length - s.length) % 2 === 0) return;
      } else {
        let s = de(t[2], "()");
        if (s === -2) return;
        if (s > -1) {
          let o = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
          t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, o).trim(), t[3] = "";
        }
      }
      let r = t[2], i = "";
      if (this.options.pedantic) {
        let s = this.rules.other.pedanticHrefTitle.exec(r);
        s && (r = s[1], i = s[3]);
      } else i = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), ge(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: i && i.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[r.toLowerCase()];
      if (!i) {
        let s = n[0].charAt(0);
        return { type: "text", raw: s, text: s };
      }
      return ge(n, i, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let r = this.rules.inline.emStrongLDelim.exec(e);
    if (!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(r[1] || r[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let s = [...r[0]].length - 1, a, o, l = s, p = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (c.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = c.exec(t)) != null; ) {
        if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a) continue;
        if (o = [...a].length, r[3] || r[4]) {
          l += o;
          continue;
        } else if ((r[5] || r[6]) && s % 3 && !((s + o) % 3)) {
          p += o;
          continue;
        }
        if (l -= o, l > 0) continue;
        o = Math.min(o, o + l + p);
        let g = [...r[0]][0].length, h = e.slice(0, s + r.index + g + o);
        if (Math.min(s, o) % 2) {
          let f = h.slice(1, -1);
          return { type: "em", raw: h, text: f, tokens: this.lexer.inlineTokens(f) };
        }
        let R = h.slice(2, -2);
        return { type: "strong", raw: h, text: R, tokens: this.lexer.inlineTokens(R) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return r && i && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e) {
    let t = this.rules.inline.del.exec(e);
    if (t) return { type: "del", raw: t[0], text: t[2], tokens: this.lexer.inlineTokens(t[2]) };
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, r;
      return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, r;
      if (t[2] === "@") n = t[0], r = "mailto:" + n;
      else {
        let i;
        do
          i = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (i !== t[0]);
        n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: t[0], escaped: n };
    }
  }
};
var x = class u {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || T, this.options.tokenizer = this.options.tokenizer || new y(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, top: true };
    let t = { other: m, block: E.normal, inline: M.normal };
    this.options.pedantic ? (t.block = E.pedantic, t.inline = M.pedantic) : this.options.gfm && (t.block = E.gfm, this.options.breaks ? t.inline = M.breaks : t.inline = M.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: E, inline: M };
  }
  static lex(e, t) {
    return new u(t).lex(e);
  }
  static lexInline(e, t) {
    return new u(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    for (this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, "")); e; ) {
      let r;
      if (this.options.extensions?.block?.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        r.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let i = e;
      if (this.options.extensions?.startBlock) {
        let s = 1 / 0, a = e.slice(1), o;
        this.options.extensions.startBlock.forEach((l) => {
          o = l.call({ lexer: this }, a), typeof o == "number" && o >= 0 && (s = Math.min(s, o));
        }), s < 1 / 0 && s >= 0 && (i = e.substring(0, s + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(i))) {
        let s = t.at(-1);
        n && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (e) {
        let s = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(s);
          break;
        } else throw new Error(s);
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  inlineTokens(e, t = []) {
    let n = e, r = null;
    if (this.tokens.links) {
      let o = Object.keys(this.tokens.links);
      if (o.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; ) o.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; ) n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let i;
    for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; ) i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let s = false, a = "";
    for (; e; ) {
      s || (a = ""), s = false;
      let o;
      if (this.options.extensions?.inline?.some((p) => (o = p.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false)) continue;
      if (o = this.tokenizer.escape(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.tag(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.link(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(o.raw.length);
        let p = t.at(-1);
        o.type === "text" && p?.type === "text" ? (p.raw += o.raw, p.text += o.text) : t.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(e, n, a)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.codespan(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.br(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.del(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.autolink(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (!this.state.inLink && (o = this.tokenizer.url(e))) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      let l = e;
      if (this.options.extensions?.startInline) {
        let p = 1 / 0, c = e.slice(1), g;
        this.options.extensions.startInline.forEach((h) => {
          g = h.call({ lexer: this }, c), typeof g == "number" && g >= 0 && (p = Math.min(p, g));
        }), p < 1 / 0 && p >= 0 && (l = e.substring(0, p + 1));
      }
      if (o = this.tokenizer.inlineText(l)) {
        e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (a = o.raw.slice(-1)), s = true;
        let p = t.at(-1);
        p?.type === "text" ? (p.raw += o.raw, p.text += o.text) : t.push(o);
        continue;
      }
      if (e) {
        let p = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(p);
          break;
        } else throw new Error(p);
      }
    }
    return t;
  }
};
var P = class {
  options;
  parser;
  constructor(e) {
    this.options = e || T;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let r = (t || "").match(m.notSpaceStart)?.[0], i = e.replace(m.endingNewline, "") + `
`;
    return r ? '<pre><code class="language-' + w(r) + '">' + (n ? i : w(i, true)) + `</code></pre>
` : "<pre><code>" + (n ? i : w(i, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, r = "";
    for (let a = 0; a < e.items.length; a++) {
      let o = e.items[a];
      r += this.listitem(o);
    }
    let i = t ? "ol" : "ul", s = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + i + s + `>
` + r + "</" + i + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let i = 0; i < e.header.length; i++) n += this.tablecell(e.header[i]);
    t += this.tablerow({ text: n });
    let r = "";
    for (let i = 0; i < e.rows.length; i++) {
      let s = e.rows[i];
      n = "";
      for (let a = 0; a < s.length; a++) n += this.tablecell(s[a]);
      r += this.tablerow({ text: n });
    }
    return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${w(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let r = this.parser.parseInline(n), i = X(e);
    if (i === null) return r;
    e = i;
    let s = '<a href="' + e + '"';
    return t && (s += ' title="' + w(t) + '"'), s += ">" + r + "</a>", s;
  }
  image({ href: e, title: t, text: n, tokens: r }) {
    r && (n = this.parser.parseInline(r, this.parser.textRenderer));
    let i = X(e);
    if (i === null) return w(n);
    e = i;
    let s = `<img src="${e}" alt="${n}"`;
    return t && (s += ` title="${w(t)}"`), s += ">", s;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : w(e.text);
  }
};
var $ = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
};
var b = class u2 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || T, this.options.renderer = this.options.renderer || new P(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $();
  }
  static parse(e, t) {
    return new u2(t).parse(e);
  }
  static parseInline(e, t) {
    return new u2(t).parseInline(e);
  }
  parse(e) {
    let t = "";
    for (let n = 0; n < e.length; n++) {
      let r = e[n];
      if (this.options.extensions?.renderers?.[r.type]) {
        let s = r, a = this.options.extensions.renderers[s.type].call({ parser: this }, s);
        if (a !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(s.type)) {
          t += a || "";
          continue;
        }
      }
      let i = r;
      switch (i.type) {
        case "space": {
          t += this.renderer.space(i);
          break;
        }
        case "hr": {
          t += this.renderer.hr(i);
          break;
        }
        case "heading": {
          t += this.renderer.heading(i);
          break;
        }
        case "code": {
          t += this.renderer.code(i);
          break;
        }
        case "table": {
          t += this.renderer.table(i);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(i);
          break;
        }
        case "list": {
          t += this.renderer.list(i);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(i);
          break;
        }
        case "html": {
          t += this.renderer.html(i);
          break;
        }
        case "def": {
          t += this.renderer.def(i);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(i);
          break;
        }
        case "text": {
          t += this.renderer.text(i);
          break;
        }
        default: {
          let s = 'Token with "' + i.type + '" type was not found.';
          if (this.options.silent) return console.error(s), "";
          throw new Error(s);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    let n = "";
    for (let r = 0; r < e.length; r++) {
      let i = e[r];
      if (this.options.extensions?.renderers?.[i.type]) {
        let a = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (a !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
          n += a || "";
          continue;
        }
      }
      let s = i;
      switch (s.type) {
        case "escape": {
          n += t.text(s);
          break;
        }
        case "html": {
          n += t.html(s);
          break;
        }
        case "link": {
          n += t.link(s);
          break;
        }
        case "image": {
          n += t.image(s);
          break;
        }
        case "checkbox": {
          n += t.checkbox(s);
          break;
        }
        case "strong": {
          n += t.strong(s);
          break;
        }
        case "em": {
          n += t.em(s);
          break;
        }
        case "codespan": {
          n += t.codespan(s);
          break;
        }
        case "br": {
          n += t.br(s);
          break;
        }
        case "del": {
          n += t.del(s);
          break;
        }
        case "text": {
          n += t.text(s);
          break;
        }
        default: {
          let a = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent) return console.error(a), "";
          throw new Error(a);
        }
      }
    }
    return n;
  }
};
var S = class {
  options;
  block;
  constructor(e) {
    this.options = e || T;
  }
  static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer() {
    return this.block ? x.lex : x.lexInline;
  }
  provideParser() {
    return this.block ? b.parse : b.parseInline;
  }
};
var B = class {
  defaults = L();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = b;
  Renderer = P;
  TextRenderer = $;
  Lexer = x;
  Tokenizer = y;
  Hooks = S;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let r of e) switch (n = n.concat(t.call(this, r)), r.type) {
      case "table": {
        let i = r;
        for (let s of i.header) n = n.concat(this.walkTokens(s.tokens, t));
        for (let s of i.rows) for (let a of s) n = n.concat(this.walkTokens(a.tokens, t));
        break;
      }
      case "list": {
        let i = r;
        n = n.concat(this.walkTokens(i.items, t));
        break;
      }
      default: {
        let i = r;
        this.defaults.extensions?.childTokens?.[i.type] ? this.defaults.extensions.childTokens[i.type].forEach((s) => {
          let a = i[s].flat(1 / 0);
          n = n.concat(this.walkTokens(a, t));
        }) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
      }
    }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let r = { ...n };
      if (r.async = this.defaults.async || r.async || false, n.extensions && (n.extensions.forEach((i) => {
        if (!i.name) throw new Error("extension name required");
        if ("renderer" in i) {
          let s = t.renderers[i.name];
          s ? t.renderers[i.name] = function(...a) {
            let o = i.renderer.apply(this, a);
            return o === false && (o = s.apply(this, a)), o;
          } : t.renderers[i.name] = i.renderer;
        }
        if ("tokenizer" in i) {
          if (!i.level || i.level !== "block" && i.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let s = t[i.level];
          s ? s.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
        }
        "childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
      }), r.extensions = t), n.renderer) {
        let i = this.defaults.renderer || new P(this.defaults);
        for (let s in n.renderer) {
          if (!(s in i)) throw new Error(`renderer '${s}' does not exist`);
          if (["options", "parser"].includes(s)) continue;
          let a = s, o = n.renderer[a], l = i[a];
          i[a] = (...p) => {
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c || "";
          };
        }
        r.renderer = i;
      }
      if (n.tokenizer) {
        let i = this.defaults.tokenizer || new y(this.defaults);
        for (let s in n.tokenizer) {
          if (!(s in i)) throw new Error(`tokenizer '${s}' does not exist`);
          if (["options", "rules", "lexer"].includes(s)) continue;
          let a = s, o = n.tokenizer[a], l = i[a];
          i[a] = (...p) => {
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c;
          };
        }
        r.tokenizer = i;
      }
      if (n.hooks) {
        let i = this.defaults.hooks || new S();
        for (let s in n.hooks) {
          if (!(s in i)) throw new Error(`hook '${s}' does not exist`);
          if (["options", "block"].includes(s)) continue;
          let a = s, o = n.hooks[a], l = i[a];
          S.passThroughHooks.has(s) ? i[a] = (p) => {
            if (this.defaults.async && S.passThroughHooksRespectAsync.has(s)) return (async () => {
              let g = await o.call(i, p);
              return l.call(i, g);
            })();
            let c = o.call(i, p);
            return l.call(i, c);
          } : i[a] = (...p) => {
            if (this.defaults.async) return (async () => {
              let g = await o.apply(i, p);
              return g === false && (g = await l.apply(i, p)), g;
            })();
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c;
          };
        }
        r.hooks = i;
      }
      if (n.walkTokens) {
        let i = this.defaults.walkTokens, s = n.walkTokens;
        r.walkTokens = function(a) {
          let o = [];
          return o.push(s.call(this, a)), i && (o = o.concat(i.call(this, a))), o;
        };
      }
      this.defaults = { ...this.defaults, ...r };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return x.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return b.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, r) => {
      let i = { ...r }, s = { ...this.defaults, ...i }, a = this.onError(!!s.silent, !!s.async);
      if (this.defaults.async === true && i.async === false) return a(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null) return a(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string") return a(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (s.hooks && (s.hooks.options = s, s.hooks.block = e), s.async) return (async () => {
        let o = s.hooks ? await s.hooks.preprocess(n) : n, p = await (s.hooks ? await s.hooks.provideLexer() : e ? x.lex : x.lexInline)(o, s), c = s.hooks ? await s.hooks.processAllTokens(p) : p;
        s.walkTokens && await Promise.all(this.walkTokens(c, s.walkTokens));
        let h = await (s.hooks ? await s.hooks.provideParser() : e ? b.parse : b.parseInline)(c, s);
        return s.hooks ? await s.hooks.postprocess(h) : h;
      })().catch(a);
      try {
        s.hooks && (n = s.hooks.preprocess(n));
        let l = (s.hooks ? s.hooks.provideLexer() : e ? x.lex : x.lexInline)(n, s);
        s.hooks && (l = s.hooks.processAllTokens(l)), s.walkTokens && this.walkTokens(l, s.walkTokens);
        let c = (s.hooks ? s.hooks.provideParser() : e ? b.parse : b.parseInline)(l, s);
        return s.hooks && (c = s.hooks.postprocess(c)), c;
      } catch (o) {
        return a(o);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let r = "<p>An error occurred:</p><pre>" + w(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(r) : r;
      }
      if (t) return Promise.reject(n);
      throw n;
    };
  }
};
var _ = new B();
function d(u3, e) {
  return _.parse(u3, e);
}
d.options = d.setOptions = function(u3) {
  return _.setOptions(u3), d.defaults = _.defaults, Z(d.defaults), d;
};
d.getDefaults = L;
d.defaults = T;
d.use = function(...u3) {
  return _.use(...u3), d.defaults = _.defaults, Z(d.defaults), d;
};
d.walkTokens = function(u3, e) {
  return _.walkTokens(u3, e);
};
d.parseInline = _.parseInline;
d.Parser = b;
d.parser = b.parse;
d.Renderer = P;
d.TextRenderer = $;
d.Lexer = x;
d.lexer = x.lex;
d.Tokenizer = y;
d.Hooks = S;
d.parse = d;
var Dt = d.options;
var Ht = d.setOptions;
var Zt = d.use;
var Gt = d.walkTokens;
var Nt = d.parseInline;
var Ft = b.parse;
var jt = x.lex;

// node_modules/dompurify/dist/purify.es.mjs
function _OverloadYield(e, d2) {
  this.v = e, this.k = d2;
}
function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u3, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) {
        if (Object(t) !== t) return;
        f = false;
      } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t.return && (u3 = t.return(), Object(u3) !== u3)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}
function AsyncGenerator(e) {
  var t, n;
  function resume(t2, n2) {
    try {
      var r = e[t2](n2), o = r.value, u3 = o instanceof _OverloadYield;
      Promise.resolve(u3 ? o.v : o).then(function(n3) {
        if (u3) {
          var i = "return" === t2 && o.k ? t2 : "next";
          if (!o.k || n3.done) return resume(i, n3);
          n3 = e[i](n3).value;
        }
        settle(!!r.done, n3);
      }, function(e2) {
        resume("throw", e2);
      });
    } catch (e2) {
      settle(2, e2);
    }
  }
  function settle(e2, r) {
    2 === e2 ? t.reject(r) : t.resolve({
      value: r,
      done: e2
    }), (t = t.next) ? resume(t.key, t.arg) : n = null;
  }
  this._invoke = function(e2, r) {
    return new Promise(function(o, u3) {
      var i = {
        key: e2,
        arg: r,
        resolve: o,
        reject: u3,
        next: null
      };
      n ? n = n.next = i : (t = n = i, resume(e2, r));
    });
  }, "function" != typeof e.return && (this.return = void 0);
}
AsyncGenerator.prototype["function" == typeof Symbol && Symbol.asyncIterator || "@@asyncIterator"] = function() {
  return this;
}, AsyncGenerator.prototype.next = function(e) {
  return this._invoke("next", e);
}, AsyncGenerator.prototype.throw = function(e) {
  return this._invoke("throw", e);
}, AsyncGenerator.prototype.return = function(e) {
  return this._invoke("return", e);
};
var entries = Object.entries;
var setPrototypeOf = Object.setPrototypeOf;
var isFrozen = Object.isFrozen;
var getPrototypeOf = Object.getPrototypeOf;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var freeze = Object.freeze;
var seal = Object.seal;
var create = Object.create;
var _ref = typeof Reflect !== "undefined" && Reflect;
var apply = _ref.apply;
var construct = _ref.construct;
if (!freeze) freeze = function freeze2(x2) {
  return x2;
};
if (!seal) seal = function seal2(x2) {
  return x2;
};
if (!apply) apply = function apply2(func, thisArg) {
  for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
  return func.apply(thisArg, args);
};
if (!construct) construct = function construct2(Func) {
  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) args[_key2 - 1] = arguments[_key2];
  return new Func(...args);
};
var arrayForEach = unapply(Array.prototype.forEach);
Array.prototype.indexOf;
var arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
var arrayPop = unapply(Array.prototype.pop);
var arrayPush = unapply(Array.prototype.push);
var arraySlice = unapply(Array.prototype.slice);
var arraySplice = unapply(Array.prototype.splice);
var arrayIsArray = Array.isArray;
var setCreate = unconstruct(Set);
var setAdd = unapply(Set.prototype.add);
var setHas = unapply(Set.prototype.has);
var stringToLowerCase = unapply(String.prototype.toLowerCase);
var stringToString = unapply(String.prototype.toString);
var stringMatch = unapply(String.prototype.match);
var stringReplace = unapply(String.prototype.replace);
var stringIndexOf = unapply(String.prototype.indexOf);
var stringTrim = unapply(String.prototype.trim);
var numberToString = unapply(Number.prototype.toString);
var booleanToString = unapply(Boolean.prototype.toString);
var bigintToString = typeof BigInt === "undefined" ? null : unapply(BigInt.prototype.toString);
var symbolToString = typeof Symbol === "undefined" ? null : unapply(Symbol.prototype.toString);
var objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
var objectToString = unapply(Object.prototype.toString);
var regExpTest = unapply(RegExp.prototype.test);
var typeErrorCreate = unconstruct(TypeError);
function unapply(func) {
  return function(thisArg) {
    if (thisArg instanceof RegExp) thisArg.lastIndex = 0;
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) args[_key3 - 1] = arguments[_key3];
    return apply(func, thisArg, args);
  };
}
function unconstruct(Func) {
  return function() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) args[_key4] = arguments[_key4];
    return construct(Func, args);
  };
}
function addToSet(set, array) {
  let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
  if (setPrototypeOf) setPrototypeOf(set, null);
  if (!arrayIsArray(array)) return set;
  let l = array.length;
  while (l--) {
    let element = array[l];
    if (typeof element === "string") {
      const lcElement = transformCaseFunc(element);
      if (lcElement !== element) {
        if (!isFrozen(array)) array[l] = lcElement;
        element = lcElement;
      }
    }
    set[element] = true;
  }
  return set;
}
function cleanArray(array) {
  for (let index = 0; index < array.length; index++) if (!objectHasOwnProperty(array, index)) array[index] = null;
  return array;
}
function clone(object) {
  const newObject = create(null);
  for (const _ref2 of entries(object)) {
    var _ref3 = _slicedToArray(_ref2, 2);
    const property = _ref3[0];
    const value = _ref3[1];
    if (objectHasOwnProperty(object, property)) {
      if (arrayIsArray(value)) newObject[property] = cleanArray(value);
      else if (value && typeof value === "object" && value.constructor === Object) newObject[property] = clone(value);
      else newObject[property] = value;
    }
  }
  return newObject;
}
function stringifyValue(value) {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return numberToString(value);
    case "boolean":
      return booleanToString(value);
    case "bigint":
      return bigintToString ? bigintToString(value) : "0";
    case "symbol":
      return symbolToString ? symbolToString(value) : "Symbol()";
    case "undefined":
      return objectToString(value);
    case "function":
    case "object": {
      if (value === null) return objectToString(value);
      const valueAsRecord = value;
      const valueToString = lookupGetter(valueAsRecord, "toString");
      if (typeof valueToString === "function") {
        const stringified = valueToString(valueAsRecord);
        return typeof stringified === "string" ? stringified : objectToString(stringified);
      }
      return objectToString(value);
    }
    default:
      return objectToString(value);
  }
}
function lookupGetter(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) {
      if (desc.get) return unapply(desc.get);
      if (typeof desc.value === "function") return unapply(desc.value);
    }
    object = getPrototypeOf(object);
  }
  function fallbackValue() {
    return null;
  }
  return fallbackValue;
}
function lookupAccessor(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) return desc.get ? unapply(desc.get) : null;
    object = getPrototypeOf(object);
  }
  return null;
}
function isRegex(value) {
  try {
    regExpTest(value, "");
    return true;
  } catch (_unused) {
    return false;
  }
}
var html$1 = freeze([
  "a",
  "abbr",
  "acronym",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "big",
  "blink",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "content",
  "data",
  "datalist",
  "dd",
  "decorator",
  "del",
  "details",
  "dfn",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "element",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "font",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meter",
  "nav",
  "nobr",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "search",
  "section",
  "select",
  "shadow",
  "slot",
  "small",
  "source",
  "spacer",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "var",
  "video",
  "wbr"
]);
var svg$1 = freeze([
  "svg",
  "a",
  "altglyph",
  "altglyphdef",
  "altglyphitem",
  "animatecolor",
  "animatemotion",
  "animatetransform",
  "circle",
  "clippath",
  "defs",
  "desc",
  "ellipse",
  "enterkeyhint",
  "exportparts",
  "filter",
  "font",
  "g",
  "glyph",
  "glyphref",
  "hkern",
  "image",
  "inputmode",
  "line",
  "lineargradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "part",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "style",
  "switch",
  "symbol",
  "text",
  "textpath",
  "title",
  "tref",
  "tspan",
  "view",
  "vkern"
]);
var svgFilters = freeze([
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence"
]);
var svgDisallowed = freeze([
  "animate",
  "color-profile",
  "cursor",
  "discard",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignobject",
  "hatch",
  "hatchpath",
  "mesh",
  "meshgradient",
  "meshpatch",
  "meshrow",
  "missing-glyph",
  "script",
  "set",
  "solidcolor",
  "unknown",
  "use"
]);
var mathMl$1 = freeze([
  "math",
  "menclose",
  "merror",
  "mfenced",
  "mfrac",
  "mglyph",
  "mi",
  "mlabeledtr",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mroot",
  "mrow",
  "ms",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msup",
  "msubsup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "mprescripts"
]);
var mathMlDisallowed = freeze([
  "maction",
  "maligngroup",
  "malignmark",
  "mlongdiv",
  "mscarries",
  "mscarry",
  "msgroup",
  "mstack",
  "msline",
  "msrow",
  "semantics",
  "annotation",
  "annotation-xml",
  "mprescripts",
  "none"
]);
var text = freeze(["#text"]);
var html = freeze([
  "accept",
  "action",
  "align",
  "alt",
  "autocapitalize",
  "autocomplete",
  "autopictureinpicture",
  "autoplay",
  "background",
  "bgcolor",
  "border",
  "capture",
  "cellpadding",
  "cellspacing",
  "checked",
  "cite",
  "class",
  "clear",
  "color",
  "cols",
  "colspan",
  "command",
  "commandfor",
  "controls",
  "controlslist",
  "coords",
  "crossorigin",
  "datetime",
  "decoding",
  "default",
  "dir",
  "disabled",
  "disablepictureinpicture",
  "disableremoteplayback",
  "download",
  "draggable",
  "enctype",
  "enterkeyhint",
  "exportparts",
  "face",
  "for",
  "headers",
  "height",
  "hidden",
  "high",
  "href",
  "hreflang",
  "id",
  "inert",
  "inputmode",
  "integrity",
  "ismap",
  "kind",
  "label",
  "lang",
  "list",
  "loading",
  "loop",
  "low",
  "max",
  "maxlength",
  "media",
  "method",
  "min",
  "minlength",
  "multiple",
  "muted",
  "name",
  "nonce",
  "noshade",
  "novalidate",
  "nowrap",
  "open",
  "optimum",
  "part",
  "pattern",
  "placeholder",
  "playsinline",
  "popover",
  "popovertarget",
  "popovertargetaction",
  "poster",
  "preload",
  "pubdate",
  "radiogroup",
  "readonly",
  "rel",
  "required",
  "rev",
  "reversed",
  "role",
  "rows",
  "rowspan",
  "spellcheck",
  "scope",
  "selected",
  "shape",
  "size",
  "sizes",
  "slot",
  "span",
  "srclang",
  "start",
  "src",
  "srcset",
  "step",
  "style",
  "summary",
  "tabindex",
  "title",
  "translate",
  "type",
  "usemap",
  "valign",
  "value",
  "width",
  "wrap",
  "xmlns"
]);
var svg = freeze([
  "accent-height",
  "accumulate",
  "additive",
  "alignment-baseline",
  "amplitude",
  "ascent",
  "attributename",
  "attributetype",
  "azimuth",
  "basefrequency",
  "baseline-shift",
  "begin",
  "bias",
  "by",
  "class",
  "clip",
  "clippathunits",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "diffuseconstant",
  "direction",
  "display",
  "divisor",
  "dominant-baseline",
  "dur",
  "edgemode",
  "elevation",
  "end",
  "exponent",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "filterunits",
  "flood-color",
  "flood-opacity",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "fx",
  "fy",
  "g1",
  "g2",
  "glyph-name",
  "glyphref",
  "gradientunits",
  "gradienttransform",
  "height",
  "href",
  "id",
  "image-rendering",
  "in",
  "in2",
  "intercept",
  "k",
  "k1",
  "k2",
  "k3",
  "k4",
  "kerning",
  "keypoints",
  "keysplines",
  "keytimes",
  "lang",
  "lengthadjust",
  "letter-spacing",
  "kernelmatrix",
  "kernelunitlength",
  "lighting-color",
  "local",
  "marker-end",
  "marker-mid",
  "marker-start",
  "markerheight",
  "markerunits",
  "markerwidth",
  "maskcontentunits",
  "maskunits",
  "max",
  "mask",
  "mask-type",
  "media",
  "method",
  "mode",
  "min",
  "name",
  "numoctaves",
  "offset",
  "operator",
  "opacity",
  "order",
  "orient",
  "orientation",
  "origin",
  "overflow",
  "paint-order",
  "path",
  "pathlength",
  "patterncontentunits",
  "patterntransform",
  "patternunits",
  "pointer-events",
  "points",
  "preservealpha",
  "preserveaspectratio",
  "primitiveunits",
  "r",
  "rx",
  "ry",
  "radius",
  "refx",
  "refy",
  "repeatcount",
  "repeatdur",
  "restart",
  "result",
  "rotate",
  "scale",
  "seed",
  "shape-rendering",
  "slope",
  "specularconstant",
  "specularexponent",
  "spreadmethod",
  "startoffset",
  "stddeviation",
  "stitchtiles",
  "stop-color",
  "stop-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke",
  "stroke-width",
  "style",
  "surfacescale",
  "systemlanguage",
  "tabindex",
  "tablevalues",
  "targetx",
  "targety",
  "transform",
  "transform-origin",
  "text-anchor",
  "text-decoration",
  "text-orientation",
  "text-rendering",
  "textlength",
  "type",
  "u1",
  "u2",
  "unicode",
  "values",
  "vector-effect",
  "viewbox",
  "visibility",
  "version",
  "vert-adv-y",
  "vert-origin-x",
  "vert-origin-y",
  "width",
  "word-spacing",
  "wrap",
  "writing-mode",
  "xchannelselector",
  "ychannelselector",
  "x",
  "x1",
  "x2",
  "xmlns",
  "y",
  "y1",
  "y2",
  "z",
  "zoomandpan"
]);
var mathMl = freeze([
  "accent",
  "accentunder",
  "align",
  "bevelled",
  "close",
  "columnalign",
  "columnlines",
  "columnspacing",
  "columnspan",
  "denomalign",
  "depth",
  "dir",
  "display",
  "displaystyle",
  "encoding",
  "fence",
  "frame",
  "height",
  "href",
  "id",
  "largeop",
  "length",
  "linethickness",
  "lquote",
  "lspace",
  "mathbackground",
  "mathcolor",
  "mathsize",
  "mathvariant",
  "maxsize",
  "minsize",
  "movablelimits",
  "notation",
  "numalign",
  "open",
  "rowalign",
  "rowlines",
  "rowspacing",
  "rowspan",
  "rspace",
  "rquote",
  "scriptlevel",
  "scriptminsize",
  "scriptsizemultiplier",
  "selection",
  "separator",
  "separators",
  "stretchy",
  "subscriptshift",
  "supscriptshift",
  "symmetric",
  "voffset",
  "width",
  "xmlns"
]);
var xml = freeze([
  "xlink:href",
  "xml:id",
  "xlink:title",
  "xml:space",
  "xmlns:xlink"
]);
var MUSTACHE_EXPR = seal(/{{[\w\W]*|^[\w\W]*}}/g);
var ERB_EXPR = seal(/<%[\w\W]*|^[\w\W]*%>/g);
var TMPLIT_EXPR = seal(/\${[\w\W]*/g);
var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
var DOCTYPE_NAME = seal(/^html$/i);
var CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
var ELEMENT_MARKUP_PROBE = seal(/<[/\w!]/g);
var COMMENT_MARKUP_PROBE = seal(/<[/\w]/g);
var FALLBACK_TAG_CLOSE = seal(/<\/no(script|embed|frames)/i);
var SELF_CLOSING_TAG = seal(/\/>/i);
var NODE_TYPE = {
  element: 1,
  attribute: 2,
  text: 3,
  cdataSection: 4,
  entityReference: 5,
  entityNode: 6,
  processingInstruction: 7,
  comment: 8,
  document: 9,
  documentType: 10,
  documentFragment: 11,
  notation: 12
};
var LITERAL_TEXT_ELEMENTS = freeze(addToSet({}, [
  "style",
  "script",
  "xmp",
  "iframe",
  "noembed",
  "noframes",
  "plaintext",
  "noscript"
]));
var getGlobal = function getGlobal2() {
  return typeof window === "undefined" ? null : window;
};
var _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, purifyHostElement) {
  if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") return null;
  let suffix = null;
  const ATTR_NAME = "data-tt-policy-suffix";
  if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) suffix = purifyHostElement.getAttribute(ATTR_NAME);
  const policyName = "dompurify" + (suffix ? "#" + suffix : "");
  try {
    return trustedTypes.createPolicy(policyName, {
      createHTML(html2) {
        return html2;
      },
      createScriptURL(scriptUrl) {
        return scriptUrl;
      }
    });
  } catch (_2) {
    console.warn("TrustedTypes policy " + policyName + " could not be created.");
    return null;
  }
};
var _createHooksMap = function _createHooksMap2() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
var _resolveSetOption = function _resolveSetOption2(cfg, key, fallback, options) {
  return objectHasOwnProperty(cfg, key) && arrayIsArray(cfg[key]) ? addToSet(options.base ? clone(options.base) : {}, cfg[key], options.transform) : fallback;
};
var _resolveObjectOption = function _resolveObjectOption2(cfg, key, makeFallback) {
  const value = objectHasOwnProperty(cfg, key) ? cfg[key] : void 0;
  return value && typeof value === "object" ? clone(value) : makeFallback();
};
function createDOMPurify() {
  let window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
  const DOMPurify = (root) => createDOMPurify(root);
  DOMPurify.version = "3.4.17";
  DOMPurify.removed = [];
  if (!window2 || !window2.document || window2.document.nodeType !== NODE_TYPE.document || !window2.Element) {
    DOMPurify.isSupported = false;
    return DOMPurify;
  }
  let document2 = window2.document;
  const originalDocument = document2;
  const currentScript = originalDocument.currentScript;
  window2.DocumentFragment;
  const HTMLTemplateElement = window2.HTMLTemplateElement, Node = window2.Node, Element = window2.Element, NodeFilter2 = window2.NodeFilter;
  window2.NamedNodeMap === void 0 && (window2.NamedNodeMap || window2.MozNamedAttrMap);
  window2.HTMLFormElement;
  const DOMParser2 = window2.DOMParser, trustedTypes = window2.trustedTypes;
  const ElementPrototype = Element.prototype;
  const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
  const remove = lookupGetter(ElementPrototype, "remove");
  const removeAttributeNode = lookupGetter(ElementPrototype, "removeAttributeNode");
  const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
  const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
  const getParentNode = lookupGetter(ElementPrototype, "parentNode");
  const getShadowRoot = lookupGetter(ElementPrototype, "shadowRoot");
  const getAttributes = lookupGetter(ElementPrototype, "attributes");
  const getNodeType = Node && Node.prototype ? lookupGetter(Node.prototype, "nodeType") : null;
  const getNodeName = Node && Node.prototype ? lookupGetter(Node.prototype, "nodeName") : null;
  const getOwnerDocument = Node && Node.prototype ? lookupGetter(Node.prototype, "ownerDocument") : null;
  const _readNodeType = function _readNodeType2(node) {
    return getNodeType ? getNodeType(node) : node.nodeType;
  };
  const _readNodeName = function _readNodeName2(node) {
    return getNodeName ? getNodeName(node) : node.nodeName;
  };
  const getNamespaceURI = lookupAccessor(ElementPrototype, "namespaceURI");
  const _readNamespaceURI = function _readNamespaceURI2(element) {
    return getNamespaceURI ? getNamespaceURI(element) : element.namespaceURI;
  };
  if (typeof HTMLTemplateElement === "function") {
    const template = document2.createElement("template");
    if (template.content && template.content.ownerDocument) document2 = template.content.ownerDocument;
  }
  let trustedTypesPolicy;
  let emptyHTML = "";
  let defaultTrustedTypesPolicy;
  let defaultTrustedTypesPolicyResolved = false;
  let IN_TRUSTED_TYPES_POLICY = 0;
  const _assertNotInTrustedTypesPolicy = function _assertNotInTrustedTypesPolicy2() {
    if (IN_TRUSTED_TYPES_POLICY > 0) throw typeErrorCreate('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
  };
  const _createTrustedHTML = function _createTrustedHTML2(html2) {
    _assertNotInTrustedTypesPolicy();
    IN_TRUSTED_TYPES_POLICY++;
    try {
      return trustedTypesPolicy.createHTML(html2);
    } finally {
      IN_TRUSTED_TYPES_POLICY--;
    }
  };
  const _createTrustedScriptURL = function _createTrustedScriptURL2(scriptUrl) {
    _assertNotInTrustedTypesPolicy();
    IN_TRUSTED_TYPES_POLICY++;
    try {
      return trustedTypesPolicy.createScriptURL(scriptUrl);
    } finally {
      IN_TRUSTED_TYPES_POLICY--;
    }
  };
  const _getDefaultTrustedTypesPolicy = function _getDefaultTrustedTypesPolicy2() {
    if (!defaultTrustedTypesPolicyResolved) {
      defaultTrustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
      defaultTrustedTypesPolicyResolved = true;
    }
    return defaultTrustedTypesPolicy;
  };
  const _document = document2, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, createDocumentFragment = _document.createDocumentFragment, getElementsByTagName = _document.getElementsByTagName;
  const importNode = originalDocument.importNode;
  let hooks = _createHooksMap();
  DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
  const MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE, CUSTOM_ELEMENT$1 = CUSTOM_ELEMENT;
  let IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
  let ALLOWED_TAGS = null;
  const DEFAULT_ALLOWED_TAGS = addToSet({}, [
    ...html$1,
    ...svg$1,
    ...svgFilters,
    ...mathMl$1,
    ...text
  ]);
  let ALLOWED_ATTR = null;
  const DEFAULT_ALLOWED_ATTR = addToSet({}, [
    ...html,
    ...svg,
    ...mathMl,
    ...xml
  ]);
  let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
    tagNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: false
    }
  }));
  let FORBID_TAGS = null;
  let FORBID_ATTR = null;
  const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
    tagCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    }
  }));
  let ALLOW_ARIA_ATTR = true;
  let ALLOW_DATA_ATTR = true;
  let ALLOW_UNKNOWN_PROTOCOLS = false;
  let ALLOW_SELF_CLOSE_IN_ATTR = true;
  let SAFE_FOR_TEMPLATES = false;
  let SAFE_FOR_XML = true;
  let WHOLE_DOCUMENT = false;
  let SET_CONFIG = false;
  let SET_CONFIG_ALLOWED_TAGS = null;
  let SET_CONFIG_ALLOWED_ATTR = null;
  let FORCE_BODY = false;
  let RETURN_DOM = false;
  let RETURN_DOM_FRAGMENT = false;
  let RETURN_TRUSTED_TYPE = false;
  let SANITIZE_DOM = true;
  let SANITIZE_NAMED_PROPS = false;
  const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
  let KEEP_CONTENT = true;
  let IN_PLACE = false;
  let IN_PLACE_VISITED = null;
  let USE_PROFILES = {};
  let FORBID_CONTENTS = null;
  const DEFAULT_FORBID_CONTENTS = addToSet({}, [
    "annotation-xml",
    "audio",
    "colgroup",
    "desc",
    "foreignobject",
    "head",
    "iframe",
    "math",
    "mi",
    "mn",
    "mo",
    "ms",
    "mtext",
    "noembed",
    "noframes",
    "noscript",
    "plaintext",
    "script",
    "selectedcontent",
    "style",
    "svg",
    "template",
    "thead",
    "title",
    "video",
    "xmp"
  ]);
  let DATA_URI_TAGS = null;
  const DEFAULT_DATA_URI_TAGS = addToSet({}, [
    "audio",
    "video",
    "img",
    "source",
    "image",
    "track"
  ]);
  let URI_SAFE_ATTRIBUTES = null;
  const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, [
    "alt",
    "class",
    "for",
    "id",
    "label",
    "name",
    "pattern",
    "placeholder",
    "role",
    "summary",
    "title",
    "value",
    "style",
    "xmlns"
  ]);
  const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  let NAMESPACE = HTML_NAMESPACE;
  let IS_EMPTY_INPUT = false;
  let ALLOWED_NAMESPACES = null;
  const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [
    MATHML_NAMESPACE,
    SVG_NAMESPACE,
    HTML_NAMESPACE
  ], stringToString);
  const DEFAULT_MATHML_TEXT_INTEGRATION_POINTS = freeze([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext"
  ]);
  let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
  const DEFAULT_HTML_INTEGRATION_POINTS = freeze(["annotation-xml"]);
  let HTML_INTEGRATION_POINTS = addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
  const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, [
    "title",
    "style",
    "font",
    "a",
    "script"
  ]);
  let PARSER_MEDIA_TYPE = null;
  const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
  const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
  let transformCaseFunc = null;
  let CONFIG = null;
  const formElement = document2.createElement("form");
  const isRegexOrFunction = function isRegexOrFunction2(testValue) {
    return testValue instanceof RegExp || testValue instanceof Function;
  };
  const _parseConfig = function _parseConfig2() {
    let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (CONFIG && CONFIG === cfg) return;
    if (!cfg || typeof cfg !== "object") cfg = {};
    cfg = clone(cfg);
    PARSER_MEDIA_TYPE = SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
    transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
    ALLOWED_TAGS = _resolveSetOption(cfg, "ALLOWED_TAGS", DEFAULT_ALLOWED_TAGS, { transform: transformCaseFunc });
    ALLOWED_ATTR = _resolveSetOption(cfg, "ALLOWED_ATTR", DEFAULT_ALLOWED_ATTR, { transform: transformCaseFunc });
    ALLOWED_NAMESPACES = _resolveSetOption(cfg, "ALLOWED_NAMESPACES", DEFAULT_ALLOWED_NAMESPACES, { transform: stringToString });
    URI_SAFE_ATTRIBUTES = _resolveSetOption(cfg, "ADD_URI_SAFE_ATTR", DEFAULT_URI_SAFE_ATTRIBUTES, {
      transform: transformCaseFunc,
      base: DEFAULT_URI_SAFE_ATTRIBUTES
    });
    DATA_URI_TAGS = _resolveSetOption(cfg, "ADD_DATA_URI_TAGS", DEFAULT_DATA_URI_TAGS, {
      transform: transformCaseFunc,
      base: DEFAULT_DATA_URI_TAGS
    });
    FORBID_CONTENTS = _resolveSetOption(cfg, "FORBID_CONTENTS", DEFAULT_FORBID_CONTENTS, { transform: transformCaseFunc });
    FORBID_TAGS = _resolveSetOption(cfg, "FORBID_TAGS", clone({}), { transform: transformCaseFunc });
    FORBID_ATTR = _resolveSetOption(cfg, "FORBID_ATTR", clone({}), { transform: transformCaseFunc });
    USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES && typeof cfg.USE_PROFILES === "object" ? clone(cfg.USE_PROFILES) : cfg.USE_PROFILES : false;
    ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
    ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
    ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
    ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
    SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
    SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
    WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
    RETURN_DOM = cfg.RETURN_DOM || false;
    RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
    RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
    FORCE_BODY = cfg.FORCE_BODY || false;
    SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
    SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
    KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
    IN_PLACE = cfg.IN_PLACE || false;
    IS_ALLOWED_URI$1 = isRegex(cfg.ALLOWED_URI_REGEXP) ? cfg.ALLOWED_URI_REGEXP : IS_ALLOWED_URI;
    NAMESPACE = typeof cfg.NAMESPACE === "string" ? cfg.NAMESPACE : HTML_NAMESPACE;
    MATHML_TEXT_INTEGRATION_POINTS = _resolveObjectOption(cfg, "MATHML_TEXT_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS));
    HTML_INTEGRATION_POINTS = _resolveObjectOption(cfg, "HTML_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS));
    const customElementHandling = _resolveObjectOption(cfg, "CUSTOM_ELEMENT_HANDLING", () => create(null));
    CUSTOM_ELEMENT_HANDLING = create(null);
    if (objectHasOwnProperty(customElementHandling, "tagNameCheck") && isRegexOrFunction(customElementHandling.tagNameCheck)) CUSTOM_ELEMENT_HANDLING.tagNameCheck = customElementHandling.tagNameCheck;
    if (objectHasOwnProperty(customElementHandling, "attributeNameCheck") && isRegexOrFunction(customElementHandling.attributeNameCheck)) CUSTOM_ELEMENT_HANDLING.attributeNameCheck = customElementHandling.attributeNameCheck;
    if (objectHasOwnProperty(customElementHandling, "allowCustomizedBuiltInElements") && typeof customElementHandling.allowCustomizedBuiltInElements === "boolean") CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = customElementHandling.allowCustomizedBuiltInElements;
    seal(CUSTOM_ELEMENT_HANDLING);
    if (SAFE_FOR_TEMPLATES) ALLOW_DATA_ATTR = false;
    if (RETURN_DOM_FRAGMENT) RETURN_DOM = true;
    if (USE_PROFILES) {
      ALLOWED_TAGS = addToSet({}, text);
      ALLOWED_ATTR = create(null);
      if (USE_PROFILES.html === true) {
        addToSet(ALLOWED_TAGS, html$1);
        addToSet(ALLOWED_ATTR, html);
      }
      if (USE_PROFILES.svg === true) {
        addToSet(ALLOWED_TAGS, svg$1);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.svgFilters === true) {
        addToSet(ALLOWED_TAGS, svgFilters);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.mathMl === true) {
        addToSet(ALLOWED_TAGS, mathMl$1);
        addToSet(ALLOWED_ATTR, mathMl);
        addToSet(ALLOWED_ATTR, xml);
      }
    }
    EXTRA_ELEMENT_HANDLING.tagCheck = null;
    EXTRA_ELEMENT_HANDLING.attributeCheck = null;
    if (objectHasOwnProperty(cfg, "ADD_TAGS")) {
      if (typeof cfg.ADD_TAGS === "function") EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
      else if (arrayIsArray(cfg.ADD_TAGS)) {
        if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) ALLOWED_TAGS = clone(ALLOWED_TAGS);
        addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
      }
    }
    if (objectHasOwnProperty(cfg, "ADD_ATTR")) {
      if (typeof cfg.ADD_ATTR === "function") EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
      else if (arrayIsArray(cfg.ADD_ATTR)) {
        if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) ALLOWED_ATTR = clone(ALLOWED_ATTR);
        addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
      }
    }
    if (objectHasOwnProperty(cfg, "ADD_FORBID_CONTENTS") && arrayIsArray(cfg.ADD_FORBID_CONTENTS)) {
      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) FORBID_CONTENTS = clone(FORBID_CONTENTS);
      addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
    }
    if (KEEP_CONTENT) ALLOWED_TAGS["#text"] = true;
    if (WHOLE_DOCUMENT) addToSet(ALLOWED_TAGS, [
      "html",
      "head",
      "body"
    ]);
    if (ALLOWED_TAGS.table) {
      addToSet(ALLOWED_TAGS, ["tbody"]);
      delete FORBID_TAGS.tbody;
    }
    if (cfg.TRUSTED_TYPES_POLICY) {
      if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      const previousTrustedTypesPolicy = trustedTypesPolicy;
      trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
      try {
        emptyHTML = _createTrustedHTML("");
      } catch (error) {
        trustedTypesPolicy = previousTrustedTypesPolicy;
        throw error;
      }
    } else if (cfg.TRUSTED_TYPES_POLICY === null) {
      trustedTypesPolicy = void 0;
      emptyHTML = "";
    } else {
      if (trustedTypesPolicy === void 0) trustedTypesPolicy = _getDefaultTrustedTypesPolicy();
      if (trustedTypesPolicy && typeof emptyHTML === "string") emptyHTML = _createTrustedHTML("");
    }
    if (freeze) freeze(cfg);
    CONFIG = cfg;
  };
  const ALL_SVG_TAGS = addToSet({}, [
    ...svg$1,
    ...svgFilters,
    ...svgDisallowed
  ]);
  const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
  const _checkSvgNamespace = function _checkSvgNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "svg";
    if (parent.namespaceURI === MATHML_NAMESPACE) return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
    return Boolean(ALL_SVG_TAGS[tagName]);
  };
  const _checkMathMlNamespace = function _checkMathMlNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "math";
    if (parent.namespaceURI === SVG_NAMESPACE) return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
    return Boolean(ALL_MATHML_TAGS[tagName]);
  };
  const _checkHtmlNamespace = function _checkHtmlNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) return false;
    if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) return false;
    return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
  };
  const _checkValidNamespace = function _checkValidNamespace2(element) {
    const elementNamespace = _readNamespaceURI(element);
    const tagName = stringToLowerCase(_readNodeName(element));
    const parentNode = getParentNode(element);
    let parent;
    let parentTagName;
    if (parentNode && _readNodeType(parentNode) === NODE_TYPE.element) {
      parent = { namespaceURI: _readNamespaceURI(parentNode) };
      parentTagName = stringToLowerCase(_readNodeName(parentNode));
    } else {
      parent = { namespaceURI: NAMESPACE };
      parentTagName = "template";
    }
    if (!ALLOWED_NAMESPACES[elementNamespace]) return false;
    if (elementNamespace === SVG_NAMESPACE) return _checkSvgNamespace(tagName, parent, parentTagName);
    if (elementNamespace === MATHML_NAMESPACE) return _checkMathMlNamespace(tagName, parent, parentTagName);
    if (elementNamespace === HTML_NAMESPACE) return _checkHtmlNamespace(tagName, parent, parentTagName);
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[elementNamespace]) return true;
    return false;
  };
  const _forceRemove = function _forceRemove2(node) {
    arrayPush(DOMPurify.removed, { element: node });
    try {
      getParentNode(node).removeChild(node);
    } catch (_2) {
      remove(node);
      if (!getParentNode(node)) throw typeErrorCreate("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
    }
  };
  const _stripAttributeNode = function _stripAttributeNode2(element, attribute, name) {
    try {
      removeAttributeNode(element, attribute);
    } catch (_2) {
      try {
        element.removeAttribute(name);
      } catch (_3) {
      }
    }
  };
  const _neutralizeRoot = function _neutralizeRoot2(root) {
    _neutralizeSubtree(root);
    const childNodes = getChildNodes(root);
    if (childNodes) arrayForEach(arraySlice(childNodes), (child) => {
      try {
        remove(child);
      } catch (_2) {
      }
    });
    const attributes = _readNodeType(root) === NODE_TYPE.element ? getAttributes(root) : null;
    if (attributes) for (let i = attributes.length - 1; i >= 0; --i) {
      const attribute = attributes[i];
      const name = attribute && attribute.name;
      if (typeof name === "string") _stripAttributeNode(root, attribute, name);
    }
  };
  const _removeAttribute = function _removeAttribute2(name, element, attr) {
    if (!attr) try {
      attr = element.getAttributeNode(name);
    } catch (_2) {
      attr = null;
    }
    arrayPush(DOMPurify.removed, {
      attribute: attr || null,
      from: element
    });
    try {
      if (attr) removeAttributeNode(element, attr);
      else element.removeAttribute(name);
    } catch (_2) {
      try {
        element.removeAttribute(name);
      } catch (_3) {
      }
    }
    if (name === "is") {
      if (RETURN_DOM || RETURN_DOM_FRAGMENT) try {
        _forceRemove(element);
      } catch (_2) {
      }
      else try {
        element.setAttribute(name, "");
      } catch (_2) {
      }
    }
  };
  const _stripDisallowedAttributes = function _stripDisallowedAttributes2(element) {
    const attributes = getAttributes(element);
    if (!attributes) return;
    for (let i = attributes.length - 1; i >= 0; --i) {
      const attribute = attributes[i];
      const name = attribute && attribute.name;
      if (typeof name !== "string" || ALLOWED_ATTR[transformCaseFunc(name)]) continue;
      _stripAttributeNode(element, attribute, name);
    }
  };
  const _walkTree = function _walkTree2(root, visit) {
    let intoShadow = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (visit(node) === false) continue;
      if (intoShadow && _readNodeType(node) === NODE_TYPE.element) {
        const shadowRoot = getShadowRoot(node);
        if (_isDocumentFragment(shadowRoot)) stack.push(shadowRoot);
      }
      const childNodes = getChildNodes(node);
      if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push(childNodes[i]);
    }
  };
  const _neutralizeSubtree = function _neutralizeSubtree2(root) {
    _walkTree(root, (node) => {
      if (_readNodeType(node) === NODE_TYPE.element) _stripDisallowedAttributes(node);
    });
  };
  const _collectLiveNodes = function _collectLiveNodes2(root) {
    const nodes = [];
    _walkTree(root, (node) => {
      nodes.push(node);
    }, true);
    return nodes;
  };
  const _neutralizeEscapedElements = function _neutralizeEscapedElements2(root, before) {
    const reachable = setCreate();
    arrayForEach(_collectLiveNodes(root), (node) => {
      if (_readNodeType(node) === NODE_TYPE.element) setAdd(reachable, node);
    });
    arrayForEach(before, (node) => {
      if (_readNodeType(node) === NODE_TYPE.element && !setHas(reachable, node)) _stripDisallowedAttributes(node);
    });
  };
  const _neutralizeDiscarded = function _neutralizeDiscarded2(root, before) {
    let rootRemoved = false;
    arrayForEach(DOMPurify.removed, (entry) => {
      if (entry.element) {
        rootRemoved = rootRemoved || entry.element === root;
        _neutralizeSubtree(entry.element);
      }
    });
    _neutralizeEscapedElements(root, before);
    return rootRemoved;
  };
  const MAX_UNVISITED_ROUNDS = 8;
  const _sanitizeUnvisitedNodes = function _sanitizeUnvisitedNodes2(root, before) {
    const visited = IN_PLACE_VISITED;
    let original = null;
    const getOriginal = () => {
      if (!original) {
        original = setCreate();
        arrayForEach(before, (beforeNode) => {
          setAdd(original, beforeNode);
        });
      }
      return original;
    };
    for (let round = 0; ; round++) {
      const live = _collectLiveNodes(root);
      const containers = [root];
      let pending = false;
      arrayForEach(live, (node) => {
        if (_readNodeType(node) === NODE_TYPE.documentFragment) arrayPush(containers, node);
        else if (!pending && !setHas(visited, node)) pending = setHas(getOriginal(), node);
      });
      if (!pending) return;
      if (round >= MAX_UNVISITED_ROUNDS) throw typeErrorCreate("the tree kept changing during in-place sanitization; refusing to return it");
      arrayForEach(containers, (container, index) => {
        _sanitizeUnvisitedIn(container, index > 0, root, getOriginal());
      });
    }
  };
  const _sanitizeUnvisitedIn = function _sanitizeUnvisitedIn2(container, inShadow, root, original) {
    const iterator = _createNodeIterator(container);
    let node;
    while (node = iterator.nextNode()) {
      if (!setHas(original, node) || setHas(IN_PLACE_VISITED, node)) continue;
      if (inShadow) _executeHooks(hooks.uponSanitizeShadowNode, node, null);
      _sanitizeElements(node, root);
      _sanitizeAttributes(node, root);
      if (_isDocumentFragment(node.content)) _sanitizeShadowDOM2(node.content);
    }
  };
  const _markVisited = function _markVisited2(node) {
    if (IN_PLACE_VISITED) setAdd(IN_PLACE_VISITED, node);
  };
  const _isPatchLinkageAttribute = function _isPatchLinkageAttribute2(lcName, lcTag) {
    if (!SAFE_FOR_XML) return false;
    if (lcName === "patchsrc") return true;
    return lcName === "for" && lcTag !== "label" && lcTag !== "output";
  };
  const _neutralizePatchLinkage = function _neutralizePatchLinkage2(root) {
    if (!SAFE_FOR_XML) return;
    _walkTree(root, (node) => {
      const nodeType = _readNodeType(node);
      if (nodeType === NODE_TYPE.processingInstruction || nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, node.data)) {
        try {
          remove(node);
        } catch (_2) {
        }
        return false;
      }
      if (nodeType === NODE_TYPE.element) {
        const element = node;
        const lcTag = transformCaseFunc(_readNodeName(node));
        try {
          if (element.hasAttribute && element.hasAttribute("patchsrc")) element.removeAttribute("patchsrc");
          if (element.hasAttribute && element.hasAttribute("for") && _isPatchLinkageAttribute("for", lcTag)) element.removeAttribute("for");
        } catch (_2) {
        }
      }
      return true;
    });
  };
  const _initDocument = function _initDocument2(dirty) {
    let doc = null;
    let leadingWhitespace = null;
    if (FORCE_BODY) dirty = "<remove></remove>" + dirty;
    else {
      const matches = stringMatch(dirty, /^[\r\n\t ]+/);
      leadingWhitespace = matches && matches[0];
    }
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
    const dirtyPayload = trustedTypesPolicy ? _createTrustedHTML(dirty) : dirty;
    if (NAMESPACE === HTML_NAMESPACE) try {
      doc = new DOMParser2().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
    } catch (_2) {
    }
    if (!doc || !doc.documentElement) {
      doc = implementation.createDocument(NAMESPACE, "template", null);
      try {
        doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
      } catch (_2) {
      }
    }
    const body = doc.body || doc.documentElement;
    if (dirty && leadingWhitespace) body.insertBefore(document2.createTextNode(leadingWhitespace), body.childNodes[0] || null);
    if (NAMESPACE === HTML_NAMESPACE) return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
    return WHOLE_DOCUMENT ? doc.documentElement : body;
  };
  const _createNodeIterator = function _createNodeIterator2(root) {
    const doc = getOwnerDocument ? getOwnerDocument(root) : root.ownerDocument;
    return createNodeIterator.call(doc || root, root, NodeFilter2.SHOW_ELEMENT | NodeFilter2.SHOW_COMMENT | NodeFilter2.SHOW_TEXT | NodeFilter2.SHOW_PROCESSING_INSTRUCTION | NodeFilter2.SHOW_CDATA_SECTION, null);
  };
  const _stripTemplateExpressions = function _stripTemplateExpressions2(value) {
    value = stringReplace(value, MUSTACHE_EXPR$1, " ");
    value = stringReplace(value, ERB_EXPR$1, " ");
    value = stringReplace(value, TMPLIT_EXPR$1, " ");
    return value;
  };
  const _scrubTemplateExpressions2 = function _scrubTemplateExpressions(node) {
    var _node$querySelectorAl;
    _scrubOwnCharacterData(node);
    const templates = (_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === void 0 ? void 0 : _node$querySelectorAl.call(node, "template");
    if (templates) arrayForEach(templates, (tmpl) => {
      if (_isDocumentFragment(tmpl.content)) _scrubTemplateExpressions2(tmpl.content);
    });
  };
  const _scrubOwnCharacterData = function _scrubOwnCharacterData2(node) {
    node.normalize();
    const doc = getOwnerDocument ? getOwnerDocument(node) : node.ownerDocument;
    const walker = createNodeIterator.call(doc || node, node, NodeFilter2.SHOW_TEXT | NodeFilter2.SHOW_COMMENT | NodeFilter2.SHOW_CDATA_SECTION | NodeFilter2.SHOW_PROCESSING_INSTRUCTION, null);
    let currentNode = walker.nextNode();
    while (currentNode) {
      currentNode.data = _stripTemplateExpressions(currentNode.data);
      currentNode = walker.nextNode();
    }
  };
  const _isClobbered = function _isClobbered2(element) {
    const realTagName = getNodeName ? getNodeName(element) : null;
    if (typeof realTagName !== "string") return false;
    if (transformCaseFunc(realTagName) !== "form") return false;
    return typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || element.attributes !== getAttributes(element) || typeof element.removeAttribute !== "function" || typeof element.removeAttributeNode !== "function" || typeof element.getAttributeNode !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function" || element.nodeType !== getNodeType(element) || element.childNodes !== getChildNodes(element);
  };
  const _isDocumentFragment = function _isDocumentFragment2(value) {
    if (!getNodeType || typeof value !== "object" || value === null) return false;
    try {
      return getNodeType(value) === NODE_TYPE.documentFragment;
    } catch (_2) {
      return false;
    }
  };
  const _isNode = function _isNode2(value) {
    if (!getNodeType || typeof value !== "object" || value === null) return false;
    try {
      return typeof getNodeType(value) === "number";
    } catch (_2) {
      return false;
    }
  };
  function _executeHooks(hooks2, currentNode, data) {
    if (hooks2.length === 0) return;
    arrayForEach(hooks2, (hook) => {
      hook.call(DOMPurify, currentNode, data, CONFIG);
    });
  }
  const _isUnsafeNode = function _isUnsafeNode2(currentNode, tagName) {
    if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.innerHTML)) return true;
    if (SAFE_FOR_XML && LITERAL_TEXT_ELEMENTS[tagName] && _readNodeType(currentNode) === NODE_TYPE.element && _readNamespaceURI(currentNode) === HTML_NAMESPACE && (_isNode(currentNode.firstElementChild) || typeof currentNode.textContent === "string" && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent))) return true;
    if (currentNode.nodeType === NODE_TYPE.processingInstruction) return true;
    if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, currentNode.data)) return true;
    return false;
  };
  const _matchesNameCheck = function _matchesNameCheck2(check, name) {
    if (check instanceof RegExp) return regExpTest(check, name);
    if (check instanceof Function) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
      return Boolean(check(name, ...args));
    }
    return false;
  };
  const _sanitizeDisallowedNode = function _sanitizeDisallowedNode2(currentNode, tagName, root) {
    if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) return false;
    if (KEEP_CONTENT && !FORBID_CONTENTS[tagName] && !FORBID_CONTENTS[stringToLowerCase(tagName)]) {
      const parentNode = getParentNode(currentNode);
      const childNodes = getChildNodes(currentNode);
      if (childNodes && parentNode) {
        const childCount = childNodes.length;
        for (let i = childCount - 1; i >= 0; --i) {
          const hoisted = currentNode === root ? cloneNode(childNodes[i], true) : childNodes[i];
          parentNode.insertBefore(hoisted, getNextSibling(currentNode));
        }
      }
    }
    _forceRemove(currentNode);
    return true;
  };
  const _forkSharedAllowlist = function _forkSharedAllowlist2(hookList, set, defaultSet, setConfigSet) {
    if (hookList.length === 0) return set;
    return set === defaultSet || set === setConfigSet ? clone(set) : set;
  };
  const _handleHookDetachedNode = function _handleHookDetachedNode2(currentNode, root) {
    if (currentNode === root || getParentNode(currentNode) !== null) return false;
    if (IN_PLACE) _neutralizeSubtree(currentNode);
    return true;
  };
  const _sanitizeElements = function _sanitizeElements2(currentNode, root) {
    _markVisited(currentNode);
    _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
    if (_handleHookDetachedNode(currentNode, root)) return true;
    if (_isClobbered(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    const tagName = transformCaseFunc(_readNodeName(currentNode));
    ALLOWED_TAGS = _forkSharedAllowlist(hooks.uponSanitizeElement, ALLOWED_TAGS, DEFAULT_ALLOWED_TAGS, SET_CONFIG_ALLOWED_TAGS);
    _executeHooks(hooks.uponSanitizeElement, currentNode, {
      tagName,
      allowedTags: ALLOWED_TAGS
    });
    if (_handleHookDetachedNode(currentNode, root)) return true;
    if (_isUnsafeNode(currentNode, tagName)) {
      _forceRemove(currentNode);
      return true;
    }
    if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
      const removed = _sanitizeDisallowedNode(currentNode, tagName, root);
      if (removed === false) {
        _executeHooks(hooks.afterSanitizeElements, currentNode, null);
        if (_handleHookDetachedNode(currentNode, root)) return true;
      }
      return removed;
    }
    if (_readNodeType(currentNode) === NODE_TYPE.element && !_checkValidNamespace(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(FALLBACK_TAG_CLOSE, currentNode.innerHTML)) {
      _forceRemove(currentNode);
      return true;
    }
    if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
      const content = _stripTemplateExpressions(currentNode.textContent);
      if (currentNode.textContent !== content) {
        arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
        currentNode.textContent = content;
      }
    }
    _executeHooks(hooks.afterSanitizeElements, currentNode, null);
    return _handleHookDetachedNode(currentNode, root);
  };
  const _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
    if (FORBID_ATTR[lcName]) return false;
    if (_isPatchLinkageAttribute(lcName, lcTag)) return false;
    if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document2 || value in formElement)) return false;
    const nameIsPermitted = ALLOWED_ATTR[lcName] || EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag);
    if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$1, lcName)) return true;
    if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName)) return true;
    if (!nameIsPermitted) return _isBasicCustomElement(lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName, lcTag) || lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value);
    if (URI_SAFE_ATTRIBUTES[lcName]) return true;
    if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
    if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]) return true;
    if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
    return !value;
  };
  const RESERVED_CUSTOM_ELEMENT_NAMES = addToSet({}, [
    "annotation-xml",
    "color-profile",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "missing-glyph"
  ]);
  const _isBasicCustomElement = function _isBasicCustomElement2(tagName) {
    return !RESERVED_CUSTOM_ELEMENT_NAMES[stringToLowerCase(tagName)] && regExpTest(CUSTOM_ELEMENT$1, tagName);
  };
  const _applyTrustedTypesToAttribute = function _applyTrustedTypesToAttribute2(lcTag, lcName, namespaceURI, value) {
    if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function" && !namespaceURI) switch (trustedTypes.getAttributeType(lcTag, lcName)) {
      case "TrustedHTML":
        return _createTrustedHTML(value);
      case "TrustedScriptURL":
        return _createTrustedScriptURL(value);
    }
    return value;
  };
  const _setAttributeValue = function _setAttributeValue2(currentNode, name, namespaceURI, value) {
    try {
      if (namespaceURI) currentNode.setAttributeNS(namespaceURI, name, value);
      else currentNode.setAttribute(name, value);
      if (_isClobbered(currentNode)) {
        _forceRemove(currentNode);
        return false;
      }
      return true;
    } catch (_2) {
      _removeAttribute(name, currentNode);
      return false;
    }
  };
  const _isUnsafeAttributeValue = function _isUnsafeAttributeValue2(name, value) {
    if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) return true;
    return stringToLowerCase(name) === "attributename" && stringMatch(value, "href") !== null;
  };
  const _sanitizeAttributes = function _sanitizeAttributes2(currentNode, root) {
    _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
    if (_handleHookDetachedNode(currentNode, root)) return;
    const attributes = currentNode.attributes;
    if (!attributes || _isClobbered(currentNode)) return;
    ALLOWED_ATTR = _forkSharedAllowlist(hooks.uponSanitizeAttribute, ALLOWED_ATTR, DEFAULT_ALLOWED_ATTR, SET_CONFIG_ALLOWED_ATTR);
    const hookEvent = {
      attrName: "",
      attrValue: "",
      keepAttr: true,
      allowedAttributes: ALLOWED_ATTR,
      forceKeepAttr: void 0
    };
    let l = attributes.length;
    const lcTag = transformCaseFunc(currentNode.nodeName);
    while (l--) {
      const attr = attributes[l];
      const name = attr.name, namespaceURI = attr.namespaceURI, attrValue = attr.value;
      const lcName = transformCaseFunc(name);
      const initValue = attrValue;
      let value = name === "value" ? initValue : stringTrim(initValue);
      let recreatedNamedProp = false;
      hookEvent.attrName = lcName;
      hookEvent.attrValue = value;
      hookEvent.keepAttr = true;
      hookEvent.forceKeepAttr = void 0;
      _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
      value = hookEvent.attrValue;
      if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name") && stringIndexOf(value, SANITIZE_NAMED_PROPS_PREFIX) !== 0) {
        _removeAttribute(name, currentNode, attr);
        value = SANITIZE_NAMED_PROPS_PREFIX + value;
        recreatedNamedProp = true;
      }
      if (_isUnsafeAttributeValue(name, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (hookEvent.forceKeepAttr) continue;
      if (!hookEvent.keepAttr) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (SAFE_FOR_TEMPLATES) value = _stripTemplateExpressions(value);
      if (!_isValidAttribute(lcTag, lcName, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      value = _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value);
      if (value !== initValue) {
        if (_setAttributeValue(currentNode, name, namespaceURI, value) && recreatedNamedProp) arrayPop(DOMPurify.removed);
      }
    }
    _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
    _handleHookDetachedNode(currentNode, root);
  };
  const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment) {
    let shadowNode = null;
    const shadowIterator = _createNodeIterator(fragment);
    _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
    while (shadowNode = shadowIterator.nextNode()) {
      _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
      _sanitizeElements(shadowNode, fragment);
      _sanitizeAttributes(shadowNode, fragment);
      if (_isDocumentFragment(shadowNode.content)) _sanitizeShadowDOM2(shadowNode.content);
      if (_readNodeType(shadowNode) === NODE_TYPE.element) {
        const innerSr = getShadowRoot(shadowNode);
        if (_isDocumentFragment(innerSr)) {
          _sanitizeAttachedShadowRoots(innerSr);
          _sanitizeShadowDOM2(innerSr);
        }
      }
    }
    if (SAFE_FOR_TEMPLATES) _scrubOwnCharacterData(fragment);
    _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
  };
  const _sanitizeAttachedShadowRoots = function _sanitizeAttachedShadowRoots2(root) {
    const stack = [{
      node: root,
      shadow: null
    }];
    while (stack.length > 0) {
      const item = stack.pop();
      if (item.shadow) {
        _sanitizeShadowDOM2(item.shadow);
        continue;
      }
      const node = item.node;
      const isElement = _readNodeType(node) === NODE_TYPE.element;
      const childNodes = getChildNodes(node);
      if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push({
        node: childNodes[i],
        shadow: null
      });
      if (isElement) {
        const rootName = getNodeName ? getNodeName(node) : null;
        if (typeof rootName === "string" && transformCaseFunc(rootName) === "template") {
          const content = node.content;
          if (_isDocumentFragment(content)) stack.push({
            node: content,
            shadow: null
          });
        }
      }
      if (isElement) {
        const sr = getShadowRoot(node);
        if (_isDocumentFragment(sr)) stack.push({
          node: null,
          shadow: sr
        }, {
          node: sr,
          shadow: null
        });
      }
    }
  };
  DOMPurify.sanitize = function(dirty) {
    let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    let body = null;
    let importedNode = null;
    let currentNode = null;
    let returnNode = null;
    IS_EMPTY_INPUT = !dirty;
    if (IS_EMPTY_INPUT) dirty = "<!-->";
    if (typeof dirty !== "string" && !_isNode(dirty)) {
      dirty = stringifyValue(dirty);
      if (typeof dirty !== "string") throw typeErrorCreate("dirty is not a string, aborting");
    }
    if (!DOMPurify.isSupported) return dirty;
    if (SET_CONFIG) {
      ALLOWED_TAGS = SET_CONFIG_ALLOWED_TAGS;
      ALLOWED_ATTR = SET_CONFIG_ALLOWED_ATTR;
    } else _parseConfig(cfg);
    if (hooks.uponSanitizeElement.length > 0 || hooks.uponSanitizeAttribute.length > 0) ALLOWED_TAGS = clone(ALLOWED_TAGS);
    if (hooks.uponSanitizeAttribute.length > 0) ALLOWED_ATTR = clone(ALLOWED_ATTR);
    DOMPurify.removed = [];
    const inPlace = IN_PLACE && typeof dirty !== "string" && _isNode(dirty);
    let inPlaceNodes = [];
    const outerVisited = IN_PLACE_VISITED;
    if (inPlace) {
      _neutralizePatchLinkage(dirty);
      const nn = _readNodeName(dirty);
      if (typeof nn === "string") {
        const tagName = transformCaseFunc(nn);
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          _neutralizeRoot(dirty);
          throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
        }
      }
      if (_isClobbered(dirty)) {
        _neutralizeRoot(dirty);
        throw typeErrorCreate("root node is clobbered and cannot be sanitized in-place");
      }
      inPlaceNodes = _collectLiveNodes(dirty);
      IN_PLACE_VISITED = setCreate();
    } else if (_isNode(dirty)) {
      body = _initDocument("<!---->");
      importedNode = body.ownerDocument.importNode(dirty, true);
      if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") body = importedNode;
      else if (importedNode.nodeName === "HTML") body = importedNode;
      else body.appendChild(importedNode);
      _sanitizeAttachedShadowRoots(body);
    } else {
      if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1) return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(dirty) : dirty;
      body = _initDocument(dirty);
      if (!body) return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
    }
    if (body && FORCE_BODY) _forceRemove(body.firstChild);
    const walkRoot = inPlace ? dirty : body;
    try {
      if (inPlace) _sanitizeAttachedShadowRoots(dirty);
      const nodeIterator = _createNodeIterator(walkRoot);
      while (currentNode = nodeIterator.nextNode()) {
        _sanitizeElements(currentNode, walkRoot);
        _sanitizeAttributes(currentNode, walkRoot);
        if (_isDocumentFragment(currentNode.content)) _sanitizeShadowDOM2(currentNode.content);
      }
      if (inPlace) _sanitizeUnvisitedNodes(dirty, inPlaceNodes);
    } catch (error) {
      if (inPlace) {
        _neutralizeRoot(dirty);
        _neutralizeDiscarded(dirty, inPlaceNodes);
      }
      throw error;
    } finally {
      IN_PLACE_VISITED = outerVisited;
    }
    if (inPlace) {
      if (_neutralizeDiscarded(dirty, inPlaceNodes)) throw typeErrorCreate("a node selected for removal could not be safely returned; refusing to sanitize in place");
      if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(dirty);
      return dirty;
    }
    if (RETURN_DOM) {
      if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(body);
      if (RETURN_DOM_FRAGMENT) {
        returnNode = createDocumentFragment.call(body.ownerDocument);
        while (body.firstChild) returnNode.appendChild(body.firstChild);
      } else returnNode = body;
      if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) returnNode = importNode.call(originalDocument, returnNode, true);
      return returnNode;
    }
    let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
    if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
    if (SAFE_FOR_TEMPLATES) serializedHTML = _stripTemplateExpressions(serializedHTML);
    return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(serializedHTML) : serializedHTML;
  };
  DOMPurify.setConfig = function() {
    let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    _parseConfig(cfg);
    SET_CONFIG = true;
    SET_CONFIG_ALLOWED_TAGS = ALLOWED_TAGS;
    SET_CONFIG_ALLOWED_ATTR = ALLOWED_ATTR;
  };
  DOMPurify.clearConfig = function() {
    CONFIG = null;
    SET_CONFIG = false;
    SET_CONFIG_ALLOWED_TAGS = null;
    SET_CONFIG_ALLOWED_ATTR = null;
    trustedTypesPolicy = defaultTrustedTypesPolicy;
    emptyHTML = "";
  };
  DOMPurify.isValidAttribute = function(tag, attr, value) {
    if (!CONFIG) _parseConfig({});
    const lcTag = transformCaseFunc(tag);
    const lcName = transformCaseFunc(attr);
    if (typeof value === "string" && (_isUnsafeAttributeValue(attr, value) || !ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value))) return false;
    return _isValidAttribute(lcTag, lcName, value);
  };
  DOMPurify.addHook = function(entryPoint, hookFunction) {
    if (typeof hookFunction !== "function") return;
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    arrayPush(hooks[entryPoint], hookFunction);
  };
  DOMPurify.removeHook = function(entryPoint, hookFunction) {
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    if (hookFunction !== void 0) {
      const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
      return index === -1 ? void 0 : arraySplice(hooks[entryPoint], index, 1)[0];
    }
    return arrayPop(hooks[entryPoint]);
  };
  DOMPurify.removeHooks = function(entryPoint) {
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    hooks[entryPoint] = [];
  };
  DOMPurify.removeAllHooks = function() {
    hooks = _createHooksMap();
  };
  return DOMPurify;
}
var purify_default = createDOMPurify();

// src/client/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var statusNames = { unread: "\u672A\u8BFB", reading: "\u5728\u8BFB", finished: "\u8BFB\u5B8C" };
function Glyph({ size = 20 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6",
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v16h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3zM12 6v16" })
    }
  );
}
function Modal({
  title,
  close,
  children
}) {
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "dialog",
    {
      className: "bs-modal",
      ref,
      onCancel: close,
      onClick: (e) => {
        if (e.target === e.currentTarget) close();
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: close, "aria-label": "\u5173\u95ED\u5BF9\u8BDD\u6846", children: "\xD7" })
        ] }),
        children
      ]
    }
  );
}
var Cover = (0, import_react.memo)(function Cover2({ book, call }) {
  const ref = (0, import_react.useRef)(null);
  const [cover, setCover] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    if (!book.cover) return;
    let live = true;
    const observer = new IntersectionObserver(
      (entries2) => {
        if (entries2[0].isIntersecting) {
          observer.disconnect();
          void call({ action: "cover", bookId: book.id }).then((src) => {
            if (live) setCover(src || "");
          }).catch(() => {
          });
        }
      },
      { rootMargin: "200px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [book.id, book.revision, book.cover, call]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      ref,
      className: "bs-cover",
      style: {
        "--book-hue": parseInt(book.id.slice(0, 4), 16) % 360
      },
      children: cover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: cover, alt: book.title, loading: "lazy", decoding: "async" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-cover-type", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
          book.format,
          " \xB7 \u79C1\u4EBA\u85CF\u4E66"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: book.title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: book.author || "\u4F5A\u540D" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glyph, { size: 28 })
      ] })
    }
  );
});
function EditBook({
  book,
  call,
  close,
  changed,
  remove
}) {
  const [title, setTitle] = (0, import_react.useState)(book.title), [author, setAuthor] = (0, import_react.useState)(book.author), [tags, setTags] = (0, import_react.useState)(book.tags.join("\uFF0C")), [status, setStatus] = (0, import_react.useState)(book.status), [error, setError] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: "\u7F16\u8F91\u4E66\u7C4D", close, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "form",
    {
      onSubmit: async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await call({
            action: "update",
            bookId: book.id,
            fields: { title, author, tags: tags.split(/[,，]/), status }
          });
          changed();
          close();
        } catch (e2) {
          setError(String(e2));
        } finally {
          setBusy(false);
        }
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u4E66\u540D",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              required: true,
              value: title,
              onChange: (e) => setTitle(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u4F5C\u8005",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: author, onChange: (e) => setAuthor(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u6807\u7B7E \xB7 \u9017\u53F7\u5206\u9694",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: tags, onChange: (e) => setTags(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u9605\u8BFB\u72B6\u6001",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "select",
            {
              value: status,
              onChange: (e) => setStatus(e.target.value),
              children: Object.entries(statusNames).map(([key, name]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: key, children: name }, key))
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "bs-muted bs-source", children: [
          "\u6765\u6E90\uFF1A",
          book.source
        ] }),
        error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: remove, children: "\u79FB\u51FA\u4E66\u67B6" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: close, children: "\u53D6\u6D88" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "bs-primary", disabled: busy, children: "\u4FDD\u5B58\u4FEE\u6539" })
        ] })
      ]
    }
  ) });
}
var citation = /(bookshelf:\/\/[\w-]+\/[\w-]+\/[\w-]+(?:\?revision=[\w-]+)?)/;
function linkCitations(root, cite) {
  const link = (url) => {
    const a = document.createElement("a");
    const [label, detail] = cite(url);
    a.href = url;
    a.textContent = label;
    a.title = detail;
    return a;
  };
  root.querySelectorAll('a[href^="bookshelf:"]').forEach((a) => {
    if (a.textContent.includes("bookshelf://")) {
      [a.textContent, a.title] = cite(a.getAttribute("href"));
    }
  });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (n.nodeValue.includes("bookshelf://") && !n.parentElement?.closest("a, pre"))
      texts.push(n);
  for (const node of texts) {
    const parts = node.data.split(citation);
    const code = node.parentElement?.closest("code");
    if (code && parts.length === 3 && !(parts[0] + parts[2]).trim())
      code.replaceWith(link(parts[1]));
    else node.replaceWith(...parts.map((p, i) => i % 2 ? link(p) : p));
  }
}
function RichText({
  text: text2,
  open,
  cite
}) {
  const html2 = (0, import_react.useMemo)(() => {
    const clean = purify_default.sanitize(
      d.parse(text2, { async: false }),
      {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "em",
          "del",
          "h1",
          "h2",
          "h3",
          "h4",
          "ul",
          "ol",
          "li",
          "blockquote",
          "code",
          "pre",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "a",
          "hr"
        ],
        ALLOWED_ATTR: ["href", "title"],
        ALLOWED_URI_REGEXP: /^(?:https?:|bookshelf:|#)/i
      }
    );
    if (!cite || !clean.includes("bookshelf://")) return clean;
    const template = document.createElement("template");
    template.innerHTML = clean;
    linkCitations(template.content, cite);
    return template.innerHTML;
  }, [text2, cite]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: "bs-message-text",
      onClick: (e) => {
        const a = e.target.closest("a");
        if (a?.getAttribute("href")?.startsWith("bookshelf://")) {
          e.preventDefault();
          open(a.getAttribute("href"));
        }
      },
      dangerouslySetInnerHTML: { __html: html2 }
    }
  );
}
function Assistant({
  ctx,
  call,
  book,
  open,
  fail,
  prompt,
  cite
}) {
  const [binding, setBinding] = (0, import_react.useState)(null), [text2, setText] = (0, import_react.useState)(
    () => localStorage.getItem("bookshelf.draft.v1." + (book?.id || "library")) || ""
  ), [busy, setBusy] = (0, import_react.useState)(false), [error, setError] = (0, import_react.useState)("");
  const reference = (0, import_react.useRef)(null), bottom = (0, import_react.useRef)(null);
  const scope = book?.id || "library";
  (0, import_react.useEffect)(() => {
    if (prompt) setText(prompt);
  }, [prompt]);
  (0, import_react.useEffect)(() => {
    let live = true;
    setBinding(null);
    setError("");
    void call({ action: "assistantSession", bookId: book?.id }).then(async (info) => {
      if (!info.sessionId || !live) return;
      const ref = ctx.sessions.retain(info.sessionId, {
        source: "bookshelf"
      });
      reference.current = ref;
      await ref.ready;
      if (live) setBinding(ref.binding);
      else ref.release();
    }).catch((e) => {
      if (live) setError(String(e));
    });
    return () => {
      live = false;
      reference.current?.release();
      reference.current = null;
    };
  }, [scope]);
  const subscribe = (0, import_react.useCallback)(
    (fn) => binding ? binding.session.subscribe(fn) : () => {
    },
    [binding]
  );
  const getSnapshot = (0, import_react.useCallback)(
    () => binding?.session.getSnapshot() || null,
    [binding]
  );
  const snapshot = (0, import_react.useSyncExternalStore)(subscribe, getSnapshot);
  const subscribeEvents = (0, import_react.useCallback)(
    (fn) => {
      if (!binding) return () => {
      };
      let frame = 0;
      const dispose = binding.eventSource.subscribe(() => {
        if (!frame)
          frame = requestAnimationFrame(() => {
            frame = 0;
            fn();
          });
      });
      return () => {
        dispose();
        cancelAnimationFrame(frame);
      };
    },
    [binding]
  );
  const getEvents = (0, import_react.useCallback)(
    () => binding?.eventSource.getSnapshot() || null,
    [binding]
  );
  const events = (0, import_react.useSyncExternalStore)(subscribeEvents, getEvents);
  const messages = (0, import_react.useMemo)(
    () => (events?.entries || []).filter(
      (entry) => ["user/message", "assistant/message", "assistant/attempt"].includes(
        entry.event.type
      ) && (entry.event.type !== "user/message" || entry.event.data.source?.kind === "user")
    ).map((entry) => {
      const event = entry.event;
      const message = event.type === "user/message" ? event.data : event.data.message;
      return {
        key: event.seq || entry.attemptId,
        role: event.type === "user/message" ? "user" : "assistant",
        text: (message?.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n")
      };
    }).filter((m2) => m2.text),
    [events]
  );
  const liveText = (0, import_react.useMemo)(() => {
    const entries2 = events?.entries || [];
    const settled = new Set(
      entries2.filter((e) => e.event.type === "assistant/message").map((e) => `${e.event.data.turn}:${e.event.data.step}`)
    );
    return entries2.filter(
      (e) => e.event.type === "assistant/live-chunk" && e.event.data.chunk.type === "text-delta" && !settled.has(`${e.event.data.turn}:${e.event.data.step}`)
    ).map((e) => e.event.data.chunk.text).join("");
  }, [events]);
  (0, import_react.useEffect)(() => {
    localStorage.setItem("bookshelf.draft.v1." + scope, text2);
  }, [text2, scope]);
  (0, import_react.useEffect)(() => {
    const node = bottom.current?.parentElement;
    if (node && node.scrollHeight - node.scrollTop - node.clientHeight < 250)
      bottom.current?.scrollIntoView({ block: "end" });
  }, [events]);
  async function createConversation() {
    const info = await call({
      action: "assistantSession",
      bookId: book?.id
    });
    const id = await ctx.sessions.create({ cwd: info.cwd });
    await call({
      action: "assistantSession",
      bookId: book?.id,
      sessionId: id
    });
    const renamed = await ctx.remote.session.rename({
      sessionId: id,
      title: book ? `\u4E66\u67B6 \xB7 ${book.title}` : "\u4E66\u67B6\u52A9\u624B"
    });
    if (!renamed.ok) throw new Error(renamed.error.message);
    const ref = ctx.sessions.retain(id, { source: "bookshelf" });
    await ref.ready;
    const next = ref.binding;
    reference.current?.release();
    reference.current = ref;
    setBinding(next);
    return next;
  }
  async function send() {
    if (!text2.trim() || busy || snapshot?.running) return;
    setBusy(true);
    setError("");
    try {
      let b2 = binding;
      if (!b2) b2 = await createConversation();
      const context = book ? `\u5F53\u524D\u8BA8\u8BBA\u300A${book.title}\u300B\uFF0CbookId=${book.id}\u3002` : "\u8BF7\u6839\u636E\u672C\u5730\u4E66\u67B6\u7684\u73B0\u6709\u85CF\u4E66\u56DE\u7B54\u3002";
      const content = `${context}
\u4F7F\u7528 bookshelf \u5DE5\u5177\u8BFB\u53D6\u4E0E\u95EE\u9898\u76F8\u5173\u7684\u539F\u6587\uFF1B\u5F15\u7528\u65F6\u539F\u6837\u4FDD\u7559\u5DE5\u5177\u8FD4\u56DE\u7684 bookshelf:// URL \u548C revision\u3002\u533A\u5206\u539F\u6587\u4F9D\u636E\u4E0E\u63A8\u65AD\u3002

\u7528\u6237\u95EE\u9898\uFF1A${text2.trim()}`;
      const result = await b2.session.prompt(
        [{ type: "text", text: content }],
        "queue"
      );
      if (!result.ok) throw new Error(result.error.message);
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className: "bs-assistant", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glyph, { size: 17 }),
        " \u4E66\u67B6\u52A9\u624B"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          disabled: busy || snapshot?.running,
          onClick: async () => {
            setBusy(true);
            setError("");
            try {
              await createConversation();
              setText("");
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          },
          children: "\u65B0\u5BF9\u8BDD"
        }
      ),
      binding && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          title: "\u6253\u5F00\u5B8C\u6574 DSH \u4F1A\u8BDD\u4E0E\u6A21\u578B\u8BBE\u7F6E",
          onClick: () => void ctx.uiWorkspace.openSession(binding.sessionId),
          children: "\u6253\u5F00\u4F1A\u8BDD \u2197"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-assistant-scope", children: book ? `\u5F53\u524D\u4E66\u7C4D \xB7 ${book.title}` : "\u4ECE\u4F60\u7684\u85CF\u4E66\u4E2D\u5BFB\u627E\u7B54\u6848" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-chat", "aria-live": "polite", children: [
      messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-chat-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glyph, { size: 32 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u8BA9\u9605\u8BFB\u4E0E\u4F60\u7684\u751F\u6D3B\u76F8\u9047" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u95EE\u4E00\u4E2A\u95EE\u9898\uFF0C\u627E\u5230\u503C\u5F97\u91CD\u8BFB\u7684\u6BB5\u843D\u3002" }),
        [
          "\u5E2E\u6211\u68B3\u7406\u8FD9\u672C\u4E66\u7684\u6838\u5FC3\u89C2\u70B9",
          "\u9488\u5BF9\u5F53\u524D\u56F0\u60D1\uFF0C\u63A8\u8350\u503C\u5F97\u8BFB\u7684\u7AE0\u8282",
          "\u627E\u51FA\u4E66\u4E2D\u76F8\u5173\u8BBA\u8FF0\u5E76\u9644\u4E0A\u539F\u6587",
          "\u7528\u6211\u6536\u85CF\u7684\u751F\u8BCD\u51FA\u51E0\u9053\u9898"
        ].map((q2) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setText(q2), children: [
          q2,
          " \u2197"
        ] }, q2))
      ] }) : messages.map((m2) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "bs-message bs-message-" + m2.role, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: m2.role === "user" ? "\u4F60" : "\u4E66\u67B6\u52A9\u624B" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          RichText,
          {
            text: m2.role === "user" ? m2.text.split("\u7528\u6237\u95EE\u9898\uFF1A").at(-1) : m2.text,
            open,
            cite
          }
        )
      ] }, m2.key)),
      liveText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", { className: "bs-message", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RichText, { text: liveText, open, cite }) }),
      snapshot?.running && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u6B63\u5728\u9605\u8BFB\u4E0E\u601D\u8003\u2026" }),
      (error || snapshot?.promptError || snapshot?.lastAgentError) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-error", role: "alert", children: [
        error || snapshot?.promptError?.message || String(snapshot?.lastAgentError),
        binding && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: () => void ctx.uiWorkspace.openSession(binding.sessionId),
            children: "\u8FDB\u5165 DSH \u4F1A\u8BDD\u5904\u7406"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: bottom })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "form",
      {
        className: "bs-composer",
        onSubmit: (e) => {
          e.preventDefault();
          void send();
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "textarea",
            {
              "aria-label": "\u5411\u4E66\u67B6\u52A9\u624B\u63D0\u95EE",
              placeholder: book ? "\u548C\u8FD9\u672C\u4E66\u804A\u4E00\u804A\u2026" : "\u63D0\u4E00\u4E2A\u4E0E\u4F60\u6709\u5173\u7684\u95EE\u9898\u2026",
              value: text2,
              onChange: (e) => setText(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u6CBF\u7528 DSH \u6A21\u578B \xB7 Enter \u53D1\u9001" }),
            snapshot?.running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: () => void binding.session.cancel().catch(fail),
                children: "\u505C\u6B62"
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "bs-primary", disabled: busy || !text2.trim(), children: busy ? "\u8FDE\u63A5\u4E2D\u2026" : "\u53D1\u9001 \u2191" })
          ] })
        ]
      }
    )
  ] });
}
var tagNames = {
  zk: "\u4E2D\u8003",
  gk: "\u9AD8\u8003",
  cet4: "\u56DB\u7EA7",
  cet6: "\u516D\u7EA7",
  ky: "\u8003\u7814",
  toefl: "TOEFL",
  ielts: "IELTS",
  gre: "GRE"
};
var formNames = {
  p: "\u8FC7\u53BB\u5F0F",
  d: "\u8FC7\u53BB\u5206\u8BCD",
  i: "\u73B0\u5728\u5206\u8BCD",
  "3": "\u7B2C\u4E09\u4EBA\u79F0\u5355\u6570",
  r: "\u6BD4\u8F83\u7EA7",
  t: "\u6700\u9AD8\u7EA7",
  s: "\u590D\u6570"
};
var highlights = typeof Highlight === "undefined" ? null : new Highlight();
function quoteRange(root, quote) {
  const chars = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const data = node.data;
    for (let i = 0; i < data.length; i++)
      if (!/\s/.test(data[i])) chars.push([node, i]);
  }
  const text2 = chars.map(([node, i]) => node.data[i]).join("");
  const q2 = quote.replace(/\s+/g, "");
  const range = document.createRange();
  let start = q2 ? text2.indexOf(q2) : -1, end = start + q2.length;
  for (let k2 = Math.min(q2.length, text2.length); start < 0 && k2 >= 4; k2--) {
    if (text2.endsWith(q2.slice(0, k2)))
      [start, end] = [text2.length - k2, text2.length];
    else if (text2.startsWith(q2.slice(-k2))) [start, end] = [0, k2];
  }
  if (start < 0) {
    range.selectNodeContents(root);
    return range;
  }
  range.setStart(chars[start][0], chars[start][1]);
  range.setEnd(chars[end - 1][0], chars[end - 1][1] + 1);
  return range;
}
var megabytes = (n) => (n / 1048576).toFixed(1) + " MB";
function useAssist(ctx) {
  const [state, setState] = (0, import_react.useState)({
    text: "",
    running: false,
    error: "",
    model: "",
    cached: false
  });
  const controller = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => () => controller.current?.abort(), []);
  const stop = (0, import_react.useCallback)(() => {
    controller.current?.abort();
    controller.current = null;
    setState((s) => ({ ...s, running: false }));
  }, []);
  const start = (0, import_react.useCallback)(
    async (input) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setState({
        text: "",
        running: true,
        error: "",
        model: "",
        cached: false
      });
      try {
        const stream = ctx.remote.bookshelf.stream(
          input,
          c.signal
        );
        for await (const item of stream) {
          if (c.signal.aborted) break;
          if (item.type === "delta")
            setState((s) => ({ ...s, text: s.text + item.text }));
          else if (item.type === "done")
            setState((s) => ({ ...s, model: item.model, cached: item.cached }));
          else setState((s) => ({ ...s, error: item.message }));
        }
      } catch (e) {
        if (!c.signal.aborted)
          setState((s) => ({
            ...s,
            error: e?.message || String(e)
          }));
      } finally {
        if (controller.current === c) {
          controller.current = null;
          setState((s) => ({ ...s, running: false }));
        }
      }
    },
    [ctx]
  );
  return { ...state, start, stop };
}
function DictionarySetup({
  call,
  onReady
}) {
  const [status, setStatus] = (0, import_react.useState)(null), [file, setFile] = (0, import_react.useState)(""), [error, setError] = (0, import_react.useState)("");
  const running = !!status?.job.running;
  (0, import_react.useEffect)(() => {
    void call({ action: "dictionaryStatus" }).then(setStatus).catch((e) => setError(e.message));
  }, [call]);
  (0, import_react.useEffect)(() => {
    if (!running) return;
    const timer = setInterval(
      () => void call({ action: "dictionaryStatus" }).then((next) => {
        setStatus(next);
        if (!next.job.running && next.installed && !next.job.error)
          onReady();
      }).catch((e) => setError(e.message)),
      800
    );
    return () => clearInterval(timer);
  }, [running, call, onReady]);
  const run = (input) => {
    setError("");
    void call(input).then(setStatus).catch((e) => setError(e.message));
  };
  const job = status?.job;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-dict-setup", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u79BB\u7EBF\u8BCD\u5178\u5C1A\u672A\u5B89\u88C5\u3002\u5B89\u88C5\u5F00\u6E90\u82F1\u6C49\u8BCD\u5178 ECDICT\uFF08MIT \u534F\u8BAE\uFF0C\u7EA6 77 \u4E07\u8BCD\u6761\uFF09\u540E\uFF0C\u67E5\u8BCD\u5373\u65F6\u663E\u793A\u97F3\u6807\u3001\u91CA\u4E49\u4E0E\u8BCD\u5F62\u53D8\u5316\uFF0C\u65E0\u9700\u8054\u7F51\u3002" }),
    running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", role: "status", children: job.phase === "download" ? `\u6B63\u5728\u4E0B\u8F7D ${megabytes(job.received)}${job.total ? ` / ${megabytes(job.total)}` : ""}` : `\u6B63\u5728\u5EFA\u7ACB\u7D22\u5F15 \xB7 \u5DF2\u5904\u7406 ${job.received.toLocaleString()} \u6761` }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: "bs-primary",
          disabled: !status,
          onClick: () => run({ action: "dictionaryInstall" }),
          children: "\u4E0B\u8F7D ECDICT\uFF08\u7EA6 63 MB\uFF09"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            run({ action: "dictionaryImport", path: file.trim() });
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                "aria-label": "\u672C\u5730 ecdict.csv \u7684\u7EDD\u5BF9\u8DEF\u5F84",
                placeholder: "\u6216\u586B\u5199\u5DF2\u4E0B\u8F7D\u7684 ecdict.csv \u7EDD\u5BF9\u8DEF\u5F84",
                value: file,
                onChange: (e) => setFile(e.target.value)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: !file.trim(), children: "\u5BFC\u5165" })
          ]
        }
      )
    ] }),
    (error || job?.error) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-error", role: "alert", children: error || job?.error })
  ] });
}
function splitSenses(line) {
  const [, pos = "", rest] = /^((?:[a-z]+\.\s*(?:&\s*)?)+|\[[^\]]+\]\s*)?([\s\S]*)$/.exec(line.trim());
  return {
    pos: pos.trim(),
    items: rest.split(/[；;]/).map((s) => s.trim()).filter(Boolean)
  };
}
var pickedSenses = (entry, index, picked) => entry.translation.flatMap((line, l) => {
  const { pos, items } = splitSenses(line);
  const chosen = items.filter(
    (_2, k2) => picked.includes(`${index}:${l}:${k2}`)
  );
  return chosen.length ? [`${pos} ${chosen.join("\uFF1B")}`.trim()] : [];
});
var plainText = (markdown) => new DOMParser().parseFromString(
  d.parse(markdown, { async: false }),
  "text/html"
).body.textContent?.trim() ?? "";
function DictEntryView({
  entry,
  index,
  picked,
  pick
}) {
  const via = entry.via?.types.map((t) => formNames[t]).filter(Boolean);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "bs-dict-entry", children: [
    entry.via && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "bs-dict-via", children: [
      entry.via.word,
      " \u662F ",
      entry.word,
      " \u7684",
      via?.join("\u3001") || "\u53D8\u5316\u5F62\u5F0F"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
      entry.word,
      entry.phonetic && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "bs-phonetic", children: [
        "/",
        entry.phonetic,
        "/"
      ] })
    ] }),
    (entry.collins > 0 || entry.oxford || entry.tags.length > 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-dict-tags", children: [
      entry.collins > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: "\u67EF\u6797\u65AF\u661F\u7EA7", children: "\u2605".repeat(entry.collins) }),
      entry.oxford && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u725B\u6D25 3000" }),
      entry.tags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tagNames[t] || t }, t))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: entry.translation.map((line, l) => {
      const { pos, items } = splitSenses(line);
      if (!items.length || inflection.test(line.trim()))
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, l);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        pos && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bs-pos", children: pos }),
        items.map((sense, k2) => {
          const key = `${index}:${l}:${k2}`;
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.default.Fragment, { children: [
            k2 > 0 && "\uFF1B",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                className: "bs-sense",
                "aria-pressed": picked.includes(key),
                title: "\u9009\u4E2D\u540E\u53EA\u6536\u85CF\u9009\u4E2D\u7684\u91CA\u4E49",
                onClick: () => pick(key),
                children: sense
              }
            )
          ] }, k2);
        })
      ] }, l);
    }) }),
    entry.forms.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-dict-forms", children: entry.forms.map((f) => `${formNames[f.type]} ${f.word}`).join(" \xB7 ") }),
    entry.definition.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u82F1\u6587\u91CA\u4E49" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: entry.definition.map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, i)) })
    ] })
  ] });
}
var entryNote = (e) => `${e.word}${e.phonetic ? ` /${e.phonetic}/` : ""}
${e.translation.join("\n")}`;
var entryBack = (e) => [e.phonetic && `/${e.phonetic}/`, ...e.translation].filter(Boolean).join("\n");
var inflection = /^\S+的(复数|过去式|过去分词|现在分词|第三人称单数|比较级|最高级)$/;
var headEntry = (entries2) => entries2[0]?.translation.every((t) => inflection.test(t.trim())) && entries2.find((e) => e.via) || entries2[0];
function drag(event, move, done) {
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const end = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    done?.();
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}
function LookupCard({
  ctx,
  call,
  lookup,
  close,
  save,
  collect,
  fail,
  explain
}) {
  const assist = useAssist(ctx);
  const card = (0, import_react.useRef)(null), height = (0, import_react.useRef)(Number(localStorage.getItem("bookshelf.lookup.v1")) || 0);
  const [result, setResult] = (0, import_react.useState)(null), [error, setError] = (0, import_react.useState)(""), [saved, setSaved] = (0, import_react.useState)(false), [collected, setCollected] = (0, import_react.useState)(false), [picked, setPicked] = (0, import_react.useState)([]);
  const word = lookup.mode === "word";
  const entryOf = (key) => key.split(":")[0];
  function pick(key) {
    setCollected(false);
    setPicked(
      (keys) => keys.includes(key) ? keys.filter((k2) => k2 !== key) : [
        ...keys.filter(
          (k2) => key === "explain" || k2 === "explain" || entryOf(k2) === entryOf(key)
        ),
        key
      ]
    );
  }
  function collectWord() {
    const entries2 = result?.entries || [];
    const explained = plainText(assist.text);
    const keys = picked.filter((k2) => k2 !== "explain");
    const index = keys.length ? Number(entryOf(keys[0])) : entries2.indexOf(headEntry(entries2));
    const entry = entries2[index];
    if (!picked.length)
      return collect(
        "word",
        entry?.word || lookup.text,
        [entry && entryBack(entry), explained].filter(Boolean).join("\n"),
        lookup.text
      );
    const sense = [
      ...entry ? pickedSenses(entry, index, keys) : [],
      picked.includes("explain") && explained
    ].filter(Boolean).join("\n");
    return collect(
      "word",
      entry?.word || lookup.text,
      [entry?.phonetic && `/${entry.phonetic}/`, sense].filter(Boolean).join("\n"),
      lookup.text,
      sense
    );
  }
  const loadEntries = (0, import_react.useCallback)(
    () => void call({ action: "lookup", query: lookup.text }).then(setResult).catch((e) => setError(e.message)),
    [call, lookup.text]
  );
  const translate = () => void assist.start({
    kind: "translate",
    text: lookup.text,
    context: lookup.context
  });
  (0, import_react.useEffect)(() => {
    if (word) loadEntries();
    else translate();
  }, []);
  (0, import_react.useEffect)(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  const note = word ? [
    ...(result?.entries || []).slice(0, 2).map(entryNote),
    assist.text && `\u8BED\u5883\u91CA\u4E49\uFF1A${assist.text}`
  ].filter(Boolean).join("\n\n") : assist.text;
  function resize(event) {
    const section = card.current;
    const start = event.clientY, initial = section.getBoundingClientRect().height, limit = section.parentElement.clientHeight * 0.75;
    drag(
      event,
      (e) => {
        height.current = Math.round(
          Math.max(120, Math.min(limit, initial + start - e.clientY))
        );
        section.style.setProperty("--lookup-height", `${height.current}px`);
      },
      () => localStorage.setItem("bookshelf.lookup.v1", String(height.current))
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "section",
    {
      className: "bs-lookup",
      ref: card,
      "aria-label": word ? "\u67E5\u8BCD\u7ED3\u679C" : "\u7FFB\u8BD1\u7ED3\u679C",
      style: height.current ? {
        "--lookup-height": `${height.current}px`
      } : void 0,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            className: "bs-resizer bs-lookup-resizer",
            role: "separator",
            "aria-label": "\u62D6\u52A8\u8C03\u6574\u67E5\u8BCD\u680F\u9AD8\u5EA6",
            "aria-orientation": "horizontal",
            onPointerDown: resize
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: word ? "\u67E5\u8BCD" : "\u7FFB\u8BD1" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: lookup.text, children: lookup.text }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { "aria-label": "\u5173\u95ED", onClick: close, children: "\xD7" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-lookup-body", "aria-live": "polite", children: [
          word ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-error", role: "alert", children: error }) : !result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u6B63\u5728\u67E5\u8BE2\u2026" }) : !result.installed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DictionarySetup, { call, onReady: loadEntries }) : result.entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "bs-muted", children: [
              "\u79BB\u7EBF\u8BCD\u5178\u672A\u6536\u5F55\u300C",
              lookup.text,
              "\u300D",
              explain ? "\uFF0C\u53EF\u4EE5\u8BD5\u8BD5\u7ED3\u5408\u4E0A\u4E0B\u6587\u89E3\u91CA\u3002" : "\u3002"
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              lookup.collect && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted bs-sense-hint", children: "\u70B9\u9009\u8981\u6536\u85CF\u7684\u91CA\u4E49\uFF0C\u53EF\u4EE5\u591A\u9009\uFF1B\u4E0D\u9009\u5219\u6536\u85CF\u6574\u4E2A\u8BCD\u6761\u3002" }),
              result.entries.map((entry, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                DictEntryView,
                {
                  entry,
                  index: i,
                  picked,
                  pick
                },
                entry.word + i
              ))
            ] }),
            explain && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-context-explain", children: assist.text || assist.running || assist.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
                "\u8BED\u5883\u91CA\u4E49",
                assist.text && !assist.running && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    className: "bs-sense",
                    "aria-pressed": picked.includes("explain"),
                    onClick: () => pick("explain"),
                    children: picked.includes("explain") ? "\u2713 \u5DF2\u9009\u5165\u5361\u7247" : "\u9009\u5165\u5361\u7247"
                  }
                )
              ] }),
              assist.text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RichText, { text: assist.text, open: () => {
              } }) : assist.running && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u6B63\u5728\u7ED3\u5408\u4E0A\u4E0B\u6587\u89E3\u91CA\u2026" })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                onClick: () => void assist.start({
                  kind: "explain",
                  text: lookup.text,
                  context: lookup.context
                }),
                children: "\u7ED3\u5408\u4E0A\u4E0B\u6587\u89E3\u91CA \u2726"
              }
            ) })
          ] }) : assist.text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-translation", children: assist.text }) : assist.running && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u6B63\u5728\u7FFB\u8BD1\u2026" }),
          assist.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-error", role: "alert", children: assist.error })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: assist.model ? `${assist.model}${assist.cached ? " \xB7 \u6765\u81EA\u7F13\u5B58" : ""}` : word ? "ECDICT \u79BB\u7EBF\u8BCD\u5178" : "\u6CBF\u7528 DSH \u9ED8\u8BA4\u6A21\u578B" }),
          assist.running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: assist.stop, children: "\u505C\u6B62" }) : !word && assist.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: translate, children: "\u91CD\u8BD5" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              disabled: !note || assist.running || saved,
              onClick: () => void save(note).then(() => setSaved(true)).catch(fail),
              children: saved ? "\u5DF2\u5B58\u4E3A\u7B14\u8BB0" : "\u5B58\u4E3A\u7B14\u8BB0"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              disabled: collected || assist.running || (word ? !result : !assist.text),
              onClick: () => void (word ? collectWord() : collect("passage", lookup.text, assist.text)).then(() => setCollected(true)).catch(fail),
              children: collected ? "\u5DF2\u52A0\u5165\u590D\u4E60" : picked.length ? `\u6536\u85CF ${picked.length} \u6761\u91CA\u4E49` : "\u6536\u85CF\u590D\u4E60"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              disabled: !note,
              onClick: () => void navigator.clipboard.writeText(note).catch(fail),
              children: "\u590D\u5236"
            }
          )
        ] })
      ]
    }
  );
}
var BlockHTML = (0, import_react.memo)(function BlockHTML2({ html: html2 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { dangerouslySetInnerHTML: { __html: html2 } });
});
function Reader({
  ctx,
  book,
  call,
  target,
  onBack,
  fail,
  onUpdate,
  onAsk,
  notify
}) {
  const [chapterId, setChapterId] = (0, import_react.useState)(
    target.chapter || book.progress.chapter || book.chapters[0].id
  ), [chapter, setChapter] = (0, import_react.useState)(null), [notes, setNotes] = (0, import_react.useState)([]), [tab, setTab] = (0, import_react.useState)("contents"), [selection, setSelection] = (0, import_react.useState)(null), [lookup, setLookup] = (0, import_react.useState)(null), [note, setNote] = (0, import_react.useState)(""), [editing, setEditing] = (0, import_react.useState)(null), [font, setFont] = (0, import_react.useState)(
    () => Number(localStorage.getItem("bookshelf.font.v1")) || 20
  ), [paper, setPaper] = (0, import_react.useState)(
    () => localStorage.getItem("bookshelf.paper.v1") === "true"
  ), [loading, setLoading] = (0, import_react.useState)(false), [noteDialog, setNoteDialog] = (0, import_react.useState)(false);
  const jump = (0, import_react.useRef)(null);
  const scroll = (0, import_react.useRef)(null), body = (0, import_react.useRef)(null), tocWidth = (0, import_react.useRef)(Number(localStorage.getItem("bookshelf.toc.v1")) || 0), position = (0, import_react.useRef)(null), saveTimer = (0, import_react.useRef)(null), request = (0, import_react.useRef)(0), painted = (0, import_react.useRef)([]);
  const [active, setActive] = (0, import_react.useState)(null);
  const refreshNotes = (0, import_react.useCallback)(
    () => call({ action: "annotations", bookId: book.id }).then(setNotes).catch(fail),
    [book.id, call]
  );
  const closeLookup = (0, import_react.useCallback)(() => setLookup(null), []);
  const [features, setFeatures] = (0, import_react.useState)({ contextExplain: false });
  const translatable = (text2) => !(isChineseTarget(features.targetLanguage || "\u7B80\u4F53\u4E2D\u6587") && isChinese(text2));
  (0, import_react.useEffect)(() => {
    void call({ action: "features" }).then(setFeatures).catch(() => {
    });
  }, [call]);
  (0, import_react.useEffect)(() => {
    void refreshNotes();
  }, [refreshNotes]);
  (0, import_react.useEffect)(() => {
    const container = scroll.current;
    if (!highlights || !container || loading || !chapter) return;
    CSS.highlights.set("bs-highlight", highlights);
    const pairs = notes.flatMap((n) => {
      const root = n.kind === "highlight" && n.revision === book.revision && n.chapter === chapter.id && container.querySelector(
        `[data-block="${CSS.escape(n.block)}"] > div`
      );
      const range = root && quoteRange(root, n.quote);
      return range ? [[range, n]] : [];
    });
    pairs.forEach(([r]) => highlights.add(r));
    painted.current = pairs;
    return () => {
      pairs.forEach(([r]) => highlights.delete(r));
      painted.current = [];
    };
  }, [notes, chapter, loading, book.revision]);
  (0, import_react.useEffect)(() => {
    if (target.chapter) setChapterId(target.chapter);
  }, [target]);
  (0, import_react.useEffect)(() => {
    const generation = ++request.current;
    setLoading(true);
    setSelection(null);
    setLookup(null);
    setActive(null);
    void call({ action: "chapter", bookId: book.id, chapter: chapterId }).then((c) => {
      if (generation !== request.current) return;
      setChapter(c);
      requestAnimationFrame(() => {
        const container = scroll.current;
        if (!container) return;
        const block = jump.current?.chapter === chapterId ? jump.current.block : target.chapter === chapterId ? target.block : book.progress.chapter === chapterId ? book.progress.block : void 0;
        jump.current = null;
        const chapterIndex = book.chapters.findIndex(
          (item) => item.id === c.id
        );
        const offset = book.chapters.slice(0, chapterIndex).reduce((n, item) => n + item.length, 0);
        const total = book.chapters.reduce((n, item) => n + item.length, 0);
        position.current = {
          action: "progress",
          bookId: book.id,
          chapter: c.id,
          block: block || c.blocks[0]?.id || "p0",
          ratio: (offset + Math.max(
            0,
            c.blocks.findIndex((p) => p.id === block)
          )) / Math.max(1, total)
        };
        void call(position.current).catch(fail);
        const element = block ? container.querySelector(`[data-block="${block}"]`) : null;
        if (element) {
          element.scrollIntoView({ block: "start" });
          if (target.block) {
            element.classList.add("bs-flash");
            setTimeout(() => element.classList.remove("bs-flash"), 2400);
          }
        } else container.scrollTop = 0;
      });
    }).catch(fail).finally(() => {
      if (generation === request.current) setLoading(false);
    });
    return () => {
      request.current++;
    };
  }, [chapterId, book.id, target]);
  (0, import_react.useEffect)(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (position.current) void call(position.current).catch(fail);
    },
    [book.id]
  );
  function track() {
    if (!chapter || !scroll.current) return;
    const root = scroll.current;
    const blocks = Array.from(
      root.querySelectorAll("[data-block]")
    );
    const top = root.getBoundingClientRect().top;
    const visible = blocks.find(
      (el) => el.getBoundingClientRect().bottom > top + 40
    );
    const index = book.chapters.findIndex((c) => c.id === chapter.id);
    const offset = book.chapters.slice(0, index).reduce((n, c) => n + c.length, 0);
    const total = book.chapters.reduce((n, c) => n + c.length, 0);
    const block = visible?.dataset.block || "p0";
    position.current = {
      action: "progress",
      bookId: book.id,
      chapter: chapter.id,
      block,
      ratio: (offset + Math.max(
        0,
        chapter.blocks.findIndex((p) => p.id === block)
      )) / Math.max(1, total)
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () => void call(position.current).catch(fail),
      900
    );
  }
  async function annotate(kind, block, quote, text2 = note) {
    await call({
      action: "annotate",
      bookId: book.id,
      chapter: chapterId,
      block,
      quote,
      note: kind === "highlight" ? text2 : "",
      kind
    });
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setNoteDialog(false);
    setNote("");
    await refreshNotes();
  }
  async function collect(block, kind, front, back, term = "", sense = "") {
    const { created } = await call({
      action: "collect",
      kind,
      front,
      back,
      term,
      sense,
      bookId: book.id,
      chapter: chapterId,
      block
    });
    notify(created ? "\u5DF2\u52A0\u5165\u590D\u4E60" : "\u5DF2\u5728\u590D\u4E60\u4E2D\uFF0C\u5185\u5BB9\u5DF2\u66F4\u65B0");
  }
  async function collectQuote(from, note2 = "") {
    const { block, quote } = from;
    if (!isTerm(quote)) return collect(block, "passage", quote, note2);
    if (!note2) return open("word", from, true);
    const result = await call({ action: "lookup", query: quote }).catch(
      () => null
    );
    await collect(
      block,
      "word",
      headEntry(result?.entries || [])?.word || quote.trim(),
      note2,
      quote.trim()
    );
  }
  const blockContext = (block) => chapter?.blocks.find((b2) => b2.id === block)?.text.slice(0, 2e3) || "";
  function selected(e) {
    const s = window.getSelection();
    if ((!s || s.isCollapsed) && "clientX" in e) {
      if (e.target.closest("a, button")) return;
      const hit = painted.current.findLast(
        ([range]) => Array.from(range.getClientRects()).some(
          (r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
        )
      );
      setActive(hit ? hit[1] : null);
      return;
    }
    if (!s || s.isCollapsed || !scroll.current?.contains(s.anchorNode) || !scroll.current.contains(s.focusNode))
      return;
    setActive(null);
    const node = s.anchorNode?.parentElement?.closest("[data-block]");
    if (!node) return;
    const next = {
      block: node.dataset.block,
      quote: s.toString().trim().slice(0, 4e3),
      context: blockContext(node.dataset.block)
    };
    if (e.type === "mouseup" && e.detail === 2 && isTerm(next.quote))
      open("word", next);
    else setSelection(next);
  }
  function resizeToc(event) {
    const container = body.current;
    const start = event.clientX;
    const width = container.querySelector(".bs-toc").getBoundingClientRect().width;
    drag(
      event,
      (e) => {
        tocWidth.current = Math.round(
          Math.max(
            100,
            Math.min(
              420,
              container.clientWidth * 0.5,
              width + e.clientX - start
            )
          )
        );
        container.style.setProperty("--toc-width", `${tocWidth.current}px`);
      },
      () => localStorage.setItem("bookshelf.toc.v1", String(tocWidth.current))
    );
  }
  function open(mode, from = selection, collect2 = false) {
    setLookup({
      id: Date.now(),
      mode,
      text: from.quote,
      block: from.block,
      context: from.context,
      collect: collect2
    });
    setSelection(null);
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "bs-reader" + (paper ? " bs-paper" : ""), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-reader-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => {
            onBack();
            onUpdate();
          },
          children: "\u2190 \u4E66\u67B6"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: book.title, children: book.title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          "aria-label": "\u7F29\u5C0F\u5B57\u53F7",
          onClick: () => setFont((v2) => {
            const n = Math.max(15, v2 - 1);
            localStorage.setItem("bookshelf.font.v1", String(n));
            return n;
          }),
          children: "A\u2212"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          "aria-label": "\u653E\u5927\u5B57\u53F7",
          onClick: () => setFont((v2) => {
            const n = Math.min(30, v2 + 1);
            localStorage.setItem("bookshelf.font.v1", String(n));
            return n;
          }),
          children: "A+"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          "aria-label": "\u5207\u6362\u7EB8\u5F20\u80CC\u666F",
          "aria-pressed": paper,
          onClick: () => setPaper((v2) => {
            localStorage.setItem("bookshelf.paper.v1", String(!v2));
            return !v2;
          }),
          children: "\u25D0"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "bs-reader-body",
        ref: body,
        style: tocWidth.current ? {
          "--toc-width": `${tocWidth.current}px`
        } : void 0,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { className: "bs-toc", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-tabs", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  "aria-pressed": tab === "contents",
                  onClick: () => setTab("contents"),
                  children: "\u76EE\u5F55"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "button",
                {
                  "aria-pressed": tab === "notes",
                  onClick: () => setTab("notes"),
                  children: [
                    "\u7B14\u8BB0 ",
                    notes.length
                  ]
                }
              )
            ] }),
            tab === "contents" ? book.chapters.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                className: chapterId === c.id ? "bs-selected" : "",
                onClick: () => setChapterId(c.id),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: String(i + 1).padStart(2, "0") }),
                  c.title
                ]
              },
              c.id
            )) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              notes.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "bs-note", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "button",
                  {
                    onClick: () => {
                      if (a.revision !== book.revision) {
                        fail(
                          new Error(
                            "\u8FD9\u6761\u7B14\u8BB0\u6765\u81EA\u6B64\u524D\u7248\u672C\uFF0C\u5F15\u7528\u5185\u5BB9\u4FDD\u7559\u5728\u7B14\u8BB0\u4E2D"
                          )
                        );
                        return;
                      }
                      jump.current = { chapter: a.chapter, block: a.block };
                      setChapterId(a.chapter);
                      requestAnimationFrame(
                        () => scroll.current?.querySelector(`[data-block="${a.block}"]`)?.scrollIntoView()
                      );
                    },
                    children: [
                      a.kind === "bookmark" ? "\u2691 " : "",
                      a.quote || "\u4E66\u7B7E"
                    ]
                  }
                ),
                a.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: a.note }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      onClick: () => {
                        setEditing(a);
                        setNote(a.note);
                      },
                      children: "\u7F16\u8F91"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      onClick: () => void call({ action: "removeAnnotation", id: a.id }).then(refreshNotes).catch(fail),
                      children: "\u79FB\u9664"
                    }
                  )
                ] })
              ] }, a.id)),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => void call({ action: "exportNotes", bookId: book.id }).then((markdown) => {
                    const url = URL.createObjectURL(
                      new Blob([markdown], {
                        type: "text/markdown;charset=utf-8"
                      })
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = book.title + "-\u9605\u8BFB\u7B14\u8BB0.md";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1e3);
                  }).catch(fail),
                  children: "\u5BFC\u51FA\u9605\u8BFB\u7B14\u8BB0 \u2197"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              className: "bs-resizer bs-toc-resizer",
              role: "separator",
              "aria-label": "\u62D6\u52A8\u8C03\u6574\u76EE\u5F55\u5BBD\u5EA6",
              "aria-orientation": "vertical",
              onPointerDown: resizeToc
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-page-column", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                className: "bs-page",
                ref: scroll,
                onScroll: track,
                onMouseUp: selected,
                onKeyUp: selected,
                style: { fontSize: font },
                children: [
                  target.revision && target.revision !== book.revision ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-error", children: "\u5F15\u7528\u5BF9\u5E94\u6B64\u524D\u7248\u672C\uFF0C\u5F53\u524D\u5C55\u793A\u6700\u65B0\u6B63\u6587\u3002" }) : null,
                  loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u6B63\u5728\u6253\u5F00\u7AE0\u8282\u2026" }) : chapter && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-page-heading", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
                        book.author,
                        " \xB7 ",
                        book.format
                      ] }),
                      chapter.blocks[0]?.text !== chapter.title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: chapter.title })
                    ] }),
                    chapter.blocks.map((block) => {
                      const marks = notes.filter(
                        (n) => n.kind === "bookmark" && n.revision === book.revision && n.chapter === chapterId && n.block === block.id
                      );
                      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                        "div",
                        {
                          "data-block": block.id,
                          className: "bs-block" + (marks.length ? " bs-bookmarked" : ""),
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockHTML, { html: block.html }),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              "button",
                              {
                                className: "bs-bookmark",
                                title: marks.length ? "\u79FB\u9664\u4E66\u7B7E" : "\u6DFB\u52A0\u4E66\u7B7E",
                                "aria-label": marks.length ? "\u79FB\u9664\u8BE5\u6BB5\u4E66\u7B7E" : "\u4E3A\u8BE5\u6BB5\u6DFB\u52A0\u4E66\u7B7E",
                                "aria-pressed": marks.length > 0,
                                onClick: () => void (marks.length ? Promise.all(
                                  marks.map(
                                    (m2) => call({
                                      action: "removeAnnotation",
                                      id: m2.id
                                    })
                                  )
                                ).then(refreshNotes) : annotate(
                                  "bookmark",
                                  block.id,
                                  block.text.slice(0, 180)
                                )).catch(fail),
                                children: "\u2691"
                              }
                            )
                          ]
                        },
                        block.id
                      );
                    }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-chapter-nav", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          disabled: chapterId === book.chapters[0].id,
                          onClick: () => setChapterId(
                            book.chapters[book.chapters.findIndex((c) => c.id === chapterId) - 1].id
                          ),
                          children: "\u2190 \u4E0A\u4E00\u7AE0"
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          disabled: chapterId === book.chapters.at(-1).id,
                          onClick: () => setChapterId(
                            book.chapters[book.chapters.findIndex((c) => c.id === chapterId) + 1].id
                          ),
                          children: "\u4E0B\u4E00\u7AE0 \u2192"
                        }
                      )
                    ] })
                  ] })
                ]
              }
            ),
            selection && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-selection-bar", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: selection.quote }),
              isTerm(selection.quote) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => open("word"), children: "\u67E5\u8BCD" }),
              translatable(selection.quote) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => open("translate"), children: "\u7FFB\u8BD1" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => void annotate(
                    "highlight",
                    selection.block,
                    selection.quote
                  ).catch(fail),
                  children: "\u9AD8\u4EAE"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setNoteDialog(true), children: "\u8BB0\u7B14\u8BB0" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => void collectQuote(selection).then(() => {
                    window.getSelection()?.removeAllRanges();
                    setSelection(null);
                  }).catch(fail),
                  children: "\u6536\u85CF"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => {
                    onAsk(selection.quote);
                    setSelection(null);
                  },
                  children: "\u95EE\u52A9\u624B"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  "aria-label": "\u5173\u95ED\u9009\u6BB5\u64CD\u4F5C",
                  onClick: () => setSelection(null),
                  children: "\xD7"
                }
              )
            ] }),
            active && !selection && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-selection-bar bs-highlight-bar", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: active.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u7B14\u8BB0" }),
                active.note
              ] }) : active.quote }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => {
                    setEditing(active);
                    setNote(active.note);
                  },
                  children: active.note ? "\u7F16\u8F91\u7B14\u8BB0" : "\u5199\u7B14\u8BB0"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => void collectQuote(
                    { ...active, context: blockContext(active.block) },
                    active.note
                  ).then(() => setActive(null)).catch(fail),
                  children: "\u6536\u85CF\u590D\u4E60"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => void call({ action: "removeAnnotation", id: active.id }).then(() => {
                    setActive(null);
                    return refreshNotes();
                  }).catch(fail),
                  children: "\u5220\u9664\u9AD8\u4EAE"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { "aria-label": "\u5173\u95ED\u9AD8\u4EAE\u64CD\u4F5C", onClick: () => setActive(null), children: "\xD7" })
            ] }),
            lookup && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              LookupCard,
              {
                ctx,
                call,
                lookup,
                close: closeLookup,
                fail,
                explain: features.contextExplain,
                save: (text2) => annotate("highlight", lookup.block, lookup.text, text2),
                collect: (...args) => collect(lookup.block, ...args)
              },
              lookup.id
            )
          ] })
        ]
      }
    ),
    selection && noteDialog && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      Modal,
      {
        title: "\u8BB0\u5F55\u8FD9\u6BB5\u9605\u8BFB",
        close: () => {
          setSelection(null);
          setNoteDialog(false);
          setNote("");
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", { children: selection.quote }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "textarea",
            {
              autoFocus: true,
              "aria-label": "\u9605\u8BFB\u7B14\u8BB0",
              placeholder: "\u5199\u4E0B\u4F60\u7684\u60F3\u6CD5\uFF08\u53EF\u9009\uFF09",
              value: note,
              onChange: (e) => setNote(e.target.value)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setSelection(null), children: "\u53D6\u6D88" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                className: "bs-primary",
                onClick: () => void annotate(
                  "highlight",
                  selection.block,
                  selection.quote
                ).catch(fail),
                children: "\u4FDD\u5B58\u9AD8\u4EAE\u4E0E\u7B14\u8BB0"
              }
            )
          ] })
        ]
      }
    ),
    editing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      Modal,
      {
        title: "\u7F16\u8F91\u7B14\u8BB0",
        close: () => {
          setEditing(null);
          setNote("");
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", { children: editing.quote }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "textarea",
            {
              "aria-label": "\u7B14\u8BB0\u5185\u5BB9",
              value: note,
              onChange: (e) => setNote(e.target.value)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              className: "bs-primary",
              onClick: () => void call({ action: "editNote", id: editing.id, note }).then(() => {
                setEditing(null);
                setActive(null);
                setNote("");
                return refreshNotes();
              }).catch(fail),
              children: "\u4FDD\u5B58\u7B14\u8BB0"
            }
          ) })
        ]
      }
    )
  ] });
}
function wait(ms) {
  const minutes = Math.max(1, Math.round(ms / 6e4));
  if (minutes < 60) return `${minutes} \u5206\u949F`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} \u5C0F\u65F6`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} \u5929`;
  if (days < 365) return `${Math.round(days / 30)} \u4E2A\u6708`;
  return `${Math.round(days / 365)} \u5E74`;
}
var sourceURL = (s) => `bookshelf://${s.bookId}/${s.chapter}/${s.block}?revision=${s.revision}`;
function Marked({ text: text2, term }) {
  const at = term ? text2.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) : -1;
  if (at < 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: text2 });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    text2.slice(0, at),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mark", { children: text2.slice(at, at + term.length) }),
    text2.slice(at + term.length)
  ] });
}
var grades = ["\u5FD8\u4E86", "\u6A21\u7CCA", "\u8BB0\u5F97", "\u7B80\u5355"];
function Review({
  call,
  fail,
  notify,
  open,
  onBack
}) {
  const [tab, setTab] = (0, import_react.useState)("review"), [queue, setQueue] = (0, import_react.useState)(null), [all, setAll] = (0, import_react.useState)(null), [stats, setStats] = (0, import_react.useState)(null), [revealed, setRevealed] = (0, import_react.useState)(false), [busy, setBusy] = (0, import_react.useState)(false), [error, setError] = (0, import_react.useState)("");
  const failed = (e) => setError(e instanceof Error ? e.message : String(e));
  const load = (0, import_react.useCallback)(() => {
    setError("");
    return call({ action: "cards", due: true }).then((r) => {
      setQueue(r.cards);
      setStats(r);
    }).catch(failed);
  }, [call]);
  const loadAll = (0, import_react.useCallback)(() => {
    setError("");
    return call({ action: "cards" }).then((r) => {
      setAll(r.cards);
      setStats(r);
    }).catch(failed);
  }, [call]);
  const pending = (text2) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-empty", children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      "\u5361\u7247\u6CA1\u6709\u52A0\u8F7D\u51FA\u6765\uFF1A",
      error
    ] }),
    error.includes("\u672A\u77E5\u7684\u4E66\u67B6\u64CD\u4F5C") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u4E66\u67B6\u63D2\u4EF6\u7684\u540E\u53F0\u8FD8\u662F\u66F4\u65B0\u524D\u7684\u7248\u672C\uFF0C\u91CD\u542F DSH \u540E\u518D\u8BD5\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => void (tab === "review" ? load() : loadAll()), children: "\u91CD\u8BD5" })
  ] }) : text2 });
  (0, import_react.useEffect)(() => {
    void (tab === "review" ? load() : loadAll());
  }, [tab, load, loadAll]);
  const card = queue?.[0];
  async function grade(rating) {
    if (!card || busy) return;
    setBusy(true);
    try {
      await call({ action: "grade", id: card.id, rating });
      setRevealed(false);
      await load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  function importNotes() {
    void call({ action: "importNotes" }).then(({ imported }) => {
      notify(
        imported ? `\u5DF2\u4ECE\u7B14\u8BB0\u5BFC\u5165 ${imported} \u5F20\u5361\u7247` : "\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u65B0\u7B14\u8BB0"
      );
      return tab === "review" ? load() : loadAll();
    }).catch(fail);
  }
  (0, import_react.useEffect)(() => {
    if (tab !== "review" || !card) return;
    const onKey = (e) => {
      const target = e.target;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key))
        void grade(Number(e.key));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const now = Date.now();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { className: "bs-library bs-review", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-library-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-eyebrow", children: "\u6536\u85CF\u590D\u4E60 \xB7 \u6309\u9057\u5FD8\u89C4\u5F8B\u5B89\u6392" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "\u590D\u4E60" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u67E5\u8BCD\u6216\u9009\u6BB5\u65F6\u70B9\u300C\u6536\u85CF\u300D\uFF0C\u5355\u8BCD\u548C\u53E5\u5B50\u4F1A\u6309 FSRS \u7B97\u6CD5\u5B89\u6392\u590D\u4E60\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onBack, children: "\u2190 \u4E66\u67B6" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-filter-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-tabs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            "aria-pressed": tab === "review",
            onClick: () => setTab("review"),
            children: [
              "\u4ECA\u65E5\u590D\u4E60",
              stats ? ` ${stats.due}` : ""
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            "aria-pressed": tab === "cards",
            onClick: () => setTab("cards"),
            children: [
              "\u5168\u90E8\u5361\u7247",
              stats ? ` ${stats.total}` : ""
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: importNotes, children: "\u4ECE\u7B14\u8BB0\u5BFC\u5165" })
    ] }),
    tab === "review" ? !queue ? pending("\u6B63\u5728\u6574\u7406\u5361\u7247\u2026") : card ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "bs-review-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { className: "bs-muted", children: [
        card.kind === "word" ? "\u5355\u8BCD" : "\u6458\u5F55",
        card.source && ` \xB7 \u300A${card.source.title}\u300B${card.source.chapterTitle}`
      ] }),
      card.kind === "word" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: card.front }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", { children: card.front }),
      card.kind === "word" && card.context && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-review-context", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marked, { text: card.context, term: card.term || card.front }) }),
      revealed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-review-answer", children: [
        card.back ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: card.back }) : card.kind === "passage" && card.context !== card.front ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marked, { text: card.context, term: card.front }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u6CA1\u6709\u8BB0\u5F55\u91CA\u4E49\uFF0C\u56DE\u5230\u539F\u6587\u770B\u770B\u4E0A\u4E0B\u6587\u3002" }),
        card.source && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => open(sourceURL(card.source)), children: "\u56DE\u5230\u539F\u6587 \u2197" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", { children: revealed ? grades.map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          disabled: busy,
          onClick: () => void grade(i + 1),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: label }),
            card.preview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: wait(card.preview[i] - now) })
          ]
        },
        label
      )) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: "bs-primary",
          onClick: () => setRevealed(true),
          children: "\u663E\u793A\u7B54\u6848"
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "bs-muted bs-review-hint", children: [
        "\u8FD8\u5269 ",
        queue.length,
        " \u5F20 \xB7",
        " ",
        revealed ? "\u6309 1\u20134 \u8BC4\u5206" : "\u7A7A\u683C\u663E\u793A\u7B54\u6848"
      ] })
    ] }, card.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glyph, { size: 48 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: stats?.total ? "\u4ECA\u5929\u7684\u590D\u4E60\u5B8C\u6210\u4E86" : "\u8FD8\u6CA1\u6709\u6536\u85CF" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: stats?.total ? stats.next ? `\u4E0B\u4E00\u5F20\u5361\u7247 ${wait(stats.next - now)}\u540E\u5230\u671F\u3002` : "\u6240\u6709\u5361\u7247\u90FD\u5DF2\u5B89\u6392\u597D\u3002" : "\u67E5\u8BCD\u65F6\u70B9\u300C\u6536\u85CF\u590D\u4E60\u300D\uFF0C\u6216\u5728\u9009\u6BB5\u680F\u70B9\u300C\u6536\u85CF\u300D\uFF0C\u5355\u8BCD\u548C\u53E5\u5B50\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002" }),
      !stats?.total && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: importNotes, children: "\u4ECE\u5DF2\u6709\u7B14\u8BB0\u5BFC\u5165" })
    ] }) : !all ? pending("\u6B63\u5728\u8BFB\u53D6\u5361\u7247\u2026") : all.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-review-list", children: all.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: c.front }),
        c.back && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: c.back.split("\n").slice(0, 2).join("\uFF1B") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
          c.source && `\u300A${c.source.title}\u300B${c.source.chapterTitle} \xB7 `,
          c.due <= now ? "\u5F85\u590D\u4E60" : `${wait(c.due - now)}\u540E\u590D\u4E60`,
          " \xB7 \u5DF2\u590D\u4E60 ",
          c.memory.reps,
          " \u6B21"
        ] })
      ] }),
      c.source && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => open(sourceURL(c.source)), children: "\u539F\u6587" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => void call({ action: "uncollect", id: c.id }).then(loadAll).catch(fail),
          children: "\u79FB\u9664"
        }
      )
    ] }, c.id)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-empty", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u8FD8\u6CA1\u6709\u5361\u7247\u3002" }) })
  ] });
}
function Shelf({ ctx, call }) {
  const [books, setBooks] = (0, import_react.useState)([]), [roots, setRoots] = (0, import_react.useState)([]), [job, setJob] = (0, import_react.useState)(null), [loading, setLoading] = (0, import_react.useState)(true), [notice, setNotice] = (0, import_react.useState)(""), [query, setQuery] = (0, import_react.useState)(""), [filter, setFilter] = (0, import_react.useState)("all"), [sort, setSort] = (0, import_react.useState)("added"), [hits, setHits] = (0, import_react.useState)(null), [searching, setSearching] = (0, import_react.useState)(false), [limit, setLimit] = (0, import_react.useState)(60), [selected, setSelected] = (0, import_react.useState)(null), [target, setTarget] = (0, import_react.useState)({}), [edit, setEdit] = (0, import_react.useState)(null), [showImport, setShowImport] = (0, import_react.useState)(false), [importPath, setImportPath] = (0, import_react.useState)(""), [showWeb, setShowWeb] = (0, import_react.useState)(false), [webURL, setWebURL] = (0, import_react.useState)(""), [uploading, setUploading] = (0, import_react.useState)(""), [assistant, setAssistant] = (0, import_react.useState)(true), [removing, setRemoving] = (0, import_react.useState)(null), [ask, setAsk] = (0, import_react.useState)(""), [reviewing, setReviewing] = (0, import_react.useState)(false), [reviewStats, setReviewStats] = (0, import_react.useState)(null);
  const fileInput = (0, import_react.useRef)(null), sequence = (0, import_react.useRef)(0), panel = (0, import_react.useRef)(null);
  const fail = (0, import_react.useCallback)(
    (e) => setNotice(e instanceof Error ? e.message : String(e)),
    []
  );
  const notify = (0, import_react.useCallback)((message) => {
    setNotice(message);
    setTimeout(() => setNotice((n) => n === message ? "" : n), 2500);
  }, []);
  const refresh = (0, import_react.useCallback)(async () => {
    try {
      const data = await call({ action: "list" });
      setBooks(data.books);
      setRoots(data.roots);
      setJob(data.job);
      setReviewStats(await call({ action: "reviewStats" }));
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [call]);
  (0, import_react.useEffect)(() => {
    void refresh();
  }, [refresh]);
  (0, import_react.useEffect)(() => {
    if (!job?.running) return;
    const timer = setTimeout(() => void refresh(), 600);
    return () => clearTimeout(timer);
  }, [job, refresh]);
  (0, import_react.useEffect)(() => {
    setHits(null);
    setLimit(60);
    sequence.current++;
  }, [query, filter]);
  const shown = (0, import_react.useMemo)(() => {
    const q2 = query.toLocaleLowerCase().trim();
    return books.filter(
      (b2) => (filter === "all" || b2.status === filter) && (!q2 || `${b2.title} ${b2.author} ${b2.tags.join(" ")}`.toLocaleLowerCase().includes(q2))
    ).sort(
      (a, b2) => sort === "title" ? a.title.localeCompare(b2.title, "zh-CN") : sort === "read" ? b2.lastReadAt - a.lastReadAt : b2.addedAt - a.addedAt
    );
  }, [books, query, filter, sort]);
  async function importWeb(url) {
    const link = new URL(url);
    link.hash = "";
    const existed = books.some((b2) => b2.source === link.href && !b2.removed);
    await call({ action: "import", paths: [url] });
    setShowWeb(false);
    setWebURL("");
    notify("\u6B63\u5728\u4E0B\u8F7D\u7F51\u9875\u2026");
    let current = await call({ action: "job" });
    while (current.running) {
      await new Promise((r) => setTimeout(r, 500));
      current = await call({ action: "job" });
    }
    await refresh();
    if (current.errors.length) fail(current.errors[0]);
    else
      notify(
        !current.imported ? "\u8FD9\u4E2A\u7F51\u9875\u5DF2\u5728\u4E66\u67B6\u4E2D\uFF0C\u5185\u5BB9\u6CA1\u6709\u53D8\u5316" : existed ? "\u7F51\u9875\u5DF2\u66F4\u65B0\u4E3A\u6700\u65B0\u5185\u5BB9" : "\u7F51\u9875\u5DF2\u52A0\u5165\u4E66\u67B6"
      );
  }
  async function contentSearch() {
    const generation = ++sequence.current;
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await call({ action: "search", query });
      if (generation === sequence.current) setHits(result);
    } catch (e) {
      fail(e);
    } finally {
      if (generation === sequence.current) setSearching(false);
    }
  }
  function open(book, chapter, block, revision) {
    setSelected(book);
    setTarget({ chapter, block, revision });
  }
  const openURL = (0, import_react.useCallback)(
    (raw) => {
      try {
        const u3 = new URL(raw);
        const book = books.find((b2) => b2.id === u3.hostname);
        if (!book) throw new Error("\u5F15\u7528\u7684\u4E66\u7C4D\u5DF2\u79FB\u51FA\u4E66\u67B6");
        const [chapter, block] = u3.pathname.slice(1).split("/");
        open(book, chapter, block, u3.searchParams.get("revision") || void 0);
      } catch (e) {
        fail(e);
      }
    },
    [books]
  );
  const cite = (0, import_react.useCallback)(
    (raw) => {
      try {
        const u3 = new URL(raw);
        const book = books.find((b2) => b2.id === u3.hostname);
        if (!book) return ["\u5DF2\u79FB\u51FA\u4E66\u67B6\u7684\u4E66", "\u5F15\u7528\u7684\u4E66\u7C4D\u5DF2\u79FB\u51FA\u4E66\u67B6"];
        const chapter = u3.pathname.slice(1).split("/")[0];
        const title = book.chapters.find((c) => c.id === chapter)?.title || chapter;
        return [
          selected?.id === book.id ? title : `\u300A${book.title}\u300B${title}`,
          `\u300A${book.title}\u300B${title} \xB7 \u70B9\u51FB\u56DE\u5230\u539F\u6587`
        ];
      } catch {
        return ["\u539F\u6587", raw];
      }
    },
    [books, selected]
  );
  async function upload(files) {
    try {
      for (const file of Array.from(files)) {
        setUploading(`\u6B63\u5728\u5BFC\u5165 ${file.name}`);
        const { id } = await call({
          action: "uploadStart",
          filename: file.name,
          size: file.size
        });
        for (let offset = 0; offset < file.size; offset += 512 * 1024) {
          const chunk = new Uint8Array(
            await file.slice(offset, offset + 512 * 1024).arrayBuffer()
          );
          let binary = "";
          for (let i = 0; i < chunk.length; i += 8192)
            binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
          await call({ action: "uploadChunk", id, data: btoa(binary) });
          setUploading(
            `${file.name} \xB7 ${Math.round(Math.min(file.size, offset + chunk.length) / file.size * 100)}%`
          );
        }
        await call({ action: "uploadFinish", id });
      }
      setNotice("\u4E66\u7C4D\u5DF2\u5BFC\u5165\u4E66\u67B6");
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setUploading("");
    }
  }
  function resize(event) {
    const container = panel.current;
    const start = event.clientX;
    const width = container.querySelector(".bs-assistant").getBoundingClientRect().width;
    drag(
      event,
      (e) => container.style.setProperty(
        "--assistant-width",
        `${Math.max(300, Math.min(container.clientWidth * 0.65, width + start - e.clientX))}px`
      )
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "bs-app",
      ref: panel,
      onDragOver: (e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      },
      onDrop: (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: style_default }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "bs-top", "data-window-drag": true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glyph, { size: 17 }),
            " \u4E66\u67B6"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              "aria-pressed": assistant,
              onClick: () => setAssistant((v2) => !v2),
              children: "\u2637 \u4E66\u67B6\u52A9\u624B"
            }
          )
        ] }),
        notice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-notice", role: "status", children: [
          notice,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { "aria-label": "\u5173\u95ED\u63D0\u793A", onClick: () => setNotice(""), children: "\xD7" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "bs-workspace" + (assistant ? "" : " bs-assistant-hidden"),
            children: [
              selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                Reader,
                {
                  ctx,
                  book: selected,
                  call,
                  target,
                  fail,
                  onAsk: (quote) => {
                    setAssistant(true);
                    setAsk(`\u8BF7\u89E3\u91CA\u8FD9\u6BB5\u539F\u6587\uFF0C\u5E76\u7ED3\u5408\u4E0A\u4E0B\u6587\u8BF4\u660E\uFF1A
${quote}`);
                  },
                  onBack: () => setSelected(null),
                  onUpdate: () => void refresh(),
                  notify
                },
                selected.id
              ) : reviewing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                Review,
                {
                  call,
                  fail,
                  notify,
                  open: openURL,
                  onBack: () => {
                    setReviewing(false);
                    void refresh();
                  }
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { className: "bs-library", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-library-heading", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-eyebrow", children: "\u79C1\u4EBA\u85CF\u4E66 \xB7 \u4ECE\u8FD9\u91CC\u5F00\u59CB" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
                      "\u6211\u7684\u4E66\u67B6 ",
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: books.length })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u8BA9\u6BCF\u4E00\u6B21\u7FFB\u9605\uFF0C\u90FD\u6709\u6240\u6536\u83B7\u3002" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-actions", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setReviewing(true), children: [
                      "\u590D\u4E60",
                      reviewStats?.due ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bs-badge", children: reviewStats.due }) : null
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        disabled: job?.running || !!uploading,
                        onClick: () => {
                          if (roots.length)
                            void call({ action: "scan" }).then(refresh).catch(fail);
                          else setShowImport(true);
                        },
                        children: "\u21BB \u626B\u63CF\u4E66\u5E93"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        className: "bs-primary",
                        disabled: !!uploading || job?.running,
                        onClick: () => fileInput.current?.click(),
                        children: "\uFF0B \u5BFC\u5165\u4E66\u7C4D"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-filter-row", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-tabs", children: [
                    ["all", "\u5168\u90E8\u4E66\u7C4D"],
                    ["reading", "\u5728\u8BFB"],
                    ["unread", "\u672A\u8BFB"],
                    ["finished", "\u8BFB\u5B8C"]
                  ].map(([id, name]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      "aria-pressed": filter === id,
                      onClick: () => setFilter(id),
                      children: name
                    },
                    id
                  )) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                    "select",
                    {
                      "aria-label": "\u4E66\u67B6\u6392\u5E8F",
                      value: sort,
                      onChange: (e) => setSort(e.target.value),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "added", children: "\u6700\u8FD1\u6DFB\u52A0" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "read", children: "\u6700\u8FD1\u9605\u8BFB" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "title", children: "\u4E66\u540D\u6392\u5E8F" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-search-row", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "bs-search", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u2315" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "input",
                      {
                        "aria-label": "\u641C\u7D22\u4E66\u7C4D",
                        placeholder: "\u641C\u7D22\u4E66\u540D\u3001\u4F5C\u8005\u3001\u6807\u7B7E\u2026",
                        value: query,
                        onChange: (e) => setQuery(e.target.value),
                        onKeyDown: (e) => {
                          if (e.key === "Enter") void contentSearch();
                        }
                      }
                    ),
                    query && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { "aria-label": "\u6E05\u7A7A\u641C\u7D22", onClick: () => setQuery(""), children: "\xD7" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      disabled: !query.trim() || searching,
                      onClick: () => void contentSearch(),
                      children: searching ? "\u68C0\u7D22\u4E2D\u2026" : "\u641C\u7D22\u6B63\u6587"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { title: "\u7BA1\u7406\u626B\u63CF\u76EE\u5F55", onClick: () => setShowImport(true), children: "\u76EE\u5F55" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { title: "\u5BFC\u5165\u7F51\u9875\u94FE\u63A5", onClick: () => setShowWeb(true), children: "\u7F51\u9875" })
                ] }),
                (uploading || job?.running) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-import-progress", role: "status", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: uploading || `\u626B\u63CF ${job.done}/${job.total} \xB7 ${job.current}` }),
                  job?.total > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("progress", { max: job.total, value: job.done })
                ] }),
                job && !job.running && (job.imported > 0 || job.errors.length > 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "bs-import-result", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
                    "\u6700\u8FD1\u626B\u63CF\uFF1A\u65B0\u589E ",
                    job.imported,
                    " \u672C \xB7 \u8DF3\u8FC7 ",
                    job.skipped,
                    " \u672C \xB7",
                    " ",
                    job.errors.length,
                    " \u9879\u63D0\u793A"
                  ] }),
                  job.errors.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: e }, i))
                ] }),
                loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-empty", children: "\u6B63\u5728\u6253\u5F00\u4E66\u5E93\u2026" }) : hits ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-results", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "bs-muted", children: [
                    "\u6B63\u6587\u5339\u914D ",
                    hits.length,
                    " \u5904",
                    hits.length === 40 ? " \xB7 \u5DF2\u663E\u793A\u524D 40 \u5904" : ""
                  ] }),
                  hits.map((hit, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => openURL(hit.url), children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
                      hit.title,
                      " / ",
                      hit.chapterTitle
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: hit.text }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u56DE\u5230\u539F\u6587 \u2197" })
                  ] }, i)),
                  !hits.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-empty", children: "\u8BD5\u8BD5\u66F4\u77ED\u7684\u5173\u952E\u8BCD\uFF0C\u6216\u7528\u7A7A\u683C\u7EC4\u5408\u76F8\u5173\u8BCD\u3002" })
                ] }) : shown.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-grid", children: shown.slice(0, limit).map((book) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "bs-card", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                      "button",
                      {
                        className: "bs-card-open",
                        onClick: () => open(book),
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cover, { book, call }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: book.title }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: book.author || "\u4F5C\u8005\u5F85\u8865\u5145" })
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-card-meta", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: book.format }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: statusNames[book.status] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          "aria-label": `\u7F16\u8F91\u300A${book.title}\u300B`,
                          onClick: () => setEdit(book),
                          children: "\xB7\xB7\xB7"
                        }
                      )
                    ] }),
                    book.progress.ratio > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "progress",
                      {
                        "aria-label": "\u9605\u8BFB\u8FDB\u5EA6",
                        value: book.status === "finished" ? 1 : book.progress.ratio,
                        max: 1
                      }
                    )
                  ] }, book.id)) }),
                  shown.length > limit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                    "button",
                    {
                      className: "bs-load-more",
                      onClick: () => setLimit((v2) => v2 + 60),
                      children: [
                        "\u7EE7\u7EED\u663E\u793A \xB7 \u5269\u4F59 ",
                        shown.length - limit,
                        " \u672C"
                      ]
                    }
                  )
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-empty", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glyph, { size: 48 }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: query ? "\u6362\u4E2A\u8BCD\uFF0C\u7EE7\u7EED\u5BFB\u627E" : "\u4E3A\u81EA\u5DF1\u7559\u4E00\u5EA7\u4E66\u67B6" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: query ? "\u4E66\u67B6\u4F1A\u6309\u4E66\u540D\u3001\u4F5C\u8005\u548C\u6807\u7B7E\u7B5B\u9009\u3002" : "\u5C06 EPUB\u3001Markdown\u3001TXT \u6216 HTML \u62D6\u5230\u8FD9\u91CC\uFF0C\u6216\u5BFC\u5165\u7F51\u9875\u94FE\u63A5\uFF0C\u5F00\u59CB\u9605\u8BFB\u3002" }),
                  !query && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        className: "bs-primary",
                        onClick: () => fileInput.current?.click(),
                        children: "\u5BFC\u5165\u7B2C\u4E00\u672C\u4E66"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setShowImport(true), children: "\u4ECE\u672C\u5730\u76EE\u5F55\u626B\u63CF" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setShowWeb(true), children: "\u5BFC\u5165\u7F51\u9875" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u672C\u5730\u4FDD\u5B58 \xB7 \u81EA\u52A8\u8BB0\u4F4F\u9605\u8BFB\u4F4D\u7F6E" })
                  ] })
                ] })
              ] }),
              assistant && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "div",
                  {
                    className: "bs-resizer",
                    role: "separator",
                    "aria-label": "\u62D6\u52A8\u8C03\u6574\u52A9\u624B\u5BBD\u5EA6",
                    "aria-orientation": "vertical",
                    onPointerDown: resize
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  Assistant,
                  {
                    ctx,
                    call,
                    book: selected,
                    prompt: ask,
                    open: openURL,
                    cite,
                    fail
                  },
                  selected?.id || "library"
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: "bs-file-input",
            ref: fileInput,
            type: "file",
            multiple: true,
            accept: ".epub,.md,.markdown,.txt,.html,.htm",
            onChange: (e) => {
              if (e.target.files) void upload(e.target.files);
              e.target.value = "";
            }
          }
        ),
        edit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          EditBook,
          {
            book: edit,
            call,
            close: () => setEdit(null),
            changed: () => void refresh(),
            remove: () => {
              setRemoving(edit);
              setEdit(null);
            }
          }
        ),
        removing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: "\u79FB\u51FA\u4E66\u67B6", close: () => setRemoving(null), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
            "\u5C06\u300A",
            removing.title,
            "\u300B\u79FB\u51FA\u4E66\u67B6\u3002\u539F\u59CB\u6587\u4EF6\u548C\u9605\u8BFB\u7B14\u8BB0\u4F1A\u4FDD\u7559\uFF0C\u91CD\u65B0\u5BFC\u5165\u540E\u53EF\u7EE7\u7EED\u9605\u8BFB\u3002"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setRemoving(null), children: "\u53D6\u6D88" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                onClick: () => void call({ action: "remove", bookId: removing.id }).then(() => {
                  setRemoving(null);
                  return refresh();
                }).catch(fail),
                children: "\u79FB\u51FA\u4E66\u67B6"
              }
            )
          ] })
        ] }),
        showWeb && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: "\u5BFC\u5165\u7F51\u9875", close: () => setShowWeb(false), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u4E66\u67B6\u4F1A\u4E0B\u8F7D\u7F51\u9875\u6B63\u6587\uFF0C\u4FDD\u5B58\u4E3A\u4E00\u672C\u4E66\u3002\u540C\u4E00\u94FE\u63A5\u518D\u6B21\u5BFC\u5165\u65F6\u66F4\u65B0\u4E3A\u6700\u65B0\u5185\u5BB9\uFF1B\u7F51\u9875\u4E2D\u7684\u56FE\u7247\u4E0D\u4F1A\u4FDD\u5B58\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "form",
            {
              onSubmit: (e) => {
                e.preventDefault();
                void importWeb(webURL.trim()).catch(fail);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
                  "\u7F51\u9875\u94FE\u63A5",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "input",
                    {
                      autoFocus: true,
                      type: "url",
                      placeholder: "https://",
                      value: webURL,
                      onChange: (e) => setWebURL(e.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setShowWeb(false), children: "\u53D6\u6D88" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      className: "bs-primary",
                      disabled: !/^https?:\/\/\S+$/i.test(webURL.trim()) || job?.running,
                      children: "\u5BFC\u5165"
                    }
                  )
                ] })
              ]
            }
          )
        ] }),
        showImport && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: "\u626B\u63CF\u672C\u5730\u4E66\u5E93", close: () => setShowImport(false), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "bs-muted", children: "\u6DFB\u52A0\u5B58\u653E\u4E66\u7C4D\u7684\u76EE\u5F55\u3002\u540E\u7EED\u626B\u63CF\u4F1A\u66F4\u65B0\u4E66\u7C4D\uFF0C\u5E76\u8DF3\u8FC7\u91CD\u590D\u5185\u5BB9\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "form",
            {
              onSubmit: (e) => {
                e.preventDefault();
                void call({ action: "import", paths: [importPath.trim()] }).then(() => {
                  setShowImport(false);
                  setImportPath("");
                  return refresh();
                }).catch(fail);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
                  "\u672C\u5730\u76EE\u5F55\u6216\u6587\u4EF6\u7684\u7EDD\u5BF9\u8DEF\u5F84",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "input",
                    {
                      autoFocus: true,
                      placeholder: "/Users/\u4F60\u7684\u540D\u5B57/Books",
                      value: importPath,
                      onChange: (e) => setImportPath(e.target.value)
                    }
                  )
                ] }),
                roots.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bs-roots", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u5DF2\u6DFB\u52A0\u7684\u626B\u63CF\u76EE\u5F55" }),
                  roots.map((root) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
                    root,
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => void call({ action: "removeRoot", path: root }).then(refresh).catch(fail),
                        children: "\u79FB\u9664\u76EE\u5F55"
                      }
                    )
                  ] }, root))
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setShowImport(false), children: "\u53D6\u6D88" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      className: "bs-primary",
                      disabled: !importPath.trim() || job?.running,
                      children: "\u5F00\u59CB\u626B\u63CF"
                    }
                  )
                ] })
              ]
            }
          )
        ] })
      ]
    }
  );
}
var inject = [
  "slots",
  "locale",
  "layout",
  "remote",
  "remote.session",
  "sessions",
  "uiWorkspace"
];
async function apply3(ctx) {
  const dispose = await ctx.remote.$mount(remoteInfo);
  ctx.effect(() => dispose);
  ctx.inject(["remote.bookshelf"], (ctx2) => {
    const call = async (input) => {
      const result = await ctx2.remote.bookshelf.call(input);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    };
    ctx2.effect(
      () => ctx2.locale.register("bookshelf", {
        zh: { panel: "\u4E66\u67B6" },
        en: { panel: "Bookshelf" }
      })
    );
    const t = ctx2.locale.bind("bookshelf");
    ctx2.slots.inject(
      "main",
      () => ctx2.slots.register(
        {
          name: "main",
          key: "bookshelf",
          locale: "bookshelf",
          inject: () => ({ ctx: ctx2, call })
        },
        Shelf
      )
    );
    ctx2.slots.inject(
      "sidebar.panellist",
      () => ctx2.slots.register(
        {
          name: "sidebar.panellist",
          id: "bookshelf",
          order: 6,
          label: () => t("panel"),
          locale: "bookshelf"
        },
        Glyph
      )
    );
  });
}
/*! Bundled license information:

dompurify/dist/purify.es.mjs:
  (*! @license DOMPurify 3.4.17 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.17/LICENSE *)
  (*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE *)
*/
return module.exports; }});
//# sourceMappingURL=client.js.map
