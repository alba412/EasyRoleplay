/**
 * OpenRouter アダプタ。
 *
 * ブラウザから直接叩くと CORS とAPIキー露出の両方に引っかかるため、
 * このモジュールはサーバ側（Route Handler）からのみ import すること。
 */

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

/** 環境変数で上書きできる。OpenRouter のモデル一覧にあるIDを指定する。 */
const DEFAULT_MODEL = "deepseek/deepseek-chat";
const DEFAULT_TEMPERATURE = 0.9;

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export class OpenRouterError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

type StreamOptions = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
};

/**
 * 応答をストリーミングで受け取り、本文の差分だけを流すストリームに変換して返す。
 * SSE の枠組みはここで剥がすので、呼び出し側は素のテキストとして扱える。
 */
export async function streamChatCompletion(
  options: StreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY が設定されていません。.env.local に追加して開発サーバを再起動してください。",
      500,
    );
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // OpenRouter のダッシュボードでの識別用。必須ではない。
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": "EasyRoleplay",
    },
    body: JSON.stringify({
      model: options.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      stream: true,
    }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    throw new OpenRouterError(await readErrorMessage(response), response.status);
  }

  return toTextStream(response.body);
}

async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // JSON でないエラー本文はそのまま扱う
  }
  return body.trim() || `OpenRouter が ${response.status} を返しました。`;
}

type SseEvent =
  | { kind: "delta"; text: string }
  | { kind: "done" }
  | { kind: "ignore" };

function parseSseLine(line: string): SseEvent {
  // `: OPENROUTER PROCESSING` のようなコメント行と空行は読み飛ばす
  if (line === "" || line.startsWith(":")) {
    return { kind: "ignore" };
  }
  if (!line.startsWith("data:")) {
    return { kind: "ignore" };
  }

  const payload = line.slice("data:".length).trim();
  if (payload === "[DONE]") {
    return { kind: "done" };
  }

  let parsed: {
    error?: { message?: string };
    choices?: { delta?: { content?: string | null } }[];
  };
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { kind: "ignore" };
  }

  if (parsed.error) {
    // ストリーム開始後にモデル側の都合で失敗することがある
    throw new OpenRouterError(
      parsed.error.message ?? "生成中にOpenRouter側でエラーが発生しました。",
      502,
    );
  }

  const text = parsed.choices?.[0]?.delta?.content;
  return text ? { kind: "delta", text } : { kind: "ignore" };
}

function toTextStream(
  source: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = source.getReader();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });

          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            const line = buffer.slice(0, newline).trimEnd();
            buffer = buffer.slice(newline + 1);

            const event = parseSseLine(line);
            if (event.kind === "done") {
              controller.close();
              await reader.cancel();
              return;
            }
            if (event.kind === "delta") {
              controller.enqueue(encoder.encode(event.text));
            }

            newline = buffer.indexOf("\n");
          }

          // 1回の pull で最低1チャンクは流し、無ければ次の read へ進む
          if (controller.desiredSize !== null && controller.desiredSize <= 0) {
            return;
          }
        }
      } catch (error) {
        await reader.cancel().catch(() => {});
        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => {});
    },
  });
}
