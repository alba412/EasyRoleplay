/**
 * 全体設定。カードごとに変わらないものはここに置く。
 * カードに項目を増やす前に「カードごとに変わるか?」を問うこと。
 */

/** 地の文とセリフの比率 */
export const NARRATION_RATIOS = [
  "dialogueHeavy",
  "balanced",
  "narrationHeavy",
] as const;
export type NarrationRatio = (typeof NARRATION_RATIOS)[number];

export const RESPONSE_LENGTHS = ["short", "normal", "long"] as const;
export type ResponseLength = (typeof RESPONSE_LENGTHS)[number];

/** 地の文の書き方 */
export const NARRATION_STYLES = ["italic", "plain", "outsideQuotes"] as const;
export type NarrationStyle = (typeof NARRATION_STYLES)[number];

export type AppSettings = {
  narrationRatio: NarrationRatio;
  responseLength: ResponseLength;
  narrationStyle: NarrationStyle;
  model: string;
  temperature: number;
  contextLimit: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  narrationRatio: "balanced",
  responseLength: "normal",
  narrationStyle: "plain",
  model: "deepseek/deepseek-chat",
  temperature: 0.9,
  contextLimit: 16000,
};

export const NARRATION_RATIO_RULES: Record<NarrationRatio, string> = {
  dialogueHeavy: "セリフを主体にし、地の文は短く添える程度にする",
  balanced: "地の文とセリフを同じくらいの分量で書く",
  narrationHeavy: "地の文で情景と仕草を厚く描き、セリフは要所に置く",
};

export const RESPONSE_LENGTH_RULES: Record<ResponseLength, string> = {
  short: "1回の応答は1〜2文に収める",
  normal: "1回の応答は3〜5文に収める",
  long: "1回の応答は6〜10文程度で書く",
};

export const NARRATION_STYLE_RULES: Record<NarrationStyle, string> = {
  italic: "地の文は * で囲み、セリフは「」で囲む",
  plain: "地の文は装飾せずそのまま書き、セリフは「」で囲む",
  outsideQuotes: "セリフは「」の中だけに書き、「」の外は全て地の文として書く",
};

/** 応答のために空けておくトークン数。履歴をどこまで載せるかの計算に使う */
export const RESPONSE_TOKEN_RESERVE: Record<ResponseLength, number> = {
  short: 400,
  normal: 800,
  long: 1600,
};
