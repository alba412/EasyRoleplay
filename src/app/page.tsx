import { pickGreeting } from "@/lib/card";
import { TEMPORARY_CARD } from "@/lib/card/temporaryCard";
import ChatView from "@/components/chat/ChatView";

export default function Home() {
  // 実装順序4でカード読み込みに置き換わる
  return (
    <ChatView
      characterName={TEMPORARY_CARD.name}
      greeting={pickGreeting(TEMPORARY_CARD) ?? ""}
    />
  );
}
