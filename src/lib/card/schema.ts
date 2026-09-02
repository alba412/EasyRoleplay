import { z } from "zod";

/**
 * カードスキーマ。
 *
 * 投稿者に書かせる構造化データの形をここで一本化する。
 * プロンプト文字列への変換は lib/prompt/ の仕事で、このモジュールは持たない。
 *
 * avatar（PNG本体）はこのスキーマに含めない。カードはPNGが正で、
 * このスキーマはそのtEXtチャンクに埋め込むJSONの形を定義するもの。
 */

export const SAFETY_LEVELS = ["safe", "sensitive", "nsfw", "explicit"] as const;
export const CARD_MODES = ["character", "world"] as const;

export const safetySchema = z.enum(SAFETY_LEVELS);
export const cardModeSchema = z.enum(CARD_MODES);

export type Safety = z.infer<typeof safetySchema>;
export type CardMode = z.infer<typeof cardModeSchema>;

const requiredText = z.string().trim().min(1, "入力してください");

/**
 * 任意項目の空欄は undefined に落とす。
 * 「空欄は見出しごとプロンプトに出さない」判定を、コンパイル層で
 * 空文字とundefinedの両方を気にせず書けるようにするため。
 */
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

/** 空文字を捨てて重複を除いたタグ配列。任意項目なので既定は空配列 */
const tagList = z
  .array(z.string())
  .default([])
  .transform((tags) => {
    const trimmed = tags.map((tag) => tag.trim()).filter((tag) => tag !== "");
    return [...new Set(trimmed)];
  });

/** 絵師タグは `@` を付けずに保存する。付与は画像生成プロンプトを組む側の仕事 */
const artistTagList = z
  .array(z.string())
  .default([])
  .transform((tags) => {
    const normalized = tags
      .map((tag) => tag.trim().replace(/^@+/, "").trim())
      .filter((tag) => tag !== "");
    return [...new Set(normalized)];
  });

const textList = z
  .array(z.string())
  .default([])
  .transform((lines) => lines.map((line) => line.trim()).filter((line) => line !== ""));

/**
 * 状況ラベル付きの会話例。
 * ラベルが無いとLLMは口調を混在と解釈して混ぜ始めるため、対で持つことに意味がある。
 */
export const dialogueExampleSchema = z.object({
  /** 「褒められた」「心配している」など。自由記述 */
  situation: requiredText,
  line: requiredText,
});

export const castMemberSchema = z.object({
  name: requiredText,
  description: optionalText,
  appearanceTags: tagList,
});

const commonFields = {
  id: z.uuid(),
  name: requiredText,
  summary: requiredText,
  /** pixiv系語彙。chubのタグ体系は輸入しない */
  tags: z
    .array(z.string())
    .min(1, "タグを1つ以上つけてください")
    .transform((tags) => {
      const trimmed = tags.map((tag) => tag.trim()).filter((tag) => tag !== "");
      return [...new Set(trimmed)];
    })
    .refine((tags) => tags.length > 0, "タグを1つ以上つけてください"),
  safety: safetySchema,
  /** 画像生成用。LLMには渡さない */
  appearanceTags: tagList,
  artistTags: artistTagList,
};

export const characterCardSchema = z.object({
  ...commonFields,
  mode: z.literal("character"),
  /** 一人称 */
  firstPerson: optionalText,
  /** 二人称（ユーザーの呼び方）。単一値 */
  secondPerson: optionalText,
  /** 語尾・敬語レベル・方言 */
  speechStyle: optionalText,
  dialogueExamples: z.array(dialogueExampleSchema).default([]),
  personality: optionalText,
  background: optionalText,
  /** ユーザーとの関係・距離感 */
  relationship: optionalText,
  scenario: optionalText,
  /** 初回メッセージ。複数から選べる */
  greetings: textList,
  /** NG行動（キャラ崩壊防止） */
  ngBehaviors: textList,
});

export const worldCardSchema = z.object({
  ...commonFields,
  mode: z.literal("world"),
  worldRules: optionalText,
  initialSituation: optionalText,
  castMembers: z.array(castMemberSchema).default([]),
  openingText: optionalText,
});

export const cardSchema = z.discriminatedUnion("mode", [
  characterCardSchema,
  worldCardSchema,
]);

export type DialogueExample = z.infer<typeof dialogueExampleSchema>;
export type CastMember = z.infer<typeof castMemberSchema>;
export type CharacterCard = z.infer<typeof characterCardSchema>;
export type WorldCard = z.infer<typeof worldCardSchema>;
export type Card = z.infer<typeof cardSchema>;

/** 入力側の型。既定値や正規化がかかる前の形 */
export type CardInput = z.input<typeof cardSchema>;

export function parseCard(value: unknown): Card {
  return cardSchema.parse(value);
}

export function safeParseCard(value: unknown) {
  return cardSchema.safeParse(value);
}
