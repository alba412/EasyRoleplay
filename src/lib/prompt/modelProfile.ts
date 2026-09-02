/**
 * モデル別プロファイル。
 *
 * OpenRouterのモデルIDは増減するので、完全一致ではなく系統で引く。
 * contextLimit は実測上限ではなく安全側の既定値で、全体設定の上限と
 * 小さい方を採って使う。
 */

export type ModelProfile = {
  /** 書き出し強制（プレフィル）が使えるか */
  supportsPrefill: boolean;
  systemRole: "system" | "user";
  contextLimit: number;
  extraSuffix?: string;
};

export const FALLBACK_MODEL_PROFILE: ModelProfile = {
  supportsPrefill: false,
  systemRole: "system",
  contextLimit: 32_000,
};

const PROFILES: { pattern: RegExp; profile: ModelProfile }[] = [
  // プレフィルが効くので、地の文で始めさせる書き出しを渡すと形式が安定する。
  // 指示を反復すると崩れやすいので、システムプロンプトは短く構造的に保つこと。
  {
    pattern: /deepseek/i,
    profile: { supportsPrefill: true, systemRole: "system", contextLimit: 64_000 },
  },
  {
    pattern: /nemotron/i,
    profile: { supportsPrefill: false, systemRole: "system", contextLimit: 128_000 },
  },
  {
    pattern: /claude|anthropic/i,
    profile: { supportsPrefill: true, systemRole: "system", contextLimit: 200_000 },
  },
  {
    pattern: /mistral|mixtral|magnum/i,
    profile: { supportsPrefill: true, systemRole: "system", contextLimit: 32_000 },
  },
  {
    pattern: /gpt|openai|o[34]-/i,
    profile: { supportsPrefill: false, systemRole: "system", contextLimit: 128_000 },
  },
  {
    pattern: /gemini|gemma/i,
    profile: { supportsPrefill: false, systemRole: "system", contextLimit: 128_000 },
  },
  {
    pattern: /llama|qwen|command-r/i,
    profile: { supportsPrefill: false, systemRole: "system", contextLimit: 128_000 },
  },
];

export function resolveModelProfile(model: string): ModelProfile {
  const matched = PROFILES.find(({ pattern }) => pattern.test(model));
  return matched ? matched.profile : FALLBACK_MODEL_PROFILE;
}
