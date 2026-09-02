import { describe, expect, it } from "vitest";

import { decodeIndexTags, toCardIndex } from "./index";
import { cardSchema, safeParseCard, type Card } from "./schema";

const ID = "0b4b3a3c-6a4b-4f3a-8d2f-9a1b2c3d4e5f";

function characterInput(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    mode: "character",
    name: "水無瀬 灯",
    summary: "写真部の後輩。素直じゃない",
    tags: ["女の子", "後輩", "ツンデレ"],
    safety: "safe",
    ...overrides,
  };
}

function worldInput(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    mode: "world",
    name: "灰の街",
    summary: "魔法が禁じられた都市で動く群像劇",
    tags: ["ファンタジー", "群像劇"],
    safety: "sensitive",
    ...overrides,
  };
}

describe("必須項目", () => {
  it("共通4項目 + id + mode だけで通る", () => {
    const card = cardSchema.parse(characterInput());
    expect(card.mode).toBe("character");
    expect(card.name).toBe("水無瀬 灯");
  });

  it.each(["name", "summary", "safety"])("%s が無いと落ちる", (field) => {
    const input = characterInput();
    delete (input as Record<string, unknown>)[field];
    expect(safeParseCard(input).success).toBe(false);
  });

  it("タグが空配列だと落ちる", () => {
    expect(safeParseCard(characterInput({ tags: [] })).success).toBe(false);
  });

  it("タグが空文字だけでも落ちる", () => {
    expect(safeParseCard(characterInput({ tags: ["", "  "] })).success).toBe(false);
  });

  it("id がUUIDでないと落ちる", () => {
    expect(safeParseCard(characterInput({ id: "card-1" })).success).toBe(false);
  });

  it("safety が定義外だと落ちる", () => {
    expect(safeParseCard(characterInput({ safety: "r18" })).success).toBe(false);
  });

  it("未知の mode は落ちる", () => {
    expect(safeParseCard(characterInput({ mode: "group" })).success).toBe(false);
  });
});

describe("任意項目の正規化", () => {
  it("空欄の任意項目は undefined になる", () => {
    const card = cardSchema.parse(
      characterInput({ personality: "   ", background: "" }),
    ) as Extract<Card, { mode: "character" }>;
    expect(card.personality).toBeUndefined();
    expect(card.background).toBeUndefined();
  });

  it("任意の配列は既定で空になる", () => {
    const card = cardSchema.parse(characterInput()) as Extract<
      Card,
      { mode: "character" }
    >;
    expect(card.greetings).toEqual([]);
    expect(card.dialogueExamples).toEqual([]);
    expect(card.appearanceTags).toEqual([]);
  });

  it("タグは前後の空白を落として重複を除く", () => {
    const card = cardSchema.parse(
      characterInput({ tags: [" 後輩 ", "後輩", "ツンデレ"] }),
    );
    expect(card.tags).toEqual(["後輩", "ツンデレ"]);
  });

  it("絵師タグは先頭の @ を外して保存する", () => {
    const card = cardSchema.parse(
      characterInput({ artistTags: ["@sakimichan", "sakimichan", " @wlop "] }),
    );
    // @ の付与は画像生成プロンプトを組む側の仕事なので、保存側では持たない
    expect(card.artistTags).toEqual(["sakimichan", "wlop"]);
  });

  it("空文字の挨拶は捨てる", () => {
    const card = cardSchema.parse(
      characterInput({ greetings: ["やあ", "  ", ""] }),
    ) as Extract<Card, { mode: "character" }>;
    expect(card.greetings).toEqual(["やあ"]);
  });
});

describe("dialogueExamples", () => {
  it("状況と発話の対で受け取る", () => {
    const card = cardSchema.parse(
      characterInput({
        dialogueExamples: [
          { situation: "挨拶", line: "……ども。今日も来たんだ、先輩" },
        ],
      }),
    ) as Extract<Card, { mode: "character" }>;
    expect(card.dialogueExamples[0]?.situation).toBe("挨拶");
  });

  it("状況ラベルが無いと落ちる", () => {
    const result = safeParseCard(
      characterInput({ dialogueExamples: [{ line: "……ども" }] }),
    );
    expect(result.success).toBe(false);
  });
});

describe("world モード", () => {
  it("キャラ用の項目を持たずに通る", () => {
    const card = cardSchema.parse(
      worldInput({
        worldRules: "魔法の使用は登録者に限られる",
        castMembers: [{ name: "門番", appearanceTags: ["armor", "helmet"] }],
      }),
    ) as Extract<Card, { mode: "world" }>;
    expect(card.mode).toBe("world");
    expect(card.castMembers[0]?.name).toBe("門番");
    expect(card.castMembers[0]?.description).toBeUndefined();
  });
});

describe("インデックス行", () => {
  it("Prismaのテーブル定義に載る形へ落とせる", () => {
    const card = cardSchema.parse(characterInput());
    const row = toCardIndex(card, "cards/akari.png");

    expect(row).toEqual({
      id: ID,
      mode: "character",
      name: "水無瀬 灯",
      summary: "写真部の後輩。素直じゃない",
      safety: "safe",
      tags: JSON.stringify(["女の子", "後輩", "ツンデレ"]),
      filePath: "cards/akari.png",
    });
  });

  it("tags は配列に戻せる", () => {
    const card = cardSchema.parse(characterInput());
    const row = toCardIndex(card, "cards/akari.png");
    expect(decodeIndexTags(row.tags)).toEqual(card.tags);
  });

  it("壊れた tags でも一覧を落とさない", () => {
    expect(decodeIndexTags("{壊れている")).toEqual([]);
    expect(decodeIndexTags('"配列ではない"')).toEqual([]);
  });
});
