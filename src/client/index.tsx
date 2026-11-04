import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useSyncExternalStore,
  memo,
} from "react";
import { remoteInfo } from "../rpc";
import { isTerm } from "../text";
import type {
  Book,
  Chapter,
  Annotation,
  Hit,
  Request,
  DictEntry,
  DictStatus,
  AssistChunk,
  AssistRequest,
  ReviewCard,
  ReviewStats,
} from "../types";
import css from "./style.css";
import { marked } from "marked";
import DOMPurify from "dompurify";
type Call = (input: Request) => Promise<any>;
const statusNames = { unread: "未读", reading: "在读", finished: "读完" };
function Glyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v16h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3zM12 6v16" />
    </svg>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      className="bs-modal"
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <header>
        <h3>{title}</h3>
        <button onClick={close} aria-label="关闭对话框">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
const Cover = memo(function Cover({ book, call }: { book: Book; call: Call }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cover, setCover] = useState("");
  useEffect(() => {
    if (!book.cover) return;
    let live = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          void call({ action: "cover", bookId: book.id })
            .then((src) => {
              if (live) setCover(src || "");
            })
            .catch(() => {});
        }
      },
      { rootMargin: "200px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [book.id, book.revision, book.cover, call]);
  return (
    <div
      ref={ref}
      className="bs-cover"
      style={
        {
          "--book-hue": parseInt(book.id.slice(0, 4), 16) % 360,
        } as React.CSSProperties
      }
    >
      {cover ? (
        <img src={cover} alt={book.title} loading="lazy" decoding="async" />
      ) : (
        <div className="bs-cover-type">
          <small>{book.format} · 私人藏书</small>
          <strong>{book.title}</strong>
          <span>{book.author || "佚名"}</span>
          <Glyph size={28} />
        </div>
      )}
    </div>
  );
});
function EditBook({
  book,
  call,
  close,
  changed,
  remove,
}: {
  book: Book;
  call: Call;
  close: () => void;
  changed: () => void;
  remove: () => void;
}) {
  const [title, setTitle] = useState(book.title),
    [author, setAuthor] = useState(book.author),
    [tags, setTags] = useState(book.tags.join("，")),
    [status, setStatus] = useState(book.status),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="编辑书籍" close={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await call({
              action: "update",
              bookId: book.id,
              fields: { title, author, tags: tags.split(/[,，]/), status },
            });
            changed();
            close();
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          书名
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          作者
          <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
        <label>
          标签 · 逗号分隔
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <label>
          阅读状态
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Book["status"])}
          >
            {Object.entries(statusNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p className="bs-muted bs-source">来源：{book.source}</p>
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" onClick={remove}>
            移出书架
          </button>
          <button type="button" onClick={close}>
            取消
          </button>
          <button className="bs-primary" disabled={busy}>
            保存修改
          </button>
        </footer>
      </form>
    </Modal>
  );
}
type Cite = (url: string) => [label: string, detail: string];
const citation = /(bookshelf:\/\/[\w-]+\/[\w-]+\/[\w-]+(?:\?revision=[\w-]+)?)/;
// 把回答里的 bookshelf:// 原始地址换成可点击的短标签，避免长链接撑开版面。
function linkCitations(root: DocumentFragment, cite: Cite) {
  const link = (url: string) => {
    const a = document.createElement("a");
    const [label, detail] = cite(url);
    a.href = url;
    a.textContent = label;
    a.title = detail;
    return a;
  };
  root
    .querySelectorAll<HTMLAnchorElement>('a[href^="bookshelf:"]')
    .forEach((a) => {
      if (a.textContent!.includes("bookshelf://")) {
        [a.textContent, a.title] = cite(a.getAttribute("href")!);
      }
    });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (
      n.nodeValue!.includes("bookshelf://") &&
      !n.parentElement?.closest("a, pre")
    )
      texts.push(n as Text);
  for (const node of texts) {
    const parts = node.data.split(citation);
    const code = node.parentElement?.closest("code");
    if (code && parts.length === 3 && !(parts[0] + parts[2]).trim())
      code.replaceWith(link(parts[1]));
    else node.replaceWith(...parts.map((p, i) => (i % 2 ? link(p) : p)));
  }
}
function RichText({
  text,
  open,
  cite,
}: {
  text: string;
  open: (url: string) => void;
  cite?: Cite;
}) {
  const html = useMemo(() => {
    const clean = DOMPurify.sanitize(
      marked.parse(text, { async: false }) as string,
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
          "hr",
        ],
        ALLOWED_ATTR: ["href", "title"],
        ALLOWED_URI_REGEXP: /^(?:https?:|bookshelf:|#)/i,
      },
    );
    if (!cite || !clean.includes("bookshelf://")) return clean;
    const template = document.createElement("template");
    template.innerHTML = clean;
    linkCitations(template.content, cite);
    return template.innerHTML;
  }, [text, cite]);
  return (
    <div
      className="bs-message-text"
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (a?.getAttribute("href")?.startsWith("bookshelf://")) {
          e.preventDefault();
          open(a.getAttribute("href")!);
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
function Assistant({
  ctx,
  call,
  book,
  open,
  fail,
  prompt,
  cite,
}: {
  ctx: any;
  call: Call;
  book: Book | null;
  prompt: string;
  open: (url: string) => void;
  fail: (e: unknown) => void;
  cite: Cite;
}) {
  const [binding, setBinding] = useState<any>(null),
    [text, setText] = useState(
      () =>
        localStorage.getItem("bookshelf.draft.v1." + (book?.id || "library")) ||
        "",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const reference = useRef<any>(null),
    bottom = useRef<HTMLDivElement>(null);
  const scope = book?.id || "library";
  useEffect(() => {
    if (prompt) setText(prompt);
  }, [prompt]);
  useEffect(() => {
    let live = true;
    setBinding(null);
    setError("");
    void call({ action: "assistantSession", bookId: book?.id })
      .then(async (info) => {
        if (!info.sessionId || !live) return;
        const ref = ctx.sessions.retain(info.sessionId, {
          source: "bookshelf",
        });
        reference.current = ref;
        await ref.ready;
        if (live) setBinding(ref.binding);
        else ref.release();
      })
      .catch((e) => {
        if (live) setError(String(e));
      });
    return () => {
      live = false;
      reference.current?.release();
      reference.current = null;
    };
  }, [scope]);
  const subscribe = useCallback(
    (fn: () => void) => (binding ? binding.session.subscribe(fn) : () => {}),
    [binding],
  );
  const getSnapshot = useCallback(
    () => binding?.session.getSnapshot() || null,
    [binding],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const subscribeEvents = useCallback(
    (fn: () => void) => {
      if (!binding) return () => {};
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
    [binding],
  );
  const getEvents = useCallback(
    () => binding?.eventSource.getSnapshot() || null,
    [binding],
  );
  const events = useSyncExternalStore(subscribeEvents, getEvents);
  const messages = useMemo(
    () =>
      (events?.entries || [])
        .filter(
          (entry: any) =>
            ["user/message", "assistant/message", "assistant/attempt"].includes(
              entry.event.type,
            ) &&
            (entry.event.type !== "user/message" ||
              entry.event.data.source?.kind === "user"),
        )
        .map((entry: any) => {
          const event = entry.event;
          const message =
            event.type === "user/message" ? event.data : event.data.message;
          return {
            key: event.seq || entry.attemptId,
            role: event.type === "user/message" ? "user" : "assistant",
            text: (message?.content || [])
              .filter((part: any) => part.type === "text")
              .map((part: any) => part.text)
              .join("\n"),
          };
        })
        .filter((m: any) => m.text),
    [events],
  );
  const liveText = useMemo(() => {
    const entries = events?.entries || [];
    const settled = new Set(
      entries
        .filter((e: any) => e.event.type === "assistant/message")
        .map((e: any) => `${e.event.data.turn}:${e.event.data.step}`),
    );
    return entries
      .filter(
        (e: any) =>
          e.event.type === "assistant/live-chunk" &&
          e.event.data.chunk.type === "text-delta" &&
          !settled.has(`${e.event.data.turn}:${e.event.data.step}`),
      )
      .map((e: any) => e.event.data.chunk.text)
      .join("");
  }, [events]);
  useEffect(() => {
    localStorage.setItem("bookshelf.draft.v1." + scope, text);
  }, [text, scope]);
  useEffect(() => {
    const node = bottom.current?.parentElement;
    if (node && node.scrollHeight - node.scrollTop - node.clientHeight < 250)
      bottom.current?.scrollIntoView({ block: "end" });
  }, [events]);
  async function createConversation() {
    const info = await call({
      action: "assistantSession",
      bookId: book?.id,
    });
    const id = await ctx.sessions.create({ cwd: info.cwd });
    await call({
      action: "assistantSession",
      bookId: book?.id,
      sessionId: id,
    });
    const renamed = await ctx.remote.session.rename({
      sessionId: id,
      title: book ? `书架 · ${book.title}` : "书架助手",
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
    if (!text.trim() || busy || snapshot?.running) return;
    setBusy(true);
    setError("");
    try {
      let b = binding;
      if (!b) b = await createConversation();
      const context = book
        ? `当前讨论《${book.title}》，bookId=${book.id}。`
        : "请根据本地书架的现有藏书回答。";
      const content = `${context}\n使用 bookshelf 工具读取与问题相关的原文；引用时原样保留工具返回的 bookshelf:// URL 和 revision。区分原文依据与推断。\n\n用户问题：${text.trim()}`;
      const result = await b.session.prompt(
        [{ type: "text", text: content }],
        "queue",
      );
      if (!result.ok) throw new Error(result.error.message);
      setText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="bs-assistant">
      <header>
        <span>
          <Glyph size={17} /> 书架助手
        </span>
        <button
          disabled={busy || snapshot?.running}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await createConversation();
              setText("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          新对话
        </button>
        {binding && (
          <button
            title="打开完整 DSH 会话与模型设置"
            onClick={() => void ctx.uiWorkspace.openSession(binding.sessionId)}
          >
            打开会话 ↗
          </button>
        )}
      </header>
      <div className="bs-assistant-scope">
        {book ? `当前书籍 · ${book.title}` : "从你的藏书中寻找答案"}
      </div>
      <div className="bs-chat" aria-live="polite">
        {messages.length === 0 ? (
          <div className="bs-chat-empty">
            <Glyph size={32} />
            <h3>让阅读与你的生活相遇</h3>
            <p>问一个问题，找到值得重读的段落。</p>
            {[
              "帮我梳理这本书的核心观点",
              "针对当前困惑，推荐值得读的章节",
              "找出书中相关论述并附上原文",
              "用我收藏的生词出几道题",
            ].map((q) => (
              <button key={q} onClick={() => setText(q)}>
                {q} ↗
              </button>
            ))}
          </div>
        ) : (
          messages.map((m: any) => (
            <article className={"bs-message bs-message-" + m.role} key={m.key}>
              <small>{m.role === "user" ? "你" : "书架助手"}</small>
              <RichText
                text={
                  m.role === "user"
                    ? m.text.split("用户问题：").at(-1)!
                    : m.text
                }
                open={open}
                cite={cite}
              />
            </article>
          ))
        )}
        {liveText && (
          <article className="bs-message">
            <RichText text={liveText} open={open} cite={cite} />
          </article>
        )}
        {snapshot?.running && <p className="bs-muted">正在阅读与思考…</p>}
        {(error || snapshot?.promptError || snapshot?.lastAgentError) && (
          <div className="bs-error" role="alert">
            {error ||
              snapshot?.promptError?.message ||
              String(snapshot?.lastAgentError)}
            {binding && (
              <button
                onClick={() =>
                  void ctx.uiWorkspace.openSession(binding.sessionId)
                }
              >
                进入 DSH 会话处理
              </button>
            )}
          </div>
        )}
        <div ref={bottom} />
      </div>
      <form
        className="bs-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          aria-label="向书架助手提问"
          placeholder={book ? "和这本书聊一聊…" : "提一个与你有关的问题…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <footer>
          <small>沿用 DSH 模型 · Enter 发送</small>
          {snapshot?.running ? (
            <button
              type="button"
              onClick={() => void binding.session.cancel().catch(fail)}
            >
              停止
            </button>
          ) : (
            <button className="bs-primary" disabled={busy || !text.trim()}>
              {busy ? "连接中…" : "发送 ↑"}
            </button>
          )}
        </footer>
      </form>
    </aside>
  );
}
type Lookup = {
  id: number;
  mode: "word" | "translate";
  text: string;
  block: string;
  context: string;
  /** 从「收藏」打开时提示挑选义项。 */
  collect?: boolean;
};
type Selected = { block: string; quote: string; context: string };
const tagNames: Record<string, string> = {
  zk: "中考",
  gk: "高考",
  cet4: "四级",
  cet6: "六级",
  ky: "考研",
  toefl: "TOEFL",
  ielts: "IELTS",
  gre: "GRE",
};
const formNames: Record<string, string> = {
  p: "过去式",
  d: "过去分词",
  i: "现在分词",
  "3": "第三人称单数",
  r: "比较级",
  t: "最高级",
  s: "复数",
};
// 所有阅读器共用一个高亮集合，各自增删本章的选区。
const highlights = typeof Highlight === "undefined" ? null : new Highlight();
// 在段落中定位摘录，忽略空白差异；跨段选区只标出落在本段的部分。
function quoteRange(root: HTMLElement, quote: string) {
  const chars: [Text, number][] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const data = (node as Text).data;
    for (let i = 0; i < data.length; i++)
      if (!/\s/.test(data[i])) chars.push([node as Text, i]);
  }
  const text = chars.map(([node, i]) => node.data[i]).join("");
  const q = quote.replace(/\s+/g, "");
  const range = document.createRange();
  let start = q ? text.indexOf(q) : -1,
    end = start + q.length;
  // 跨段选区：摘录开头落在本段末尾，或摘录结尾落在本段开头。
  for (let k = Math.min(q.length, text.length); start < 0 && k >= 4; k--) {
    if (text.endsWith(q.slice(0, k)))
      [start, end] = [text.length - k, text.length];
    else if (text.startsWith(q.slice(-k))) [start, end] = [0, k];
  }
  if (start < 0) {
    range.selectNodeContents(root);
    return range;
  }
  range.setStart(chars[start][0], chars[start][1]);
  range.setEnd(chars[end - 1][0], chars[end - 1][1] + 1);
  return range;
}
const megabytes = (n: number) => (n / 1048576).toFixed(1) + " MB";
function useAssist(ctx: any) {
  const [state, setState] = useState({
    text: "",
    running: false,
    error: "",
    model: "",
    cached: false,
  });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const stop = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState((s) => ({ ...s, running: false }));
  }, []);
  const start = useCallback(
    async (input: AssistRequest) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setState({
        text: "",
        running: true,
        error: "",
        model: "",
        cached: false,
      });
      try {
        const stream: AsyncIterable<AssistChunk> = ctx.remote.bookshelf.stream(
          input,
          c.signal,
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
            error: (e as Error)?.message || String(e),
          }));
      } finally {
        if (controller.current === c) {
          controller.current = null;
          setState((s) => ({ ...s, running: false }));
        }
      }
    },
    [ctx],
  );
  return { ...state, start, stop };
}
function DictionarySetup({
  call,
  onReady,
}: {
  call: Call;
  onReady: () => void;
}) {
  const [status, setStatus] = useState<DictStatus | null>(null),
    [file, setFile] = useState(""),
    [error, setError] = useState("");
  const running = !!status?.job.running;
  useEffect(() => {
    void call({ action: "dictionaryStatus" })
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, [call]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () =>
        void call({ action: "dictionaryStatus" })
          .then((next: DictStatus) => {
            setStatus(next);
            if (!next.job.running && next.installed && !next.job.error)
              onReady();
          })
          .catch((e) => setError(e.message)),
      800,
    );
    return () => clearInterval(timer);
  }, [running, call, onReady]);
  const run = (input: Request) => {
    setError("");
    void call(input)
      .then(setStatus)
      .catch((e) => setError(e.message));
  };
  const job = status?.job;
  return (
    <div className="bs-dict-setup">
      <p>
        离线词典尚未安装。安装开源英汉词典 ECDICT（MIT 协议，约 77
        万词条）后，查词即时显示音标、释义与词形变化，无需联网。
      </p>
      {running ? (
        <p className="bs-muted" role="status">
          {job!.phase === "download"
            ? `正在下载 ${megabytes(job!.received)}${job!.total ? ` / ${megabytes(job!.total)}` : ""}`
            : `正在建立索引 · 已处理 ${job!.received.toLocaleString()} 条`}
        </p>
      ) : (
        <>
          <button
            className="bs-primary"
            disabled={!status}
            onClick={() => run({ action: "dictionaryInstall" })}
          >
            下载 ECDICT（约 63 MB）
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run({ action: "dictionaryImport", path: file.trim() });
            }}
          >
            <input
              aria-label="本地 ecdict.csv 的绝对路径"
              placeholder="或填写已下载的 ecdict.csv 绝对路径"
              value={file}
              onChange={(e) => setFile(e.target.value)}
            />
            <button disabled={!file.trim()}>导入</button>
          </form>
        </>
      )}
      {(error || job?.error) && (
        <p className="bs-error" role="alert">
          {error || job?.error}
        </p>
      )}
    </div>
  );
}
// 拆开一行释义：「n. 绕路；便道」→ 词性 n.，义项 绕路、便道。
function splitSenses(line: string) {
  const [, pos = "", rest] =
    /^((?:[a-z]+\.\s*(?:&\s*)?)+|\[[^\]]+\]\s*)?([\s\S]*)$/.exec(line.trim())!;
  return {
    pos: pos.trim(),
    items: rest
      .split(/[；;]/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
// 选中的义项按词性归行，例如「n. 绕路」「vi. 绕道」。
const pickedSenses = (entry: DictEntry, index: number, picked: string[]) =>
  entry.translation.flatMap((line, l) => {
    const { pos, items } = splitSenses(line);
    const chosen = items.filter((_, k) =>
      picked.includes(`${index}:${l}:${k}`),
    );
    return chosen.length ? [`${pos} ${chosen.join("；")}`.trim()] : [];
  });
// 语境释义是 Markdown，存入卡片前转为纯文本。
const plainText = (markdown: string) =>
  new DOMParser()
    .parseFromString(
      marked.parse(markdown, { async: false }) as string,
      "text/html",
    )
    .body.textContent?.trim() ?? "";
function DictEntryView({
  entry,
  index,
  picked,
  pick,
}: {
  entry: DictEntry;
  index: number;
  picked: string[];
  pick: (key: string) => void;
}) {
  const via = entry.via?.types.map((t) => formNames[t]).filter(Boolean);
  return (
    <article className="bs-dict-entry">
      {entry.via && (
        <p className="bs-dict-via">
          {entry.via.word} 是 {entry.word} 的{via?.join("、") || "变化形式"}
        </p>
      )}
      <h4>
        {entry.word}
        {entry.phonetic && (
          <span className="bs-phonetic">/{entry.phonetic}/</span>
        )}
      </h4>
      {(entry.collins > 0 || entry.oxford || entry.tags.length > 0) && (
        <div className="bs-dict-tags">
          {entry.collins > 0 && (
            <span title="柯林斯星级">{"★".repeat(entry.collins)}</span>
          )}
          {entry.oxford && <span>牛津 3000</span>}
          {entry.tags.map((t) => (
            <span key={t}>{tagNames[t] || t}</span>
          ))}
        </div>
      )}
      <ul>
        {entry.translation.map((line, l) => {
          const { pos, items } = splitSenses(line);
          if (!items.length || inflection.test(line.trim()))
            return <li key={l}>{line}</li>;
          return (
            <li key={l}>
              {pos && <span className="bs-pos">{pos}</span>}
              {items.map((sense, k) => {
                const key = `${index}:${l}:${k}`;
                return (
                  <React.Fragment key={k}>
                    {k > 0 && "；"}
                    <button
                      className="bs-sense"
                      aria-pressed={picked.includes(key)}
                      title="选中后只收藏选中的释义"
                      onClick={() => pick(key)}
                    >
                      {sense}
                    </button>
                  </React.Fragment>
                );
              })}
            </li>
          );
        })}
      </ul>
      {entry.forms.length > 0 && (
        <p className="bs-dict-forms">
          {entry.forms.map((f) => `${formNames[f.type]} ${f.word}`).join(" · ")}
        </p>
      )}
      {entry.definition.length > 0 && (
        <details>
          <summary>英文释义</summary>
          <ul>
            {entry.definition.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
const entryNote = (e: DictEntry) =>
  `${e.word}${e.phonetic ? ` /${e.phonetic}/` : ""}\n${e.translation.join("\n")}`;
const entryBack = (e: DictEntry) =>
  [e.phonetic && `/${e.phonetic}/`, ...e.translation]
    .filter(Boolean)
    .join("\n");
// 第一条只是「X的复数」这类词形说明时，收藏它的原形词条。
const inflection =
  /^\S+的(复数|过去式|过去分词|现在分词|第三人称单数|比较级|最高级)$/;
const headEntry = (entries: DictEntry[]): DictEntry | undefined =>
  (entries[0]?.translation.every((t) => inflection.test(t.trim())) &&
    entries.find((e) => e.via)) ||
  entries[0];
type Collect = (
  kind: ReviewCard["kind"],
  front: string,
  back: string,
  term?: string,
  sense?: string,
) => Promise<void>;
function drag(
  event: React.PointerEvent,
  move: (e: PointerEvent) => void,
  done?: () => void,
) {
  const handle = event.currentTarget as HTMLElement;
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
  explain,
}: {
  ctx: any;
  call: Call;
  lookup: Lookup;
  close: () => void;
  save: (note: string) => Promise<void>;
  collect: Collect;
  fail: (e: unknown) => void;
  explain: boolean;
}) {
  const assist = useAssist(ctx);
  const card = useRef<HTMLElement>(null),
    height = useRef(Number(localStorage.getItem("bookshelf.lookup.v1")) || 0);
  const [result, setResult] = useState<{
      installed: boolean;
      entries: DictEntry[];
    } | null>(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [collected, setCollected] = useState(false),
    [picked, setPicked] = useState<string[]>([]);
  const word = lookup.mode === "word";
  // 义项键为「词条:行:序号」，只能在同一词条内多选；explain 代表语境释义。
  const entryOf = (key: string) => key.split(":")[0];
  function pick(key: string) {
    setCollected(false);
    setPicked((keys) =>
      keys.includes(key)
        ? keys.filter((k) => k !== key)
        : [
            ...keys.filter(
              (k) =>
                key === "explain" ||
                k === "explain" ||
                entryOf(k) === entryOf(key),
            ),
            key,
          ],
    );
  }
  // 没有选义项时收藏整个词条；选了就只收藏选中的义项，每组义项各成一张卡。
  function collectWord() {
    const entries = result?.entries || [];
    const explained = plainText(assist.text);
    const keys = picked.filter((k) => k !== "explain");
    const index = keys.length
      ? Number(entryOf(keys[0]))
      : entries.indexOf(headEntry(entries)!);
    const entry = entries[index];
    if (!picked.length)
      return collect(
        "word",
        entry?.word || lookup.text,
        [entry && entryBack(entry), explained].filter(Boolean).join("\n"),
        lookup.text,
      );
    const sense = [
      ...(entry ? pickedSenses(entry, index, keys) : []),
      picked.includes("explain") && explained,
    ]
      .filter(Boolean)
      .join("\n");
    return collect(
      "word",
      entry?.word || lookup.text,
      [entry?.phonetic && `/${entry.phonetic}/`, sense]
        .filter(Boolean)
        .join("\n"),
      lookup.text,
      sense,
    );
  }
  const loadEntries = useCallback(
    () =>
      void call({ action: "lookup", query: lookup.text })
        .then(setResult)
        .catch((e) => setError(e.message)),
    [call, lookup.text],
  );
  const translate = () =>
    void assist.start({
      kind: "translate",
      text: lookup.text,
      context: lookup.context,
    });
  // 每次查询都以新的 key 挂载卡片，状态不会带到下一个词。
  useEffect(() => {
    if (word) loadEntries();
    else translate();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  const note = word
    ? [
        ...(result?.entries || []).slice(0, 2).map(entryNote),
        assist.text && `语境释义：${assist.text}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    : assist.text;
  function resize(event: React.PointerEvent) {
    const section = card.current!;
    const start = event.clientY,
      initial = section.getBoundingClientRect().height,
      limit = section.parentElement!.clientHeight * 0.75;
    drag(
      event,
      (e) => {
        height.current = Math.round(
          Math.max(120, Math.min(limit, initial + start - e.clientY)),
        );
        section.style.setProperty("--lookup-height", `${height.current}px`);
      },
      () => localStorage.setItem("bookshelf.lookup.v1", String(height.current)),
    );
  }
  return (
    <section
      className="bs-lookup"
      ref={card}
      aria-label={word ? "查词结果" : "翻译结果"}
      style={
        height.current
          ? ({
              "--lookup-height": `${height.current}px`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className="bs-resizer bs-lookup-resizer"
        role="separator"
        aria-label="拖动调整查词栏高度"
        aria-orientation="horizontal"
        onPointerDown={resize}
      />
      <header>
        <strong>{word ? "查词" : "翻译"}</strong>
        <span title={lookup.text}>{lookup.text}</span>
        <button aria-label="关闭" onClick={close}>
          ×
        </button>
      </header>
      <div className="bs-lookup-body" aria-live="polite">
        {word ? (
          <>
            {error ? (
              <p className="bs-error" role="alert">
                {error}
              </p>
            ) : !result ? (
              <p className="bs-muted">正在查询…</p>
            ) : !result.installed ? (
              <DictionarySetup call={call} onReady={loadEntries} />
            ) : result.entries.length === 0 ? (
              <p className="bs-muted">
                离线词典未收录「{lookup.text}」
                {explain ? "，可以试试结合上下文解释。" : "。"}
              </p>
            ) : (
              <>
                {lookup.collect && (
                  <p className="bs-muted bs-sense-hint">
                    点选要收藏的释义，可以多选；不选则收藏整个词条。
                  </p>
                )}
                {result.entries.map((entry, i) => (
                  <DictEntryView
                    key={entry.word + i}
                    entry={entry}
                    index={i}
                    picked={picked}
                    pick={pick}
                  />
                ))}
              </>
            )}
            {explain && (
              <div className="bs-context-explain">
                {assist.text || assist.running || assist.error ? (
                  <>
                    <h4>
                      语境释义
                      {assist.text && !assist.running && (
                        <button
                          className="bs-sense"
                          aria-pressed={picked.includes("explain")}
                          onClick={() => pick("explain")}
                        >
                          {picked.includes("explain")
                            ? "✓ 已选入卡片"
                            : "选入卡片"}
                        </button>
                      )}
                    </h4>
                    {assist.text ? (
                      <RichText text={assist.text} open={() => {}} />
                    ) : (
                      assist.running && (
                        <p className="bs-muted">正在结合上下文解释…</p>
                      )
                    )}
                  </>
                ) : (
                  <button
                    onClick={() =>
                      void assist.start({
                        kind: "explain",
                        text: lookup.text,
                        context: lookup.context,
                      })
                    }
                  >
                    结合上下文解释 ✦
                  </button>
                )}
              </div>
            )}
          </>
        ) : assist.text ? (
          <p className="bs-translation">{assist.text}</p>
        ) : (
          assist.running && <p className="bs-muted">正在翻译…</p>
        )}
        {assist.error && (
          <p className="bs-error" role="alert">
            {assist.error}
          </p>
        )}
      </div>
      <footer>
        <small>
          {assist.model
            ? `${assist.model}${assist.cached ? " · 来自缓存" : ""}`
            : word
              ? "ECDICT 离线词典"
              : "沿用 DSH 默认模型"}
        </small>
        {assist.running ? (
          <button onClick={assist.stop}>停止</button>
        ) : (
          !word && assist.error && <button onClick={translate}>重试</button>
        )}
        <button
          disabled={!note || assist.running || saved}
          onClick={() =>
            void save(note)
              .then(() => setSaved(true))
              .catch(fail)
          }
        >
          {saved ? "已存为笔记" : "存为笔记"}
        </button>
        <button
          disabled={
            collected || assist.running || (word ? !result : !assist.text)
          }
          onClick={() =>
            void (
              word
                ? collectWord()
                : collect("passage", lookup.text, assist.text)
            )
              .then(() => setCollected(true))
              .catch(fail)
          }
        >
          {collected
            ? "已加入复习"
            : picked.length
              ? `收藏 ${picked.length} 条释义`
              : "收藏复习"}
        </button>
        <button
          disabled={!note}
          onClick={() => void navigator.clipboard.writeText(note).catch(fail)}
        >
          复制
        </button>
      </footer>
    </section>
  );
}
// 正文 HTML 只在内容变化时写入：React 每次重渲染都会重设新的 __html 对象，
// 那会清掉读者的选区，也会让高亮选区失效。
const BlockHTML = memo(function BlockHTML({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
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
  notify,
}: {
  ctx: any;
  onAsk: (quote: string) => void;
  book: Book;
  call: Call;
  target: { chapter?: string; block?: string; revision?: string };
  onBack: () => void;
  fail: (e: unknown) => void;
  onUpdate: () => void;
  notify: (message: string) => void;
}) {
  const [chapterId, setChapterId] = useState(
      target.chapter || book.progress.chapter || book.chapters[0].id,
    ),
    [chapter, setChapter] = useState<Chapter | null>(null),
    [notes, setNotes] = useState<Annotation[]>([]),
    [tab, setTab] = useState<"contents" | "notes">("contents"),
    [selection, setSelection] = useState<Selected | null>(null),
    [lookup, setLookup] = useState<Lookup | null>(null),
    [note, setNote] = useState(""),
    [editing, setEditing] = useState<Annotation | null>(null),
    [font, setFont] = useState(
      () => Number(localStorage.getItem("bookshelf.font.v1")) || 20,
    ),
    [paper, setPaper] = useState(
      () => localStorage.getItem("bookshelf.paper.v1") === "true",
    ),
    [loading, setLoading] = useState(false),
    [noteDialog, setNoteDialog] = useState(false);
  const jump = useRef<{ chapter: string; block: string } | null>(null);
  const scroll = useRef<HTMLDivElement>(null),
    body = useRef<HTMLDivElement>(null),
    tocWidth = useRef(Number(localStorage.getItem("bookshelf.toc.v1")) || 0),
    position = useRef<any>(null),
    saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    request = useRef(0),
    painted = useRef<(readonly [Range, Annotation])[]>([]);
  const [active, setActive] = useState<Annotation | null>(null);
  const refreshNotes = useCallback(
    () =>
      call({ action: "annotations", bookId: book.id })
        .then(setNotes)
        .catch(fail),
    [book.id, call],
  );
  const closeLookup = useCallback(() => setLookup(null), []);
  const [features, setFeatures] = useState({ contextExplain: false });
  useEffect(() => {
    void call({ action: "features" })
      .then(setFeatures)
      .catch(() => {});
  }, [call]);
  useEffect(() => {
    void refreshNotes();
  }, [refreshNotes]);
  useEffect(() => {
    const container = scroll.current;
    if (!highlights || !container || loading || !chapter) return;
    CSS.highlights.set("bs-highlight", highlights);
    const pairs = notes.flatMap((n) => {
      const root =
        n.kind === "highlight" &&
        n.revision === book.revision &&
        n.chapter === chapter.id &&
        container.querySelector<HTMLElement>(
          `[data-block="${CSS.escape(n.block)}"] > div`,
        );
      const range = root && quoteRange(root, n.quote);
      return range ? [[range, n] as const] : [];
    });
    pairs.forEach(([r]) => highlights.add(r));
    painted.current = pairs;
    return () => {
      pairs.forEach(([r]) => highlights.delete(r));
      painted.current = [];
    };
  }, [notes, chapter, loading, book.revision]);
  useEffect(() => {
    if (target.chapter) setChapterId(target.chapter);
  }, [target]);
  useEffect(() => {
    const generation = ++request.current;
    setLoading(true);
    setSelection(null);
    setLookup(null);
    setActive(null);
    void call({ action: "chapter", bookId: book.id, chapter: chapterId })
      .then((c) => {
        if (generation !== request.current) return;
        setChapter(c);
        requestAnimationFrame(() => {
          const container = scroll.current;
          if (!container) return;
          const block =
            jump.current?.chapter === chapterId
              ? jump.current.block
              : target.chapter === chapterId
                ? target.block
                : book.progress.chapter === chapterId
                  ? book.progress.block
                  : undefined;
          jump.current = null;
          const chapterIndex = book.chapters.findIndex(
            (item) => item.id === c.id,
          );
          const offset = book.chapters
            .slice(0, chapterIndex)
            .reduce((n, item) => n + item.length, 0);
          const total = book.chapters.reduce((n, item) => n + item.length, 0);
          position.current = {
            action: "progress",
            bookId: book.id,
            chapter: c.id,
            block: block || c.blocks[0]?.id || "p0",
            ratio:
              (offset +
                Math.max(
                  0,
                  c.blocks.findIndex((p: any) => p.id === block),
                )) /
              Math.max(1, total),
          };
          void call(position.current).catch(fail);
          const element = block
            ? container.querySelector(`[data-block="${block}"]`)
            : null;
          if (element) {
            element.scrollIntoView({ block: "start" });
            if (target.block) {
              element.classList.add("bs-flash");
              setTimeout(() => element.classList.remove("bs-flash"), 2400);
            }
          } else container.scrollTop = 0;
        });
      })
      .catch(fail)
      .finally(() => {
        if (generation === request.current) setLoading(false);
      });
    return () => {
      request.current++;
    };
  }, [chapterId, book.id, target]);
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (position.current) void call(position.current).catch(fail);
    },
    [book.id],
  );
  function track() {
    if (!chapter || !scroll.current) return;
    const root = scroll.current;
    const blocks = Array.from(
      root.querySelectorAll<HTMLElement>("[data-block]"),
    );
    const top = root.getBoundingClientRect().top;
    const visible = blocks.find(
      (el) => el.getBoundingClientRect().bottom > top + 40,
    );
    const index = book.chapters.findIndex((c) => c.id === chapter.id);
    const offset = book.chapters
      .slice(0, index)
      .reduce((n, c) => n + c.length, 0);
    const total = book.chapters.reduce((n, c) => n + c.length, 0);
    const block = visible?.dataset.block || "p0";
    position.current = {
      action: "progress",
      bookId: book.id,
      chapter: chapter.id,
      block,
      ratio:
        (offset +
          Math.max(
            0,
            chapter.blocks.findIndex((p) => p.id === block),
          )) /
        Math.max(1, total),
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () => void call(position.current).catch(fail),
      900,
    );
  }
  async function annotate(
    kind: "highlight" | "bookmark",
    block: string,
    quote: string,
    text = note,
  ) {
    await call({
      action: "annotate",
      bookId: book.id,
      chapter: chapterId,
      block,
      quote,
      note: kind === "highlight" ? text : "",
      kind,
    });
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setNoteDialog(false);
    setNote("");
    await refreshNotes();
  }
  async function collect(
    block: string,
    kind: ReviewCard["kind"],
    front: string,
    back: string,
    term = "",
    sense = "",
  ) {
    const { created } = await call({
      action: "collect",
      kind,
      front,
      back,
      term,
      sense,
      bookId: book.id,
      chapter: chapterId,
      block,
    });
    notify(created ? "已加入复习" : "已在复习中，内容已更新");
  }
  // 单词先打开查词面板挑选义项；带笔记的单词高亮以笔记为释义；其余按摘录卡收藏。
  async function collectQuote(from: Selected, note = "") {
    const { block, quote } = from;
    if (!isTerm(quote)) return collect(block, "passage", quote, note);
    if (!note) return open("word", from, true);
    const result = await call({ action: "lookup", query: quote }).catch(
      () => null,
    );
    await collect(
      block,
      "word",
      headEntry(result?.entries || [])?.word || quote.trim(),
      note,
      quote.trim(),
    );
  }
  const blockContext = (block: string) =>
    chapter?.blocks.find((b) => b.id === block)?.text.slice(0, 2000) || "";
  function selected(e: React.MouseEvent | React.KeyboardEvent) {
    const s = window.getSelection();
    // 单击高亮文字时打开这条高亮的操作栏。
    if ((!s || s.isCollapsed) && "clientX" in e) {
      if ((e.target as HTMLElement).closest("a, button")) return;
      const hit = painted.current.findLast(([range]) =>
        Array.from(range.getClientRects()).some(
          (r) =>
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom,
        ),
      );
      setActive(hit ? hit[1] : null);
      return;
    }
    if (
      !s ||
      s.isCollapsed ||
      !scroll.current?.contains(s.anchorNode) ||
      !scroll.current.contains(s.focusNode)
    )
      return;
    setActive(null);
    const node =
      s.anchorNode?.parentElement?.closest<HTMLElement>("[data-block]");
    if (!node) return;
    const next = {
      block: node.dataset.block!,
      quote: s.toString().trim().slice(0, 4000),
      context: blockContext(node.dataset.block!),
    };
    // 双击单词直接查词，其余选区先显示操作条。
    if (e.type === "mouseup" && e.detail === 2 && isTerm(next.quote))
      open("word", next);
    else setSelection(next);
  }
  function resizeToc(event: React.PointerEvent) {
    const container = body.current!;
    const start = event.clientX;
    const width = container
      .querySelector(".bs-toc")!
      .getBoundingClientRect().width;
    drag(
      event,
      (e) => {
        tocWidth.current = Math.round(
          Math.max(
            100,
            Math.min(
              420,
              container.clientWidth * 0.5,
              width + e.clientX - start,
            ),
          ),
        );
        container.style.setProperty("--toc-width", `${tocWidth.current}px`);
      },
      () => localStorage.setItem("bookshelf.toc.v1", String(tocWidth.current)),
    );
  }
  function open(mode: Lookup["mode"], from = selection!, collect = false) {
    setLookup({
      id: Date.now(),
      mode,
      text: from.quote,
      block: from.block,
      context: from.context,
      collect,
    });
    setSelection(null);
  }
  return (
    <section className={"bs-reader" + (paper ? " bs-paper" : "")}>
      <div className="bs-reader-toolbar">
        <button
          onClick={() => {
            onBack();
            onUpdate();
          }}
        >
          ← 书架
        </button>
        <span title={book.title}>{book.title}</span>
        <button
          aria-label="缩小字号"
          onClick={() =>
            setFont((v) => {
              const n = Math.max(15, v - 1);
              localStorage.setItem("bookshelf.font.v1", String(n));
              return n;
            })
          }
        >
          A−
        </button>
        <button
          aria-label="放大字号"
          onClick={() =>
            setFont((v) => {
              const n = Math.min(30, v + 1);
              localStorage.setItem("bookshelf.font.v1", String(n));
              return n;
            })
          }
        >
          A+
        </button>
        <button
          aria-label="切换纸张背景"
          aria-pressed={paper}
          onClick={() =>
            setPaper((v) => {
              localStorage.setItem("bookshelf.paper.v1", String(!v));
              return !v;
            })
          }
        >
          ◐
        </button>
      </div>
      <div
        className="bs-reader-body"
        ref={body}
        style={
          tocWidth.current
            ? ({
                "--toc-width": `${tocWidth.current}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <nav className="bs-toc">
          <div className="bs-tabs">
            <button
              aria-pressed={tab === "contents"}
              onClick={() => setTab("contents")}
            >
              目录
            </button>
            <button
              aria-pressed={tab === "notes"}
              onClick={() => setTab("notes")}
            >
              笔记 {notes.length}
            </button>
          </div>
          {tab === "contents" ? (
            book.chapters.map((c, i) => (
              <button
                key={c.id}
                className={chapterId === c.id ? "bs-selected" : ""}
                onClick={() => setChapterId(c.id)}
              >
                <small>{String(i + 1).padStart(2, "0")}</small>
                {c.title}
              </button>
            ))
          ) : (
            <>
              {notes.map((a) => (
                <article key={a.id} className="bs-note">
                  <button
                    onClick={() => {
                      if (a.revision !== book.revision) {
                        fail(
                          new Error(
                            "这条笔记来自此前版本，引用内容保留在笔记中",
                          ),
                        );
                        return;
                      }
                      jump.current = { chapter: a.chapter, block: a.block };
                      setChapterId(a.chapter);
                      requestAnimationFrame(() =>
                        scroll.current
                          ?.querySelector(`[data-block="${a.block}"]`)
                          ?.scrollIntoView(),
                      );
                    }}
                  >
                    {a.kind === "bookmark" ? "⚑ " : ""}
                    {a.quote || "书签"}
                  </button>
                  {a.note && <p>{a.note}</p>}
                  <div>
                    <button
                      onClick={() => {
                        setEditing(a);
                        setNote(a.note);
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() =>
                        void call({ action: "removeAnnotation", id: a.id })
                          .then(refreshNotes)
                          .catch(fail)
                      }
                    >
                      移除
                    </button>
                  </div>
                </article>
              ))}
              <button
                onClick={() =>
                  void call({ action: "exportNotes", bookId: book.id })
                    .then((markdown) => {
                      const url = URL.createObjectURL(
                        new Blob([markdown], {
                          type: "text/markdown;charset=utf-8",
                        }),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = book.title + "-阅读笔记.md";
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    })
                    .catch(fail)
                }
              >
                导出阅读笔记 ↗
              </button>
            </>
          )}
        </nav>
        <div
          className="bs-resizer bs-toc-resizer"
          role="separator"
          aria-label="拖动调整目录宽度"
          aria-orientation="vertical"
          onPointerDown={resizeToc}
        />
        <div className="bs-page-column">
          <div
            className="bs-page"
            ref={scroll}
            onScroll={track}
            onMouseUp={selected}
            onKeyUp={selected}
            style={{ fontSize: font }}
          >
            {target.revision && target.revision !== book.revision ? (
              <p className="bs-error">引用对应此前版本，当前展示最新正文。</p>
            ) : null}
            {loading ? (
              <p className="bs-muted">正在打开章节…</p>
            ) : (
              chapter && (
                <>
                  <div className="bs-page-heading">
                    <small>
                      {book.author} · {book.format}
                    </small>
                    {chapter.blocks[0]?.text !== chapter.title && (
                      <h1>{chapter.title}</h1>
                    )}
                  </div>
                  {chapter.blocks.map((block) => {
                    const marks = notes.filter(
                      (n) =>
                        n.kind === "bookmark" &&
                        n.revision === book.revision &&
                        n.chapter === chapterId &&
                        n.block === block.id,
                    );
                    return (
                      <div
                        key={block.id}
                        data-block={block.id}
                        className={
                          "bs-block" + (marks.length ? " bs-bookmarked" : "")
                        }
                      >
                        <BlockHTML html={block.html} />
                        <button
                          className="bs-bookmark"
                          title={marks.length ? "移除书签" : "添加书签"}
                          aria-label={
                            marks.length ? "移除该段书签" : "为该段添加书签"
                          }
                          aria-pressed={marks.length > 0}
                          onClick={() =>
                            void (
                              marks.length
                                ? Promise.all(
                                    marks.map((m) =>
                                      call({
                                        action: "removeAnnotation",
                                        id: m.id,
                                      }),
                                    ),
                                  ).then(refreshNotes)
                                : annotate(
                                    "bookmark",
                                    block.id,
                                    block.text.slice(0, 180),
                                  )
                            ).catch(fail)
                          }
                        >
                          ⚑
                        </button>
                      </div>
                    );
                  })}
                  <div className="bs-chapter-nav">
                    <button
                      disabled={chapterId === book.chapters[0].id}
                      onClick={() =>
                        setChapterId(
                          book.chapters[
                            book.chapters.findIndex((c) => c.id === chapterId) -
                              1
                          ].id,
                        )
                      }
                    >
                      ← 上一章
                    </button>
                    <button
                      disabled={chapterId === book.chapters.at(-1)!.id}
                      onClick={() =>
                        setChapterId(
                          book.chapters[
                            book.chapters.findIndex((c) => c.id === chapterId) +
                              1
                          ].id,
                        )
                      }
                    >
                      下一章 →
                    </button>
                  </div>
                </>
              )
            )}
          </div>
          {selection && (
            <div className="bs-selection-bar">
              <span>{selection.quote}</span>
              {isTerm(selection.quote) && (
                <button onClick={() => open("word")}>查词</button>
              )}
              <button onClick={() => open("translate")}>翻译</button>
              <button
                onClick={() =>
                  void annotate(
                    "highlight",
                    selection.block,
                    selection.quote,
                  ).catch(fail)
                }
              >
                高亮
              </button>
              <button onClick={() => setNoteDialog(true)}>记笔记</button>
              <button
                onClick={() =>
                  void collectQuote(selection)
                    .then(() => {
                      window.getSelection()?.removeAllRanges();
                      setSelection(null);
                    })
                    .catch(fail)
                }
              >
                收藏
              </button>
              <button
                onClick={() => {
                  onAsk(selection.quote);
                  setSelection(null);
                }}
              >
                问助手
              </button>
              <button
                aria-label="关闭选段操作"
                onClick={() => setSelection(null)}
              >
                ×
              </button>
            </div>
          )}
          {active && !selection && (
            <div className="bs-selection-bar bs-highlight-bar">
              <span>
                {active.note ? (
                  <>
                    <b>笔记</b>
                    {active.note}
                  </>
                ) : (
                  active.quote
                )}
              </span>
              <button
                onClick={() => {
                  setEditing(active);
                  setNote(active.note);
                }}
              >
                {active.note ? "编辑笔记" : "写笔记"}
              </button>
              <button
                onClick={() =>
                  void collectQuote(
                    { ...active, context: blockContext(active.block) },
                    active.note,
                  )
                    .then(() => setActive(null))
                    .catch(fail)
                }
              >
                收藏复习
              </button>
              <button
                onClick={() =>
                  void call({ action: "removeAnnotation", id: active.id })
                    .then(() => {
                      setActive(null);
                      return refreshNotes();
                    })
                    .catch(fail)
                }
              >
                删除高亮
              </button>
              <button aria-label="关闭高亮操作" onClick={() => setActive(null)}>
                ×
              </button>
            </div>
          )}
          {lookup && (
            <LookupCard
              key={lookup.id}
              ctx={ctx}
              call={call}
              lookup={lookup}
              close={closeLookup}
              fail={fail}
              explain={features.contextExplain}
              save={(text) =>
                annotate("highlight", lookup.block, lookup.text, text)
              }
              collect={(...args) => collect(lookup.block, ...args)}
            />
          )}
        </div>
      </div>
      {selection && noteDialog && (
        <Modal
          title="记录这段阅读"
          close={() => {
            setSelection(null);
            setNoteDialog(false);
            setNote("");
          }}
        >
          <blockquote>{selection.quote}</blockquote>
          <textarea
            autoFocus
            aria-label="阅读笔记"
            placeholder="写下你的想法（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <footer>
            <button onClick={() => setSelection(null)}>取消</button>
            <button
              className="bs-primary"
              onClick={() =>
                void annotate(
                  "highlight",
                  selection.block,
                  selection.quote,
                ).catch(fail)
              }
            >
              保存高亮与笔记
            </button>
          </footer>
        </Modal>
      )}
      {editing && (
        <Modal
          title="编辑笔记"
          close={() => {
            setEditing(null);
            setNote("");
          }}
        >
          <blockquote>{editing.quote}</blockquote>
          <textarea
            aria-label="笔记内容"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <footer>
            <button
              className="bs-primary"
              onClick={() =>
                void call({ action: "editNote", id: editing.id, note })
                  .then(() => {
                    setEditing(null);
                    setActive(null);
                    setNote("");
                    return refreshNotes();
                  })
                  .catch(fail)
              }
            >
              保存笔记
            </button>
          </footer>
        </Modal>
      )}
    </section>
  );
}
function wait(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} 天`;
  if (days < 365) return `${Math.round(days / 30)} 个月`;
  return `${Math.round(days / 365)} 年`;
}
const sourceURL = (s: NonNullable<ReviewCard["source"]>) =>
  `bookshelf://${s.bookId}/${s.chapter}/${s.block}?revision=${s.revision}`;
function Marked({ text, term }: { text: string; term: string }) {
  const at = term
    ? text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase())
    : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + term.length)}</mark>
      {text.slice(at + term.length)}
    </>
  );
}
const grades = ["忘了", "模糊", "记得", "简单"];
function Review({
  call,
  fail,
  notify,
  open,
  onBack,
}: {
  call: Call;
  fail: (e: unknown) => void;
  notify: (message: string) => void;
  open: (url: string) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"review" | "cards">("review"),
    [queue, setQueue] = useState<ReviewCard[] | null>(null),
    [all, setAll] = useState<ReviewCard[] | null>(null),
    [stats, setStats] = useState<ReviewStats | null>(null),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const failed = (e: unknown) =>
    setError(e instanceof Error ? e.message : String(e));
  const load = useCallback(() => {
    setError("");
    return call({ action: "cards", due: true })
      .then((r) => {
        setQueue(r.cards);
        setStats(r);
      })
      .catch(failed);
  }, [call]);
  const loadAll = useCallback(() => {
    setError("");
    return call({ action: "cards" })
      .then((r) => {
        setAll(r.cards);
        setStats(r);
      })
      .catch(failed);
  }, [call]);
  // 加载失败时说明原因：界面已更新而宿主仍是旧版本时，宿主不认识复习操作。
  const pending = (text: string) => (
    <div className="bs-empty">
      {error ? (
        <>
          <p>卡片没有加载出来：{error}</p>
          {error.includes("未知的书架操作") && (
            <p className="bs-muted">
              书架插件的后台还是更新前的版本，重启 DSH 后再试。
            </p>
          )}
          <button onClick={() => void (tab === "review" ? load() : loadAll())}>
            重试
          </button>
        </>
      ) : (
        text
      )}
    </div>
  );
  useEffect(() => {
    void (tab === "review" ? load() : loadAll());
  }, [tab, load, loadAll]);
  const card = queue?.[0];
  async function grade(rating: number) {
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
    void call({ action: "importNotes" })
      .then(({ imported }) => {
        notify(
          imported ? `已从笔记导入 ${imported} 张卡片` : "没有可导入的新笔记",
        );
        return tab === "review" ? load() : loadAll();
      })
      .catch(fail);
  }
  // 空格或回车翻面，翻面后按 1–4 评分。
  useEffect(() => {
    if (tab !== "review" || !card) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
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
  return (
    <main className="bs-library bs-review">
      <div className="bs-library-heading">
        <div>
          <p className="bs-eyebrow">收藏复习 · 按遗忘规律安排</p>
          <h1>复习</h1>
          <p className="bs-muted">
            查词或选段时点「收藏」，单词和句子会按 FSRS 算法安排复习。
          </p>
        </div>
        <div className="bs-actions">
          <button onClick={onBack}>← 书架</button>
        </div>
      </div>
      <div className="bs-filter-row">
        <div className="bs-tabs">
          <button
            aria-pressed={tab === "review"}
            onClick={() => setTab("review")}
          >
            今日复习{stats ? ` ${stats.due}` : ""}
          </button>
          <button
            aria-pressed={tab === "cards"}
            onClick={() => setTab("cards")}
          >
            全部卡片{stats ? ` ${stats.total}` : ""}
          </button>
        </div>
        <button onClick={importNotes}>从笔记导入</button>
      </div>
      {tab === "review" ? (
        !queue ? (
          pending("正在整理卡片…")
        ) : card ? (
          <article className="bs-review-card" key={card.id}>
            <small className="bs-muted">
              {card.kind === "word" ? "单词" : "摘录"}
              {card.source &&
                ` · 《${card.source.title}》${card.source.chapterTitle}`}
            </small>
            {card.kind === "word" ? (
              <h2>{card.front}</h2>
            ) : (
              <blockquote>{card.front}</blockquote>
            )}
            {card.kind === "word" && card.context && (
              <p className="bs-review-context">
                <Marked text={card.context} term={card.term || card.front} />
              </p>
            )}
            {revealed && (
              <div className="bs-review-answer">
                {card.back ? (
                  <p>{card.back}</p>
                ) : card.kind === "passage" && card.context !== card.front ? (
                  <p className="bs-muted">
                    <Marked text={card.context} term={card.front} />
                  </p>
                ) : (
                  <p className="bs-muted">没有记录释义，回到原文看看上下文。</p>
                )}
                {card.source && (
                  <button onClick={() => open(sourceURL(card.source!))}>
                    回到原文 ↗
                  </button>
                )}
              </div>
            )}
            <footer>
              {revealed ? (
                grades.map((label, i) => (
                  <button
                    key={label}
                    disabled={busy}
                    onClick={() => void grade(i + 1)}
                  >
                    <strong>{label}</strong>
                    {card.preview && (
                      <small>{wait(card.preview[i] - now)}</small>
                    )}
                  </button>
                ))
              ) : (
                <button
                  className="bs-primary"
                  onClick={() => setRevealed(true)}
                >
                  显示答案
                </button>
              )}
            </footer>
            <p className="bs-muted bs-review-hint">
              还剩 {queue.length} 张 ·{" "}
              {revealed ? "按 1–4 评分" : "空格显示答案"}
            </p>
          </article>
        ) : (
          <div className="bs-empty">
            <Glyph size={48} />
            <h2>{stats?.total ? "今天的复习完成了" : "还没有收藏"}</h2>
            <p>
              {stats?.total
                ? stats.next
                  ? `下一张卡片 ${wait(stats.next - now)}后到期。`
                  : "所有卡片都已安排好。"
                : "查词时点「收藏复习」，或在选段栏点「收藏」，单词和句子会出现在这里。"}
            </p>
            {!stats?.total && (
              <button onClick={importNotes}>从已有笔记导入</button>
            )}
          </div>
        )
      ) : !all ? (
        pending("正在读取卡片…")
      ) : all.length ? (
        <div className="bs-review-list">
          {all.map((c) => (
            <article key={c.id}>
              <div>
                <strong>{c.front}</strong>
                {c.back && <p>{c.back.split("\n").slice(0, 2).join("；")}</p>}
                <small>
                  {c.source &&
                    `《${c.source.title}》${c.source.chapterTitle} · `}
                  {c.due <= now ? "待复习" : `${wait(c.due - now)}后复习`} ·
                  已复习 {c.memory.reps} 次
                </small>
              </div>
              {c.source && (
                <button onClick={() => open(sourceURL(c.source!))}>原文</button>
              )}
              <button
                onClick={() =>
                  void call({ action: "uncollect", id: c.id })
                    .then(loadAll)
                    .catch(fail)
                }
              >
                移除
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="bs-empty">
          <p>还没有卡片。</p>
        </div>
      )}
    </main>
  );
}
function Shelf({ ctx, call }: { ctx: any; call: Call }) {
  const [books, setBooks] = useState<Book[]>([]),
    [roots, setRoots] = useState<string[]>([]),
    [job, setJob] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("added"),
    [hits, setHits] = useState<Hit[] | null>(null),
    [searching, setSearching] = useState(false),
    [limit, setLimit] = useState(60),
    [selected, setSelected] = useState<Book | null>(null),
    [target, setTarget] = useState<any>({}),
    [edit, setEdit] = useState<Book | null>(null),
    [showImport, setShowImport] = useState(false),
    [importPath, setImportPath] = useState(""),
    [showWeb, setShowWeb] = useState(false),
    [webURL, setWebURL] = useState(""),
    [uploading, setUploading] = useState(""),
    [assistant, setAssistant] = useState(true),
    [removing, setRemoving] = useState<Book | null>(null),
    [ask, setAsk] = useState(""),
    [reviewing, setReviewing] = useState(false),
    [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const fileInput = useRef<HTMLInputElement>(null),
    sequence = useRef(0),
    panel = useRef<HTMLDivElement>(null);
  const fail = useCallback(
    (e: unknown) => setNotice(e instanceof Error ? e.message : String(e)),
    [],
  );
  // 操作成功的提示几秒后自动消失，错误提示保留到手动关闭。
  const notify = useCallback((message: string) => {
    setNotice(message);
    setTimeout(() => setNotice((n) => (n === message ? "" : n)), 2500);
  }, []);
  const refresh = useCallback(async () => {
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
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!job?.running) return;
    const timer = setTimeout(() => void refresh(), 600);
    return () => clearTimeout(timer);
  }, [job, refresh]);
  useEffect(() => {
    setHits(null);
    setLimit(60);
    sequence.current++;
  }, [query, filter]);
  const shown = useMemo(() => {
    const q = query.toLocaleLowerCase().trim();
    return books
      .filter(
        (b) =>
          (filter === "all" || b.status === filter) &&
          (!q ||
            `${b.title} ${b.author} ${b.tags.join(" ")}`
              .toLocaleLowerCase()
              .includes(q)),
      )
      .sort((a, b) =>
        sort === "title"
          ? a.title.localeCompare(b.title, "zh-CN")
          : sort === "read"
            ? b.lastReadAt - a.lastReadAt
            : b.addedAt - a.addedAt,
      );
  }, [books, query, filter, sort]);
  // 网页导入在宿主的导入任务里进行，等任务结束后再提示结果。
  async function importWeb(url: string) {
    const link = new URL(url);
    link.hash = "";
    const existed = books.some((b) => b.source === link.href && !b.removed);
    await call({ action: "import", paths: [url] });
    setShowWeb(false);
    setWebURL("");
    notify("正在下载网页…");
    let current = await call({ action: "job" });
    while (current.running) {
      await new Promise((r) => setTimeout(r, 500));
      current = await call({ action: "job" });
    }
    await refresh();
    if (current.errors.length) fail(current.errors[0]);
    else
      notify(
        !current.imported
          ? "这个网页已在书架中，内容没有变化"
          : existed
            ? "网页已更新为最新内容"
            : "网页已加入书架",
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
  function open(
    book: Book,
    chapter?: string,
    block?: string,
    revision?: string,
  ) {
    setSelected(book);
    setTarget({ chapter, block, revision });
  }
  const openURL = useCallback(
    (raw: string) => {
      try {
        const u = new URL(raw);
        const book = books.find((b) => b.id === u.hostname);
        if (!book) throw new Error("引用的书籍已移出书架");
        const [chapter, block] = u.pathname.slice(1).split("/");
        open(book, chapter, block, u.searchParams.get("revision") || undefined);
      } catch (e) {
        fail(e);
      }
    },
    [books],
  );
  const cite = useCallback<Cite>(
    (raw) => {
      try {
        const u = new URL(raw);
        const book = books.find((b) => b.id === u.hostname);
        if (!book) return ["已移出书架的书", "引用的书籍已移出书架"];
        const chapter = u.pathname.slice(1).split("/")[0];
        const title =
          book.chapters.find((c) => c.id === chapter)?.title || chapter;
        return [
          selected?.id === book.id ? title : `《${book.title}》${title}`,
          `《${book.title}》${title} · 点击回到原文`,
        ];
      } catch {
        return ["原文", raw];
      }
    },
    [books, selected],
  );
  async function upload(files: FileList | File[]) {
    try {
      for (const file of Array.from(files)) {
        setUploading(`正在导入 ${file.name}`);
        const { id } = await call({
          action: "uploadStart",
          filename: file.name,
          size: file.size,
        });
        for (let offset = 0; offset < file.size; offset += 512 * 1024) {
          const chunk = new Uint8Array(
            await file.slice(offset, offset + 512 * 1024).arrayBuffer(),
          );
          let binary = "";
          for (let i = 0; i < chunk.length; i += 8192)
            binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
          await call({ action: "uploadChunk", id, data: btoa(binary) });
          setUploading(
            `${file.name} · ${Math.round((Math.min(file.size, offset + chunk.length) / file.size) * 100)}%`,
          );
        }
        await call({ action: "uploadFinish", id });
      }
      setNotice("书籍已导入书架");
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setUploading("");
    }
  }
  function resize(event: React.PointerEvent) {
    const container = panel.current!;
    const start = event.clientX;
    const width = container
      .querySelector(".bs-assistant")!
      .getBoundingClientRect().width;
    drag(event, (e) =>
      container.style.setProperty(
        "--assistant-width",
        `${Math.max(300, Math.min(container.clientWidth * 0.65, width + start - e.clientX))}px`,
      ),
    );
  }
  return (
    <div
      className="bs-app"
      ref={panel}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
      }}
    >
      <style>{css}</style>
      <header className="bs-top" data-window-drag>
        <span>
          <Glyph size={17} /> 书架
        </span>
        <button
          aria-pressed={assistant}
          onClick={() => setAssistant((v) => !v)}
        >
          ☷ 书架助手
        </button>
      </header>
      {notice && (
        <div className="bs-notice" role="status">
          {notice}
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <div
        className={"bs-workspace" + (assistant ? "" : " bs-assistant-hidden")}
      >
        {selected ? (
          <Reader
            ctx={ctx}
            key={selected.id}
            book={selected}
            call={call}
            target={target}
            fail={fail}
            onAsk={(quote) => {
              setAssistant(true);
              setAsk(`请解释这段原文，并结合上下文说明：\n${quote}`);
            }}
            onBack={() => setSelected(null)}
            onUpdate={() => void refresh()}
            notify={notify}
          />
        ) : reviewing ? (
          <Review
            call={call}
            fail={fail}
            notify={notify}
            open={openURL}
            onBack={() => {
              setReviewing(false);
              void refresh();
            }}
          />
        ) : (
          <main className="bs-library">
            <div className="bs-library-heading">
              <div>
                <p className="bs-eyebrow">私人藏书 · 从这里开始</p>
                <h1>
                  我的书架 <small>{books.length}</small>
                </h1>
                <p className="bs-muted">让每一次翻阅，都有所收获。</p>
              </div>
              <div className="bs-actions">
                <button onClick={() => setReviewing(true)}>
                  复习
                  {reviewStats?.due ? (
                    <span className="bs-badge">{reviewStats.due}</span>
                  ) : null}
                </button>
                <button
                  disabled={job?.running || !!uploading}
                  onClick={() => {
                    if (roots.length)
                      void call({ action: "scan" }).then(refresh).catch(fail);
                    else setShowImport(true);
                  }}
                >
                  ↻ 扫描书库
                </button>
                <button
                  className="bs-primary"
                  disabled={!!uploading || job?.running}
                  onClick={() => fileInput.current?.click()}
                >
                  ＋ 导入书籍
                </button>
              </div>
            </div>
            <div className="bs-filter-row">
              <div className="bs-tabs">
                {[
                  ["all", "全部书籍"],
                  ["reading", "在读"],
                  ["unread", "未读"],
                  ["finished", "读完"],
                ].map(([id, name]) => (
                  <button
                    key={id}
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <select
                aria-label="书架排序"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="added">最近添加</option>
                <option value="read">最近阅读</option>
                <option value="title">书名排序</option>
              </select>
            </div>
            <div className="bs-search-row">
              <label className="bs-search">
                <span>⌕</span>
                <input
                  aria-label="搜索书籍"
                  placeholder="搜索书名、作者、标签…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void contentSearch();
                  }}
                />
                {query && (
                  <button aria-label="清空搜索" onClick={() => setQuery("")}>
                    ×
                  </button>
                )}
              </label>
              <button
                disabled={!query.trim() || searching}
                onClick={() => void contentSearch()}
              >
                {searching ? "检索中…" : "搜索正文"}
              </button>
              <button title="管理扫描目录" onClick={() => setShowImport(true)}>
                目录
              </button>
              <button title="导入网页链接" onClick={() => setShowWeb(true)}>
                网页
              </button>
            </div>
            {(uploading || job?.running) && (
              <div className="bs-import-progress" role="status">
                <span>
                  {uploading ||
                    `扫描 ${job.done}/${job.total} · ${job.current}`}
                </span>
                {job?.total > 0 && (
                  <progress max={job.total} value={job.done} />
                )}
              </div>
            )}
            {job &&
              !job.running &&
              (job.imported > 0 || job.errors.length > 0) && (
                <details className="bs-import-result">
                  <summary>
                    最近扫描：新增 {job.imported} 本 · 跳过 {job.skipped} 本 ·{" "}
                    {job.errors.length} 项提示
                  </summary>
                  {job.errors.map((e: string, i: number) => (
                    <p key={i}>{e}</p>
                  ))}
                </details>
              )}
            {loading ? (
              <div className="bs-empty">正在打开书库…</div>
            ) : hits ? (
              <div className="bs-results">
                <p className="bs-muted">
                  正文匹配 {hits.length} 处
                  {hits.length === 40 ? " · 已显示前 40 处" : ""}
                </p>
                {hits.map((hit, i) => (
                  <button key={i} onClick={() => openURL(hit.url)}>
                    <small>
                      {hit.title} / {hit.chapterTitle}
                    </small>
                    <p>{hit.text}</p>
                    <span>回到原文 ↗</span>
                  </button>
                ))}
                {!hits.length && (
                  <div className="bs-empty">
                    试试更短的关键词，或用空格组合相关词。
                  </div>
                )}
              </div>
            ) : shown.length ? (
              <>
                <div className="bs-grid">
                  {shown.slice(0, limit).map((book) => (
                    <article className="bs-card" key={book.id}>
                      <button
                        className="bs-card-open"
                        onClick={() => open(book)}
                      >
                        <Cover book={book} call={call} />
                        <h3>{book.title}</h3>
                        <p>{book.author || "作者待补充"}</p>
                      </button>
                      <div className="bs-card-meta">
                        <span>{book.format}</span>
                        <span>{statusNames[book.status]}</span>
                        <button
                          aria-label={`编辑《${book.title}》`}
                          onClick={() => setEdit(book)}
                        >
                          ···
                        </button>
                      </div>
                      {book.progress.ratio > 0 && (
                        <progress
                          aria-label="阅读进度"
                          value={
                            book.status === "finished" ? 1 : book.progress.ratio
                          }
                          max={1}
                        />
                      )}
                    </article>
                  ))}
                </div>
                {shown.length > limit && (
                  <button
                    className="bs-load-more"
                    onClick={() => setLimit((v) => v + 60)}
                  >
                    继续显示 · 剩余 {shown.length - limit} 本
                  </button>
                )}
              </>
            ) : (
              <div className="bs-empty">
                <Glyph size={48} />
                <h2>{query ? "换个词，继续寻找" : "为自己留一座书架"}</h2>
                <p>
                  {query
                    ? "书架会按书名、作者和标签筛选。"
                    : "将 EPUB、Markdown、TXT 或 HTML 拖到这里，或导入网页链接，开始阅读。"}
                </p>
                {!query && (
                  <>
                    <button
                      className="bs-primary"
                      onClick={() => fileInput.current?.click()}
                    >
                      导入第一本书
                    </button>
                    <button onClick={() => setShowImport(true)}>
                      从本地目录扫描
                    </button>
                    <button onClick={() => setShowWeb(true)}>导入网页</button>
                    <small>本地保存 · 自动记住阅读位置</small>
                  </>
                )}
              </div>
            )}
          </main>
        )}
        {assistant && (
          <>
            <div
              className="bs-resizer"
              role="separator"
              aria-label="拖动调整助手宽度"
              aria-orientation="vertical"
              onPointerDown={resize}
            />
            <Assistant
              key={selected?.id || "library"}
              ctx={ctx}
              call={call}
              book={selected}
              prompt={ask}
              open={openURL}
              cite={cite}
              fail={fail}
            />
          </>
        )}
      </div>
      <input
        className="bs-file-input"
        ref={fileInput}
        type="file"
        multiple
        accept=".epub,.md,.markdown,.txt,.html,.htm"
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files);
          e.target.value = "";
        }}
      />
      {edit && (
        <EditBook
          book={edit}
          call={call}
          close={() => setEdit(null)}
          changed={() => void refresh()}
          remove={() => {
            setRemoving(edit);
            setEdit(null);
          }}
        />
      )}
      {removing && (
        <Modal title="移出书架" close={() => setRemoving(null)}>
          <p>
            将《{removing.title}
            》移出书架。原始文件和阅读笔记会保留，重新导入后可继续阅读。
          </p>
          <footer>
            <button onClick={() => setRemoving(null)}>取消</button>
            <button
              onClick={() =>
                void call({ action: "remove", bookId: removing.id })
                  .then(() => {
                    setRemoving(null);
                    return refresh();
                  })
                  .catch(fail)
              }
            >
              移出书架
            </button>
          </footer>
        </Modal>
      )}
      {showWeb && (
        <Modal title="导入网页" close={() => setShowWeb(false)}>
          <p className="bs-muted">
            书架会下载网页正文，保存为一本书。同一链接再次导入时更新为最新内容；网页中的图片不会保存。
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void importWeb(webURL.trim()).catch(fail);
            }}
          >
            <label>
              网页链接
              <input
                autoFocus
                type="url"
                placeholder="https://"
                value={webURL}
                onChange={(e) => setWebURL(e.target.value)}
              />
            </label>
            <footer>
              <button type="button" onClick={() => setShowWeb(false)}>
                取消
              </button>
              <button
                className="bs-primary"
                disabled={
                  !/^https?:\/\/\S+$/i.test(webURL.trim()) || job?.running
                }
              >
                导入
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {showImport && (
        <Modal title="扫描本地书库" close={() => setShowImport(false)}>
          <p className="bs-muted">
            添加存放书籍的目录。后续扫描会更新书籍，并跳过重复内容。
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void call({ action: "import", paths: [importPath.trim()] })
                .then(() => {
                  setShowImport(false);
                  setImportPath("");
                  return refresh();
                })
                .catch(fail);
            }}
          >
            <label>
              本地目录或文件的绝对路径
              <input
                autoFocus
                placeholder="/Users/你的名字/Books"
                value={importPath}
                onChange={(e) => setImportPath(e.target.value)}
              />
            </label>
            {roots.length > 0 && (
              <div className="bs-roots">
                <small>已添加的扫描目录</small>
                {roots.map((root) => (
                  <p key={root}>
                    {root}
                    <button
                      type="button"
                      onClick={() =>
                        void call({ action: "removeRoot", path: root })
                          .then(refresh)
                          .catch(fail)
                      }
                    >
                      移除目录
                    </button>
                  </p>
                ))}
              </div>
            )}
            <footer>
              <button type="button" onClick={() => setShowImport(false)}>
                取消
              </button>
              <button
                className="bs-primary"
                disabled={!importPath.trim() || job?.running}
              >
                开始扫描
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}
export const inject = [
  "slots",
  "locale",
  "layout",
  "remote",
  "remote.session",
  "sessions",
  "uiWorkspace",
];
export async function apply(ctx: any) {
  const dispose = await ctx.remote.$mount(remoteInfo);
  ctx.effect(() => dispose);
  ctx.inject(["remote.bookshelf"], (ctx: any) => {
    const call: Call = async (input) => {
      const result = await ctx.remote.bookshelf.call(input);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    };
    ctx.effect(() =>
      ctx.locale.register("bookshelf", {
        zh: { panel: "书架" },
        en: { panel: "Bookshelf" },
      }),
    );
    const t = ctx.locale.bind("bookshelf");
    ctx.slots.inject("main", () =>
      ctx.slots.register(
        {
          name: "main",
          key: "bookshelf",
          locale: "bookshelf",
          inject: () => ({ ctx, call }),
        },
        Shelf,
      ),
    );
    ctx.slots.inject("sidebar.panellist", () =>
      ctx.slots.register(
        {
          name: "sidebar.panellist",
          id: "bookshelf",
          order: 6,
          label: () => t("panel"),
          locale: "bookshelf",
        },
        Glyph,
      ),
    );
  });
}
