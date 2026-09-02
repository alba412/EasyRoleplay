import type { CharacterCard, Card, WorldCard } from "@/lib/card/schema";
import type { WorldInfoEntry } from "@/lib/card/worldInfo";
import type { Persona } from "@/lib/persona/schema";

import type { ModelProfile } from "./modelProfile";
import {
  NARRATION_RATIO_RULES,
  NARRATION_STYLE_RULES,
  RESPONSE_LENGTH_RULES,
  RESPONSE_TOKEN_RESERVE,
  type AppSettings,
} from "./settings";
import { estimateTokens } from "./tokens";

/**
 * 構造化データ → プロンプト文字列のコンパイル層。
 *
 * ここは純粋関数に保つこと。API通信もDB操作もしない。
 * この層を独立させておくことで、プロンプトの改善が既存カード全部に効く。
 */

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PromptMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CompileInput = {
  card: Card;
  persona?: Persona | null;
  settings: AppSettings;
  /** 1通目のgreetingを含む会話履歴。長すぎる場合は古い方から落とす */
  history: ConversationMessage[];
  worldInfo?: WorldInfoEntry[];
  modelProfile: ModelProfile;
};

export type CompiledPrompt = {
  messages: PromptMessage[];
  /** モデルが対応していれば、応答の書き出しとして渡す */
  prefill?: string;
};

/** World Info の発火判定で見る直近メッセージ数 */
const WORLD_INFO_SCAN_MESSAGES = 6;

export function compilePrompt(input: CompileInput): CompiledPrompt {
  const { card, persona, settings, history, modelProfile } = input;

  const firedWorldInfo = selectWorldInfo(input.worldInfo ?? [], history);
  const systemPrompt = buildSystemPrompt({
    card,
    persona,
    settings,
    firedWorldInfo,
    modelProfile,
  });

  const budget = historyBudget(systemPrompt, settings, modelProfile);
  const messages: PromptMessage[] = [
    { role: modelProfile.systemRole, content: systemPrompt },
    ...selectHistory(history, budget),
  ];

  return { messages, prefill: buildPrefill(settings, modelProfile) };
}

// ---------------------------------------------------------------- system

type SystemPromptInput = {
  card: Card;
  persona?: Persona | null;
  settings: AppSettings;
  firedWorldInfo: WorldInfoEntry[];
  modelProfile: ModelProfile;
};

/**
 * 組み立て順は 役割定義 → キャラ定義 → World Info → ペルソナ → 出力ルール。
 * 出力ルールを末尾に置くこと。LLMは末尾の指示に最も強く従う。
 */
function buildSystemPrompt(input: SystemPromptInput): string {
  const { card, persona, settings, firedWorldInfo, modelProfile } = input;

  return joinSections([
    buildRoleDefinition(card),
    card.mode === "character"
      ? buildCharacterDefinition(card)
      : buildWorldDefinition(card),
    buildWorldInfoSection(firedWorldInfo),
    buildPersonaSection(persona),
    buildOutputRules(card, settings),
    modelProfile.extraSuffix,
  ]);
}

function buildRoleDefinition(card: Card): string {
  return card.mode === "character"
    ? "あなたは対話型ロールプレイの演者です。以下のキャラクターとして、ユーザーと一対一の会話を演じてください。"
    : "あなたはこのロールプレイのゲームマスターです。以下の世界設定に従って場面を描写し、登場人物を演じてください。";
}

function buildCharacterDefinition(card: CharacterCard): string {
  // 外見タグ（appearanceTags / artistTags）は画像生成用なのでLLMには渡さない
  const header = joinLines([
    `名前: ${card.name}`,
    card.firstPerson && `一人称: ${card.firstPerson}`,
    card.secondPerson && `ユーザーの呼び方: ${card.secondPerson}`,
  ]);

  return joinSections([
    joinLines(["# キャラクター", "", header]),
    section("## 口調", card.speechStyle),
    section("## 性格", card.personality),
    section("## 背景", card.background),
    section("## ユーザーとの関係", card.relationship),
    section("## 状況", card.scenario),
    section("## 会話例", formatDialogueExamples(card)),
    section("## やってはいけないこと", formatBullets(card.ngBehaviors)),
  ]);
}

function buildWorldDefinition(card: WorldCard): string {
  return joinSections([
    joinLines(["# 世界", "", `名前: ${card.name}`]),
    section("## 世界のルール", card.worldRules),
    section("## 初期状況", card.initialSituation),
    section("## 登場人物", formatCastMembers(card)),
  ]);
}

/**
 * 状況ラベル付きで出す。ラベルが無いとLLMは口調の混在と解釈して混ぜ始める。
 */
function formatDialogueExamples(card: CharacterCard): string | undefined {
  if (card.dialogueExamples.length === 0) return undefined;
  return card.dialogueExamples
    .map((example) => `[${example.situation}]「${example.line}」`)
    .join("\n");
}

function formatCastMembers(card: WorldCard): string | undefined {
  if (card.castMembers.length === 0) return undefined;
  // appearanceTags は画像生成用なので混ぜない
  return card.castMembers
    .map((member) =>
      joinLines([`### ${member.name}`, member.description]),
    )
    .join("\n\n");
}

function buildWorldInfoSection(entries: WorldInfoEntry[]): string | undefined {
  if (entries.length === 0) return undefined;
  const body = entries
    .map((entry) => joinLines([`## ${entry.keys[0] ?? "設定"}`, entry.content]))
    .join("\n\n");
  return joinSections(["# 補足設定", body]);
}

function buildPersonaSection(persona?: Persona | null): string | undefined {
  if (!persona) return undefined;
  return joinSections([
    joinLines(["# ユーザー", "", `名前: ${persona.name}`]),
    persona.description,
  ]);
}

/**
 * 出力ルールは末尾に置き、一人称と二人称を再掲する。
 * 2番目のキャラ定義に書いていても、履歴が伸びると流されるため。
 */
function buildOutputRules(card: Card, settings: AppSettings): string {
  const rules: (string | undefined)[] = [];

  if (card.mode === "character") {
    rules.push(restatePersonRule(card));
    rules.push(
      `${card.name}のセリフと描写だけを書く。ユーザーの発言や心情を代弁しない`,
    );
    if (card.dialogueExamples.length > 0) {
      rules.push("会話例の状況ラベル（[...]）は出力しない");
    }
  } else {
    rules.push("場面の描写と登場人物のセリフを書く。ユーザーの行動を勝手に決めない");
  }

  rules.push(NARRATION_STYLE_RULES[settings.narrationStyle]);
  rules.push(NARRATION_RATIO_RULES[settings.narrationRatio]);
  rules.push(RESPONSE_LENGTH_RULES[settings.responseLength]);

  return joinSections(["# 出力ルール", formatBullets(rules)]);
}

function restatePersonRule(card: CharacterCard): string | undefined {
  const parts = [
    card.firstPerson && `一人称は「${card.firstPerson}」`,
    card.secondPerson && `ユーザーの呼び方は「${card.secondPerson}」`,
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return undefined;
  return `${parts.join("、")}。会話が長くなっても変えない`;
}

// ---------------------------------------------------------------- world info

/** alwaysOn と、直近の会話にキーが出たものだけを priority 順で返す */
function selectWorldInfo(
  entries: WorldInfoEntry[],
  history: ConversationMessage[],
): WorldInfoEntry[] {
  if (entries.length === 0) return [];

  const recent = history
    .slice(-WORLD_INFO_SCAN_MESSAGES)
    .map((message) => message.content)
    .join("\n");

  return entries
    .filter(
      (entry) =>
        entry.alwaysOn || entry.keys.some((key) => recent.includes(key)),
    )
    .sort((a, b) => b.priority - a.priority);
}

// ---------------------------------------------------------------- history

function historyBudget(
  systemPrompt: string,
  settings: AppSettings,
  modelProfile: ModelProfile,
): number {
  const limit = Math.min(settings.contextLimit, modelProfile.contextLimit);
  const reserved =
    estimateTokens(systemPrompt) + RESPONSE_TOKEN_RESERVE[settings.responseLength];
  return Math.max(0, limit - reserved);
}

/**
 * 予算に収まる分だけ新しい方から採る。
 * 1通目のgreetingは会話の調子を決めるので落とさない。
 * 最新の1通は予算を超えても必ず残す（残さないと会話が成立しないため）。
 */
function selectHistory(
  history: ConversationMessage[],
  budget: number,
): ConversationMessage[] {
  if (history.length === 0) return [];

  const pinned = history[0].role === "assistant" ? history.slice(0, 1) : [];
  const rest = history.slice(pinned.length);

  let used = pinned.reduce(
    (total, message) => total + estimateTokens(message.content),
    0,
  );

  const kept: ConversationMessage[] = [];
  for (let index = rest.length - 1; index >= 0; index -= 1) {
    const message = rest[index];
    const cost = estimateTokens(message.content);
    if (kept.length > 0 && used + cost > budget) break;
    used += cost;
    kept.unshift(message);
  }

  return [...pinned, ...kept];
}

// ---------------------------------------------------------------- prefill

/**
 * 書き出しを渡して形式を安定させる。
 * 地の文の目印がある書き方のときだけ効くので、それ以外では渡さない。
 */
function buildPrefill(
  settings: AppSettings,
  modelProfile: ModelProfile,
): string | undefined {
  if (!modelProfile.supportsPrefill) return undefined;
  return settings.narrationStyle === "italic" ? "*" : undefined;
}

// ---------------------------------------------------------------- helpers

/** 中身が無い見出しは、見出しごと出さない。トークンを無駄にしない */
function section(heading: string, body?: string): string | undefined {
  return body ? `${heading}\n${body}` : undefined;
}

function joinSections(parts: (string | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join("\n\n");
}

function joinLines(lines: (string | undefined | false)[]): string {
  return lines.filter((line): line is string => typeof line === "string").join("\n");
}

function formatBullets(items: (string | undefined)[]): string | undefined {
  const bullets = items.filter((item): item is string => Boolean(item));
  if (bullets.length === 0) return undefined;
  return bullets.map((item) => `- ${item}`).join("\n");
}
