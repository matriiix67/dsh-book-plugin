import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { parseDocument } from "htmlparser2";
import {
  textContent,
  getElementsByTagName,
  findAll,
  findOne,
  removeElement,
  getInnerHTML,
} from "domutils";
import { marked } from "marked";
import sanitize from "sanitize-html";
import path from "node:path";
import type { Chapter, ParsedBook } from "../types";
const escapeText = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,
});
const array = (v: any): any[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const val = (v: any): string =>
  typeof v === "object" ? String(v?.["#text"] ?? "") : String(v ?? "");
function chaptersFromHTML(
  html: string,
  chapterId: string,
  title: string,
  assets?: Record<string, Uint8Array>,
  base = "",
  groupInline = false,
): Chapter {
  const safe = sanitize(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "p",
      "div",
      "section",
      "blockquote",
      "pre",
      "code",
      "ul",
      "ol",
      "li",
      "em",
      "strong",
      "b",
      "i",
      "a",
      "br",
      "hr",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "sup",
      "sub",
    ],
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt"] },
    allowedSchemes: ["https", "http", "data"],
    allowedSchemesByTag: { img: ["data"] },
    transformTags: {
      img: (_tag, attrs) => {
        let src = attrs.src || "";
        if (assets && !src.startsWith("data:")) {
          const key = path.posix.normalize(
            path.posix.join(path.posix.dirname(base), decodeURIComponent(src)),
          );
          const bytes = assets[key];
          src =
            bytes && bytes.length < 2_000_000
              ? `data:image/${/\.png$/i.test(key) ? "png" : /\.webp$/i.test(key) ? "webp" : "jpeg"};base64,${Buffer.from(bytes).toString("base64")}`
              : "";
        }
        return {
          tagName: "img",
          attribs: {
            src: src.startsWith("data:image/") ? src : "",
            alt: attrs.alt || "",
          },
        };
      },
      a: (_tag, attrs) => ({
        tagName: "a",
        attribs: {
          href: /^https?:/i.test(attrs.href || "") ? attrs.href : "",
          title: attrs.title || "",
        },
      }),
    },
  });
  const doc = parseDocument(safe);
  const blocks: Chapter["blocks"] = [];
  // 网页常把段落写成文字与行内元素，用两个 <br> 分隔；把它们合成一段，而不是逐个文字节点成段。
  let run: any[] = [];
  function flush() {
    const html = run
      .map((n) =>
        n.type === "text" ? escapeText(n.data) : sanitizeHTMLNode(n),
      )
      .join("")
      .replace(/^(\s|<br>)+|(\s|<br>)+$/g, "");
    const text = run
      .map((n) => (n.name === "br" ? " " : textContent(n)))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (text)
      blocks.push({ id: `p${blocks.length}`, html: `<p>${html}</p>`, text });
    run = [];
  }
  function visit(nodes: any[]) {
    for (const node of nodes) {
      if (groupInline) {
        if (node.type === "text" || inlineTags.has(node.name)) {
          const last = run.findLast(
            (n) => !(n.type === "text" && !n.data.trim()),
          );
          if (node.name === "br" && last?.name === "br") flush();
          else run.push(node);
          continue;
        }
        flush();
      }
      if (node.type === "text") {
        if (node.data.trim())
          blocks.push({
            id: `p${blocks.length}`,
            html: escapeText(node.data),
            text: node.data.trim(),
          });
        continue;
      }
      if (!node.name) continue;
      if (["div", "section", "html", "body"].includes(node.name)) {
        visit(node.children || []);
        if (groupInline) flush();
        continue;
      }
      const htmlNode = sanitizeHTMLNode(node);
      const text = textContent(node).replace(/\s+/g, " ").trim();
      // 外链图片在清理时已去掉地址，不再留下空段落。
      if (text || (node.name === "img" && node.attribs.src))
        blocks.push({ id: `p${blocks.length}`, html: htmlNode, text });
    }
  }
  function sanitizeHTMLNode(node: any): string {
    // serialize the already sanitized tree
    const attrs = Object.entries(node.attribs || {})
      .map(
        ([k, v]) =>
          ` ${k}="${String(v).replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`,
      )
      .join("");
    if (["img", "br", "hr"].includes(node.name))
      return `<${node.name}${attrs}>`;
    return `<${node.name}${attrs}>${(node.children || []).map((n: any) => (n.type === "text" ? escapeText(n.data) : n.name ? sanitizeHTMLNode(n) : "")).join("")}</${node.name}>`;
  }
  visit(doc.children);
  if (groupInline) flush();
  return { id: chapterId, title, blocks };
}
// 每章最多 180 段，控制单次渲染的工作量。
const bounded = (chapter: Chapter, chapters: Chapter[]) => {
  for (let i = 0; i < chapter.blocks.length; i += 180)
    chapters.push({
      ...chapter,
      id: `c${chapters.length}`,
      title: i
        ? `${chapter.title} · 续 ${Math.floor(i / 180) + 1}`
        : chapter.title,
      blocks: chapter.blocks.slice(i, i + 180),
    });
};
const inlineTags = new Set([
  "a",
  "em",
  "strong",
  "b",
  "i",
  "code",
  "sup",
  "sub",
  "br",
]);
// 导航、页脚、评论区等与正文无关的元素。
const noiseTags = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "iframe",
  "svg",
  "canvas",
  "select",
  "dialog",
]);
const noiseNames =
  /(^|[\s_-])(comments?|share|social|sidebar|nav|navbox|menu|breadcrumbs?|related|recommend(ed)?|advert|ads?|banner|cookie|subscribe|newsletter|popup|modal|footer|noprint|printfooter|catlinks|editsection)([\s_-]|$)/i;
const contentNames =
  /(^|[\s_-])(article|content|main|post|entry|story|body|text)([\s_-]|$)/i;
const textLength = (node: any) => textContent(node).replace(/\s+/g, "").length;
// 网页没有署名时，以网站域名作为作者。
const siteOf = (url?: string) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};
/** 先看 HTML 开头声明的编码，没有声明时按 UTF-8 解码。 */
function decodeHTML(bytes: Uint8Array) {
  const head = Buffer.from(bytes.subarray(0, 4096)).toString("latin1");
  const charset =
    head.match(/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i)?.[1] || "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}
/** 单页 HTML：取正文所在的元素，去掉导航与页脚；篇幅较长时按 h1/h2 分章。 */
function parseHTMLPage(bytes: Uint8Array, fallback: string): ParsedBook {
  const doc = parseDocument(decodeHTML(bytes));
  const meta = (key: string) =>
    findOne(
      (e) =>
        e.name === "meta" &&
        (e.attribs.property === key || e.attribs.name === key),
      doc.children,
    )?.attribs.content?.trim() || "";
  const first = (tag: string) =>
    textContent(
      getElementsByTagName(tag, doc.children, true, 1)[0] || ({} as any),
    )
      .replace(/\s+/g, " ")
      .trim();
  // 网页标题常带「 - 网站名」，与 h1 开头一致时取 h1。
  const heading = first("h1");
  const trim = (t: string) => (heading && t.startsWith(heading) ? heading : t);
  const title =
    trim(meta("og:title")) || trim(first("title")) || heading || fallback;
  const base =
    findOne((e) => e.name === "base", doc.children)?.attribs.href ||
    findOne(
      (e) => e.name === "link" && e.attribs.rel === "canonical",
      doc.children,
    )?.attribs.href ||
    meta("og:url");
  const lang = findOne((e) => e.name === "html", doc.children)?.attribs.lang;
  const total = textLength(doc);
  // 按 class/id 判断的只去掉篇幅不大的元素，免得「has-sidebar」这类整页的状态类误删正文。
  for (const el of findAll((e) => {
    if (
      noiseTags.has(e.name) ||
      e.attribs.hidden !== undefined ||
      /display\s*:\s*none/i.test(e.attribs.style || "")
    )
      return true;
    if (["html", "body", "article", "main"].includes(e.name)) return false;
    const names = `${e.attribs.class || ""} ${e.attribs.id || ""}`;
    return (
      noiseNames.test(names) &&
      !contentNames.test(names) &&
      textLength(e) < total * 0.3
    );
  }, doc.children))
    removeElement(el);
  // 相对链接按网页地址补全，否则清理时会被丢掉。
  for (const a of findAll((e) => e.name === "a", doc.children)) {
    const href = a.attribs.href || "";
    if (base && href && !/^(https?:|#)/i.test(href))
      try {
        a.attribs.href = new URL(href, base).href;
      } catch {}
  }
  // 用表格排版整页的老式网页：单元格里是大段文字时，把表格当作普通容器。
  for (const table of findAll((e) => e.name === "table", doc.children))
    if (
      findOne(
        (e) => (e.name === "td" || e.name === "th") && textLength(e) > 500,
        table.children,
      )
    )
      for (const el of findAll(
        (e) => ["table", "thead", "tbody", "tr", "td", "th"].includes(e.name),
        [table],
      ))
        el.name = "div";
  const body = findOne((e) => e.name === "body", doc.children) || doc;
  let root: any = findAll(
    (e) =>
      e.name === "article" || e.name === "main" || e.attribs.role === "main",
    [body],
  ).sort((a, b) => textLength(b) - textLength(a))[0];
  if (!root || textLength(root) < 200) {
    // 没有 article/main 时，按段落文字给父元素记分，取得分最高的容器。
    const scores = new Map<any, number>();
    for (const p of findAll((e) => e.name === "p", [body])) {
      const n = textLength(p);
      scores.set(p.parent, (scores.get(p.parent) || 0) + n);
      if (p.parent?.parent)
        scores.set(p.parent.parent, (scores.get(p.parent.parent) || 0) + n / 2);
    }
    const [best, score] = [...scores].sort((a, b) => b[1] - a[1])[0] || [];
    root = best && score >= 200 ? best : body;
  }
  const { blocks } = chaptersFromHTML(
    getInnerHTML(root),
    "c0",
    title,
    undefined,
    "",
    true,
  );
  if (!blocks.length)
    throw new Error("网页中没有找到正文，可能需要登录，或正文由脚本加载");
  const chapters: Chapter[] = [];
  if (blocks.length <= 120) bounded({ id: "c0", title, blocks }, chapters);
  else {
    let current: Chapter | null = null;
    const sections: Chapter[] = [];
    for (const block of blocks) {
      const heading = /^<h[12][\s>]/.test(block.html);
      if (heading || !current) {
        current = {
          id: "",
          title: heading ? block.text : title,
          blocks: [],
        };
        sections.push(current);
      }
      current.blocks.push({ ...block, id: `p${current.blocks.length}` });
    }
    for (const section of sections) bounded(section, chapters);
  }
  return {
    title,
    author:
      meta("author") ||
      (/^https?:/.test(meta("article:author")) ? "" : meta("article:author")) ||
      meta("og:site_name") ||
      siteOf(base),
    language: lang || (/\p{Script=Han}/u.test(title) ? "zh" : "en"),
    chapters,
  };
}
export function parseBook(bytes: Uint8Array, filename: string): ParsedBook {
  const ext = path.extname(filename).toLowerCase();
  const fallback = path.basename(filename, ext);
  if (ext === ".html" || ext === ".htm") return parseHTMLPage(bytes, fallback);
  if (ext !== ".epub") {
    let source = new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/, "");
    const meta: any = {};
    source = source.replace(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/, (_, header) => {
      for (const line of header.split("\n")) {
        const m = line.match(/^(title|author|language):\s*["']?(.*?)["']?\s*$/);
        if (m) meta[m[1]] = m[2];
      }
      return "";
    });
    const md = ext === ".md" || ext === ".markdown";
    const parts = source
      .split(
        md
          ? /\n(?=#{1,2} )/
          : /\n(?=第[一二三四五六七八九十百零\d]+[章节卷部])/,
      )
      .filter((s) => s.trim());
    const chapters: Chapter[] = [];
    for (const part of parts) {
      const title =
        part.match(
          md ? /^#{1,2}\s+(.+)/ : /^(第[^\n]+[章节卷部][^\n]*)/,
        )?.[1] || (chapters.length ? "正文 " + (chapters.length + 1) : "正文");
      const html = md
        ? (marked.parse(part, { async: false }) as string)
        : part
            .split(/\n\s*\n/)
            .map((p) => `<p>${escapeText(p).replaceAll("\n", "<br>")}</p>`)
            .join("");
      const c = chaptersFromHTML(html, `c${chapters.length}`, title); // cap rendering work per chapter
      for (let i = 0; i < c.blocks.length; i += 180) {
        chapters.push({
          ...c,
          id: `c${chapters.length}`,
          title: i ? `${title} · 续 ${Math.floor(i / 180) + 1}` : title,
          blocks: c.blocks.slice(i, i + 180),
        });
      }
    }
    return {
      title: meta.title || source.match(/^#\s+(.+)$/m)?.[1] || fallback,
      author: meta.author || "",
      language: meta.language || "zh",
      chapters,
    };
  }
  let inflated = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      inflated += file.originalSize;
      if (inflated > 160 * 1024 * 1024)
        throw new Error("EPUB 解压内容超过 160 MB");
      return true;
    },
  });
  if (Object.keys(files).length > 10000)
    throw new Error("EPUB 文件数量超过限制");
  const container = xml.parse(
    strFromU8(files["META-INF/container.xml"] || new Uint8Array()),
  );
  const opfPath = array(container.container?.rootfiles?.rootfile)[0]?.[
    "@full-path"
  ];
  if (!files[opfPath]) throw new Error("EPUB 缺少有效的书籍清单");
  const opf = xml.parse(strFromU8(files[opfPath])).package;
  const dir = path.posix.dirname(opfPath);
  const items = new Map<string, any>(
    array(opf.manifest?.item).map((item) => [String(item["@id"]), item]),
  );
  const resolve = (href: string) =>
    path.posix.normalize(
      path.posix.join(dir, decodeURIComponent(href.split("#")[0])),
    );
  let coverItem = array(opf.manifest?.item).find((item) =>
    String(item["@properties"] || "")
      .split(" ")
      .includes("cover-image"),
  );
  if (!coverItem) {
    const id = array(opf.metadata?.meta).find((m) => m["@name"] === "cover")?.[
      "@content"
    ];
    coverItem = items.get(id);
  }
  let cover: string | undefined;
  if (coverItem) {
    const data = files[resolve(coverItem["@href"])];
    if (
      data &&
      data.length < 3_000_000 &&
      /^image\/(jpeg|png|webp)$/.test(coverItem["@media-type"])
    )
      cover = `data:${coverItem["@media-type"]};base64,${Buffer.from(data).toString("base64")}`;
  }
  const chapters: Chapter[] = [];
  for (const ref of array(opf.spine?.itemref)) {
    const item = items.get(String(ref["@idref"]));
    if (!item || ref["@linear"] === "no") continue;
    const key = resolve(item["@href"]);
    if (!files[key]) continue;
    const html = strFromU8(files[key]);
    const doc = parseDocument(html);
    const title =
      textContent(
        getElementsByTagName("h1", doc.children, true, 1)[0] ||
          getElementsByTagName("h2", doc.children, true, 1)[0] ||
          getElementsByTagName("title", doc.children, true, 1)[0] ||
          ({ children: [] } as any),
      ).trim() || `第 ${chapters.length + 1} 节`;
    const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
    const chapter = chaptersFromHTML(
      body,
      `c${chapters.length}`,
      title,
      files,
      key,
    );
    for (let i = 0; i < chapter.blocks.length; i += 180)
      chapters.push({
        ...chapter,
        id: `c${chapters.length}`,
        title: i ? `${title} · 续 ${Math.floor(i / 180) + 1}` : title,
        blocks: chapter.blocks.slice(i, i + 180),
      });
  }
  if (!chapters.length)
    throw new Error("EPUB 正文为空，请检查加密状态和文件完整性");
  return {
    title: val(array(opf.metadata?.title)[0]) || fallback,
    author: array(opf.metadata?.creator).map(val).join("、"),
    language: val(array(opf.metadata?.language)[0]) || "zh",
    cover,
    chapters,
  };
}
