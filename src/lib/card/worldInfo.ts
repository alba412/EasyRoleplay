import { z } from "zod";

/**
 * World Info。会話に出てきた語をきっかけに、必要なときだけ設定を差し込む。
 * 差し込む判断（発火）はコンパイル層の仕事で、ここは形の定義だけを持つ。
 */
export const worldInfoEntrySchema = z.object({
  /** この語が最近の会話に出たら発火する */
  keys: z.array(z.string().trim().min(1)).default([]),
  content: z.string().trim().min(1),
  /** 大きいものから先に出す */
  priority: z.number().int().default(0),
  /** キーに関係なく常に出す */
  alwaysOn: z.boolean().default(false),
});

export type WorldInfoEntry = z.infer<typeof worldInfoEntrySchema>;
