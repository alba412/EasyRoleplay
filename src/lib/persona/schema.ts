import { z } from "zod";

/**
 * ペルソナ。ユーザー自身の設定。
 * 画像生成プロンプトには渡さない（渡すのはカード側の外見タグだけ）。
 */
export const personaSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "入力してください"),
  description: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
});

export type Persona = z.infer<typeof personaSchema>;
