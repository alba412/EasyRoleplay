import type { NextRequest } from "next/server";

import {
  OpenRouterError,
  streamChatCompletion,
  type ChatMessage,
} from "@/lib/llm/openrouter";
import { TEMPORARY_CHARACTER } from "@/lib/prompt/temporaryCharacter";

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

  try {
    const stream = await streamChatCompletion({
      messages: [
        { role: "system", content: TEMPORARY_CHARACTER.systemPrompt },
        ...history,
      ],
      signal: request.signal,
    });

    return new Response(stream, {
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
function parseHistory(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const messages: ChatMessage[] = [];
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

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
