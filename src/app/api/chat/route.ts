import type { NextRequest } from "next/server";

import { TEMPORARY_CARD } from "@/lib/card/temporaryCard";
import {
  OpenRouterError,
  streamChatCompletion,
} from "@/lib/llm/openrouter";
import { compilePrompt, type ConversationMessage } from "@/lib/prompt/compile";
import { resolveModelProfile } from "@/lib/prompt/modelProfile";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/prompt/settings";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages?: unknown;
};

export async function POST(request: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return errorResponse("リクエストの形式が不正です。", 400);
  }

  const history = parseHistory(body.messages);
  if (!history) {
    return errorResponse("messages の形式が不正です。", 400);
  }
  if (history.length === 0) {
    return errorResponse("送信するメッセージがありません。", 400);
  }

  // 全体設定の画面はまだ無いので既定値を使う
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    model: process.env.OPENROUTER_MODEL || DEFAULT_SETTINGS.model,
  };
  const modelProfile = resolveModelProfile(settings.model);

  // カード管理UIができるまでは決め打ちカードを使う
  const { messages, prefill } = compilePrompt({
    card: TEMPORARY_CARD,
    settings,
    history,
    modelProfile,
  });

  try {
    const upstream = await streamChatCompletion({
      // プレフィルは書きかけの応答としてモデルに渡す
      messages: prefill
        ? [...messages, { role: "assistant", content: prefill }]
        : messages,
      model: settings.model,
      temperature: settings.temperature,
      signal: request.signal,
    });

    return new Response(prefill ? withPrefix(upstream, prefill) : upstream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // リバースプロキシ越しでもストリームが途中で溜め込まれないように
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return errorResponse(error.message, error.status);
    }
    console.error("[api/chat] 予期しないエラー", error);
    return errorResponse("応答の取得に失敗しました。", 500);
  }
}

/** 会話履歴として受け付けられる形だけを通す。system はクライアントから受け取らない。 */
function parseHistory(value: unknown): ConversationMessage[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const messages: ConversationMessage[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return null;
    }
    if (typeof content !== "string") {
      return null;
    }
    if (content.trim() === "") {
      continue;
    }
    messages.push({ role, content });
  }
  return messages;
}

/** プレフィルはモデルの応答に含まれないので、こちらで先頭に足して返す */
function withPrefix(
  stream: ReadableStream<Uint8Array>,
  prefix: string,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  let sentPrefix = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!sentPrefix) {
        sentPrefix = true;
        controller.enqueue(new TextEncoder().encode(prefix));
        return;
      }
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(value);
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => {});
    },
  });
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
