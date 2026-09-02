"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatViewProps = {
  characterName: string;
  greeting: string;
};

const MAX_COMPOSER_HEIGHT = 200;

export default function ChatView({ characterName, greeting }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: "greeting", role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [input]);

  function nextId() {
    idRef.current += 1;
    return `m${idRef.current}`;
  }

  function appendToMessage(id: string, chunk: string) {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === id
          ? { ...message, content: message.content + chunk }
          : message,
      ),
    );
  }

  async function send() {
    const text = input.trim();
    if (text === "" || isStreaming) return;

    const userMessage: Message = { id: nextId(), role: "user", content: text };
    const history = [...messages, userMessage].map(({ role, content }) => ({
      role,
      content,
    }));
    const assistantId = nextId();

    setInput("");
    setError(null);
    setMessages((previous) => [
      ...previous,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(await readErrorMessage(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) appendToMessage(assistantId, chunk);
      }
    } catch (caught) {
      // 停止ボタンによる中断は失敗ではない。そこまでの本文は残す
      if (!isAbortError(caught)) {
        setError(
          caught instanceof Error
            ? caught.message
            : "応答の取得に失敗しました。",
        );
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      // 1文字も返らなかった空の吹き出しは残さない
      setMessages((previous) =>
        previous.filter(
          (message) => message.id !== assistantId || message.content !== "",
        ),
      );
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;

    // IMEの変換確定Enterを送信と誤認しないこと。日本語アプリの第一印象がここで決まる。
    // keyCode 229 は isComposing が立たない環境向けの保険。
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    event.preventDefault();
    void send();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-black/10 px-4 py-3 dark:border-white/10">
        <h1 className="text-sm font-semibold">{characterName}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isStreaming && <StreamingIndicator messages={messages} />}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          {error && (
            <p
              role="alert"
              className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="メッセージを入力（Shift+Enterで改行）"
              className="flex-1 resize-none rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
              >
                停止
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void send()}
                disabled={input.trim() === ""}
                className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
              >
                送信
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-foreground text-background"
            : "bg-black/5 dark:bg-white/10",
        ].join(" ")}
      >
        {message.content}
      </div>
    </div>
  );
}

/** 1文字目が届くまでの間だけ、待っていることを示す */
function StreamingIndicator({ messages }: { messages: Message[] }) {
  const last = messages[messages.length - 1];
  if (last && last.role === "assistant" && last.content !== "") return null;
  return <p className="text-sm text-black/40 dark:text-white/40">…</p>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // JSON で返らないケースは既定のメッセージにする
  }
  return `応答の取得に失敗しました（${response.status}）。`;
}

function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === "AbortError";
}
