import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs";
import type { ReviewCard, ReviewStats } from "../types";
const scheduler = fsrs({ enable_fuzz: true });
// 学习阶段的卡片在 20 分钟内到期也提前出现，免得复习时反复等待。
const LEARN_AHEAD = 20 * 60 * 1000;
export type CollectInput = Pick<
  ReviewCard,
  "kind" | "front" | "back" | "context" | "term" | "sense" | "source"
>;
const memoryOf = (card: Card): ReviewCard["memory"] => ({
  stability: card.stability,
  difficulty: card.difficulty,
  scheduled_days: card.scheduled_days,
  learning_steps: card.learning_steps,
  reps: card.reps,
  lapses: card.lapses,
  state: card.state,
  last_review: card.last_review?.getTime() ?? null,
});
const cardOf = (c: ReviewCard) => ({
  ...c.memory,
  due: c.due,
  last_review: c.memory.last_review,
});
export class ReviewDeck {
  cards: ReviewCard[] = [];
  private writes = Promise.resolve();
  constructor(readonly root: string) {}
  async load() {
    try {
      const value = JSON.parse(
        await readFile(path.join(this.root, "review.json"), "utf8"),
      );
      if (value.version !== 1) throw new Error("复习数据版本与插件版本不匹配");
      this.cards = value.cards;
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  private persist() {
    const snapshot = JSON.stringify({ version: 1, cards: this.cards });
    const run = this.writes
      .catch(() => {})
      .then(async () => {
        const target = path.join(this.root, "review.json");
        await writeFile(target + ".tmp", snapshot);
        await rename(target + ".tmp", target);
      });
    this.writes = run;
    return run;
  }
  stats(now = Date.now()): ReviewStats {
    const later = this.cards
      .filter((c) => c.due > now + LEARN_AHEAD)
      .map((c) => c.due);
    return {
      total: this.cards.length,
      due: this.cards.length - later.length,
      next: later.length ? Math.min(...later) : null,
    };
  }
  /** due 为 true 时只返回到期卡片，并附上四种评分后的到期时间。 */
  list(due: boolean, now = Date.now()): ReviewCard[] {
    const cards = this.cards
      .filter((c) => !due || c.due <= now + LEARN_AHEAD)
      .sort((a, b) => a.due - b.due);
    if (!due) return cards;
    return cards.map((c) => {
      const preview = scheduler.repeat(cardOf(c), now);
      return {
        ...c,
        preview: ([1, 2, 3, 4] as Grade[]).map((r) =>
          preview[r].card.due.getTime(),
        ),
      };
    });
  }
  async collect(input: CollectInput) {
    const front = input.front.trim();
    if (!front) throw new Error("收藏内容为空");
    // 同一个词的同一义项只保留一张卡，同一段摘录按出处区分；再次收藏只补充内容，不重置进度。
    const sense = input.sense?.trim() || "";
    const existing = this.cards.find((c) =>
      input.kind === "word"
        ? c.kind === "word" &&
          c.front.toLocaleLowerCase() === front.toLocaleLowerCase() &&
          (c.sense || "") === sense
        : c.kind === "passage" &&
          c.front === front &&
          c.source?.bookId === input.source?.bookId &&
          c.source?.block === input.source?.block,
    );
    if (existing) {
      if (input.back.trim()) existing.back = input.back;
      if (!existing.context && input.context) {
        existing.context = input.context;
        existing.term = input.term;
      }
      existing.source ??= input.source;
      await this.persist();
      return { card: existing, created: false };
    }
    const now = Date.now();
    const card: ReviewCard = {
      id: randomUUID(),
      kind: input.kind,
      front,
      back: input.back,
      context: input.context,
      term: input.term,
      sense,
      source: input.source,
      createdAt: now,
      due: now,
      memory: memoryOf(createEmptyCard(now)),
    };
    this.cards.push(card);
    await this.persist();
    return { card, created: true };
  }
  async grade(id: string, rating: number) {
    const card = this.cards.find((c) => c.id === id);
    if (!card) throw new Error("卡片不存在");
    if (![1, 2, 3, 4].includes(rating)) throw new Error("评分无效");
    const next = scheduler.next(cardOf(card), Date.now(), rating as Grade).card;
    card.due = next.due.getTime();
    card.memory = memoryOf(next);
    await this.persist();
    return card;
  }
  async remove(id: string) {
    this.cards = this.cards.filter((c) => c.id !== id);
    await this.persist();
  }
  async dispose() {
    await this.writes;
  }
}
