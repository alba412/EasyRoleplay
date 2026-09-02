import ChatView from "@/components/chat/ChatView";
import { TEMPORARY_CHARACTER } from "@/lib/prompt/temporaryCharacter";

export default function Home() {
  // 実装順序4でカード読み込みに置き換わる。systemPrompt はクライアントへ渡さない。
  return (
    <ChatView
      characterName={TEMPORARY_CHARACTER.name}
      greeting={TEMPORARY_CHARACTER.greeting}
    />
  );
}
