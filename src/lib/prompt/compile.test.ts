import { describe, expect, it } from "vitest";

import { cardSchema, type Card } from "@/lib/card/schema";
import { worldInfoEntrySchema, type WorldInfoEntry } from "@/lib/card/worldInfo";
import { personaSchema } from "@/lib/persona/schema";

import { compilePrompt, type ConversationMessage } from "./compile";
import { FALLBACK_MODEL_PROFILE, resolveModelProfile } from "./modelProfile";
import { DEFAULT_SETTINGS } from "./settings";

const ID = "0b4b3a3c-6a4b-4f3a-8d2f-9a1b2c3d4e5f";
const PERSONA_ID = "5f4e3d2c-1b0a-4c3d-8e2f-1a2b3c4d5e6f";

function characterCard(overrides: Record<string, unknown> = {}): Card {
  return cardSchema.parse({
    id: ID,
    mode: "character",
    name: "水無瀬 灯",
    summary: "写真部の後輩",
    tags: ["後輩"],
    safety: "safe",
    ...overrides,
  });
}

function worldCard(overrides: Record<string, unknown> = {}): Card {
  return cardSchema.parse({
    id: ID,
    mode: "world",
    name: "灰の街",
    summary: "魔法が禁じられた都市",
    tags: ["ファンタジー"],
    safety: "safe",
    ...overrides,
  });
}

function compile(
  card: Card,
  extra: {
    history?: ConversationMessage[];
    worldInfo?: WorldInfoEntry[];
    persona?: ReturnType<typeof personaSchema.parse>;
    settings?: Partial<typeof DEFAULT_SETTINGS>;
    profile?: typeof FALLBACK_MODEL_PROFILE;
  } = {},
) {
  return compilePrompt({
    card,
    persona: extra.persona,
    settings: { ...DEFAULT_SETTINGS, ...extra.settings },
    history: extra.history ?? [],
    worldInfo: extra.worldInfo,
    modelProfile: extra.profile ?? FALLBACK_MODEL_PROFILE,
  });
}

function systemOf(card: Card, extra: Parameters<typeof compile>[1] = {}) {
  return compile(card, extra).messages[0].content;
}

describe("組み立て順", () => {
  it("役割定義 → キャラ定義 → World Info → ペルソナ → 出力ルール の順に並ぶ", () => {
    const system = systemOf(
      characterCard({ personality: "面倒見がいい" }),
      {
        persona: personaSchema.parse({ id: PERSONA_ID, name: "先輩" }),
        worldInfo: [
          worldInfoEntrySchema.parse({ content: "部室は3階", alwaysOn: true }),
        ],
      },
    );

    const order = [
      "あなたは対話型ロールプレイの演者です",
      "# キャラクター",
      "# 補足設定",
      "# ユーザー",
      "# 出力ルール",
    ].map((marker) => system.indexOf(marker));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("出力ルールが末尾にある", () => {
    const system = systemOf(characterCard());
    expect(system.lastIndexOf("# 出力ルール")).toBeGreaterThan(
      system.lastIndexOf("# キャラクター"),
    );
  });
});

describe("空欄の扱い", () => {
  it("空の任意項目は見出しごと出さない", () => {
    const system = systemOf(characterCard());
    for (const heading of [
      "## 口調",
      "## 性格",
      "## 背景",
      "## ユーザーとの関係",
      "## 状況",
      "## 会話例",
      "## やってはいけないこと",
    ]) {
      expect(system).not.toContain(heading);
    }
  });

  it("埋まっている項目だけ見出しが出る", () => {
    const system = systemOf(characterCard({ speechStyle: "ぶっきらぼうなタメ口" }));
    expect(system).toContain("## 口調\nぶっきらぼうなタメ口");
    expect(system).not.toContain("## 性格");
  });

  it("ペルソナが無ければユーザー節ごと出さない", () => {
    expect(systemOf(characterCard())).not.toContain("# ユーザー");
  });
});

describe("画像生成用のタグ", () => {
  it("外見タグと絵師タグはLLMに渡さない", () => {
    const system = systemOf(
      characterCard({
        appearanceTags: ["black hair", "school uniform"],
        artistTags: ["@wlop"],
      }),
    );
    expect(system).not.toContain("black hair");
    expect(system).not.toContain("school uniform");
    expect(system).not.toContain("wlop");
  });

  it("登場人物の外見タグも渡さない", () => {
    const system = systemOf(
      worldCard({
        castMembers: [
          { name: "門番", description: "無口", appearanceTags: ["armor"] },
        ],
      }),
    );
    expect(system).toContain("### 門番");
    expect(system).toContain("無口");
    expect(system).not.toContain("armor");
  });
});

describe("dialogueExamples", () => {
  it("[状況]「発話」の形で出す", () => {
    const system = systemOf(
      characterCard({
        dialogueExamples: [
          { situation: "挨拶", line: "……ども。今日も来たんだ、先輩" },
          { situation: "心配している", line: "ちゃんと寝てますか" },
        ],
      }),
    );
    expect(system).toContain("[挨拶]「……ども。今日も来たんだ、先輩」");
    expect(system).toContain("[心配している]「ちゃんと寝てますか」");
  });

  it("会話例があるときだけラベルを出すなと指示する", () => {
    expect(systemOf(characterCard())).not.toContain("状況ラベル");
    const withExamples = systemOf(
      characterCard({ dialogueExamples: [{ situation: "挨拶", line: "ども" }] }),
    );
    expect(withExamples).toContain("状況ラベル");
  });
});

describe("出力ルール", () => {
  it("一人称と二人称を再掲する", () => {
    const system = systemOf(
      characterCard({ firstPerson: "あたし", secondPerson: "先輩" }),
    );
    const rules = system.slice(system.indexOf("# 出力ルール"));
    expect(rules).toContain("一人称は「あたし」");
    expect(rules).toContain("ユーザーの呼び方は「先輩」");
  });

  it("一人称が空なら再掲する行を出さない", () => {
    const rules = systemOf(characterCard()).slice(
      systemOf(characterCard()).indexOf("# 出力ルール"),
    );
    expect(rules).not.toContain("一人称は");
  });

  it("全体設定が文章として反映される", () => {
    const system = systemOf(characterCard(), {
      settings: {
        narrationStyle: "italic",
        narrationRatio: "narrationHeavy",
        responseLength: "short",
      },
    });
    expect(system).toContain("地の文は * で囲み");
    expect(system).toContain("地の文で情景と仕草を厚く描き");
    expect(system).toContain("1回の応答は1〜2文に収める");
  });

  it("worldモードではユーザーの行動を決めるなと言う", () => {
    const system = systemOf(worldCard());
    expect(system).toContain("ユーザーの行動を勝手に決めない");
  });
});

describe("World Info の発火", () => {
  const entries = [
    worldInfoEntrySchema.parse({
      keys: ["写真部"],
      content: "写真部は3階の空き教室にある",
      priority: 1,
    }),
    worldInfoEntrySchema.parse({
      keys: ["学園祭"],
      content: "学園祭は11月",
      priority: 5,
    }),
    worldInfoEntrySchema.parse({ content: "季節は秋", alwaysOn: true, priority: 0 }),
  ];

  it("キーが出ていないものは出さない", () => {
    const system = systemOf(characterCard(), {
      worldInfo: entries,
      history: [{ role: "user", content: "こんにちは" }],
    });
    expect(system).toContain("季節は秋");
    expect(system).not.toContain("写真部は3階");
    expect(system).not.toContain("学園祭は11月");
  });

  it("直近の会話にキーが出たら発火する", () => {
    const system = systemOf(characterCard(), {
      worldInfo: entries,
      history: [{ role: "user", content: "写真部の部室ってどこだっけ" }],
    });
    expect(system).toContain("写真部は3階");
  });

  it("古い発言のキーでは発火しない", () => {
    const old: ConversationMessage[] = [
      { role: "user", content: "写真部の話" },
      ...Array.from({ length: 8 }, (_, index) => ({
        role: (index % 2 === 0 ? "assistant" : "user") as "assistant" | "user",
        content: `別の話${index}`,
      })),
    ];
    const system = systemOf(characterCard(), { worldInfo: entries, history: old });
    expect(system).not.toContain("写真部は3階");
  });

  it("priority の大きいものから並ぶ", () => {
    const system = systemOf(characterCard(), {
      worldInfo: entries,
      history: [{ role: "user", content: "学園祭と写真部の話" }],
    });
    expect(system.indexOf("学園祭は11月")).toBeLessThan(
      system.indexOf("写真部は3階"),
    );
  });
});

describe("履歴", () => {
  const history: ConversationMessage[] = [
    { role: "assistant", content: "……ども。今日も来たんだ、先輩" },
    { role: "user", content: "よ、来たぞ" },
    { role: "assistant", content: "べつに、待ってたわけじゃないし" },
  ];

  it("system の後に greeting から順に並ぶ", () => {
    const { messages } = compile(characterCard(), { history });
    expect(messages[0].role).toBe("system");
    expect(messages.slice(1)).toEqual(history);
  });

  it("上限を超えたら古い方から落とし、greeting は残す", () => {
    const long: ConversationMessage[] = [
      { role: "assistant", content: "greeting" },
      ...Array.from({ length: 40 }, (_, index) => ({
        role: (index % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: `${index}:${"あ".repeat(200)}`,
      })),
    ];

    const { messages } = compile(characterCard(), {
      history: long,
      settings: { contextLimit: 2000 },
    });

    expect(messages.length).toBeLessThan(long.length + 1);
    expect(messages[1].content).toBe("greeting");
    expect(messages.at(-1)).toEqual(long.at(-1));
  });

  it("予算が尽きても最新の1通は残る", () => {
    const { messages } = compile(characterCard(), {
      history: [{ role: "user", content: "あ".repeat(5000) }],
      settings: { contextLimit: 100 },
    });
    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe("user");
  });
});

describe("プレフィル", () => {
  it("対応モデルかつ地の文に目印がある書き方のときだけ返す", () => {
    const deepseek = resolveModelProfile("deepseek/deepseek-chat");
    expect(deepseek.supportsPrefill).toBe(true);

    expect(
      compile(characterCard(), {
        profile: deepseek,
        settings: { narrationStyle: "italic" },
      }).prefill,
    ).toBe("*");

    expect(
      compile(characterCard(), {
        profile: deepseek,
        settings: { narrationStyle: "plain" },
      }).prefill,
    ).toBeUndefined();
  });

  it("非対応モデルには渡さない", () => {
    const profile = resolveModelProfile("openai/gpt-4o-mini");
    expect(profile.supportsPrefill).toBe(false);
    expect(
      compile(characterCard(), { profile, settings: { narrationStyle: "italic" } })
        .prefill,
    ).toBeUndefined();
  });
});

describe("モデルプロファイル", () => {
  it("知らないモデルはフォールバックになる", () => {
    expect(resolveModelProfile("unknown/model-x")).toEqual(FALLBACK_MODEL_PROFILE);
  });

  it("systemRole に従って1通目の role が決まる", () => {
    const { messages } = compile(characterCard(), {
      profile: { ...FALLBACK_MODEL_PROFILE, systemRole: "user" },
    });
    expect(messages[0].role).toBe("user");
  });

  it("extraSuffix はシステムプロンプトの末尾に付く", () => {
    const system = systemOf(characterCard(), {
      profile: { ...FALLBACK_MODEL_PROFILE, extraSuffix: "追記" },
    });
    expect(system.endsWith("追記")).toBe(true);
  });
});

describe("純粋関数であること", () => {
  it("同じ入力なら同じ出力になり、入力を書き換えない", () => {
    const card = characterCard({ dialogueExamples: [{ situation: "挨拶", line: "ども" }] });
    const history: ConversationMessage[] = [{ role: "user", content: "やあ" }];
    const worldInfo = [worldInfoEntrySchema.parse({ content: "秋", alwaysOn: true })];

    const snapshot = JSON.stringify({ card, history, worldInfo });
    const first = compile(card, { history, worldInfo });
    const second = compile(card, { history, worldInfo });

    expect(first).toEqual(second);
    expect(JSON.stringify({ card, history, worldInfo })).toBe(snapshot);
  });
});
