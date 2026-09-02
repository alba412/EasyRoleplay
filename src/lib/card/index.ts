import type { CardCreateInput } from "@/generated/prisma/models";

import type { Card } from "./schema";

export * from "./schema";

/**
 * カードのインデックス行を作る。
 *
 * DBが持つのは一覧と検索に要る項目だけ。本文はPNG（filePath）から読み直す。
 * ここが Zod のカードスキーマと Prisma のテーブル定義の接合点になる。
 */
export function toCardIndex(card: Card, filePath: string): CardCreateInput {
  return {
    id: card.id,
    mode: card.mode,
    name: card.name,
    summary: card.summary,
    safety: card.safety,
    // SQLiteに配列型が無いためJSON文字列で持つ（実装順序7で String[] になる）
    tags: JSON.stringify(card.tags),
    filePath,
  };
}

/**
 * インデックス行の tags を配列に戻す。
 * 壊れた行があっても一覧全体を落とさないよう、失敗時は空配列を返す。
 */
export function decodeIndexTags(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}
