/**
 * トークン数の概算。
 *
 * 日本語は英語の2〜3倍消費する。tiktokenはモデル横断では当てにならないので、
 * 文字数 × 1.5 を概算とし、APIレスポンスの実測値で比率を補正して使う。
 */

export const DEFAULT_TOKENS_PER_CHAR = 1.5;

export function estimateTokens(
  text: string,
  tokensPerChar: number = DEFAULT_TOKENS_PER_CHAR,
): number {
  // サロゲートペアを1文字として数える
  return Math.ceil([...text].length * tokensPerChar);
}

export function estimateMessagesTokens(
  messages: { content: string }[],
  tokensPerChar: number = DEFAULT_TOKENS_PER_CHAR,
): number {
  return messages.reduce(
    (total, message) => total + estimateTokens(message.content, tokensPerChar),
    0,
  );
}

/** APIが返した実測トークン数から、次回以降に使う比率を求める */
export function calibrateTokensPerChar(
  text: string,
  actualTokens: number,
): number {
  const length = [...text].length;
  if (length === 0 || actualTokens <= 0) return DEFAULT_TOKENS_PER_CHAR;
  return actualTokens / length;
}
