import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { parseDocument } from "htmlparser2";
import { textContent, getElementsByTagName } from "domutils";
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
  function visit(nodes: any[]) {
    for (const node of nodes) {
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
        continue;
      }
      const htmlNode = sanitizeHTMLNode(node);
      const text = textContent(node).replace(/\s+/g, " ").trim();
      if (text || node.name === "img")
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
  return { id: chapterId, title, blocks };
}
export function parseBook(bytes: Uint8Array, filename: string): ParsedBook {
  const ext = path.extname(filename).toLowerCase();
  const fallback = path.basename(filename, ext);
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
