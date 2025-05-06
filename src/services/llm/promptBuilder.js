/**
 * チャットプロンプトを構築するユーティリティ
 */
class PromptBuilder {
  /**
   * キャラクターとペルソナに基づいてシステムプロンプトを構築
   * @param {Object} character キャラクター情報
   * @param {Object} persona ペルソナ情報
   * @returns {string} システムプロンプト
   */
  buildSystemPrompt(character, persona) {
    if (!character || !persona) {
      throw new Error('Character and persona are required');
    }
    
    // 設定から性格部分を抽出
    let characterPersonality = "";
    const characterPersonalityMatch = character.description.match(/性格:([\s\S]*?)(?=外見:|$)/i);
    if (characterPersonalityMatch && characterPersonalityMatch[1]) {
      characterPersonality = characterPersonalityMatch[1].trim();
    }
    
    // 設定から外見部分を抽出
    let characterAppearance = "";
    const characterAppearanceMatch = character.description.match(/外見:([\s\S]*?)(?=性格:|$)/i);
    if (characterAppearanceMatch && characterAppearanceMatch[1]) {
      characterAppearance = characterAppearanceMatch[1].trim();
    }
    
    // ペルソナから性格部分を抽出
    let personaPersonality = "";
    const personaPersonalityMatch = persona.description.match(/性格:([\s\S]*?)(?=外見:|$)/i);
    if (personaPersonalityMatch && personaPersonalityMatch[1]) {
      personaPersonality = personaPersonalityMatch[1].trim();
    }
    
    // ペルソナから外見部分を抽出
    let personaAppearance = "";
    const personaAppearanceMatch = persona.description.match(/外見:([\s\S]*?)(?=性格:|$)/i);
    if (personaAppearanceMatch && personaAppearanceMatch[1]) {
      personaAppearance = personaAppearanceMatch[1].trim();
    }
    
    return `あなたは、以下の設定のキャラクターとしてロールプレイをしてください。
キャラクター名: ${character.name}

キャラクターの性格:
${characterPersonality || character.description}

キャラクターの外見:
${characterAppearance || ''}

あなたの相手は以下の設定の人物です。
人物名: ${persona.name}

人物の性格:
${personaPersonality || persona.description}

人物の外見:
${personaAppearance || ''}

以下のルールに従ってロールプレイを行ってください:
1. 必ず「${character.name}」として一人称で会話してください
2. 相手の名前「${persona.name}」を適切に使用して会話してください
3. キャラクター設定に忠実な口調、性格、反応を維持してください
4. 現代日本語で、自然な会話を心がけてください
5. 冗長な説明は避け、簡潔に会話を進めてください
6. 会話の流れに沿った自然な返答をしてください
7. 必ず何らかの返答を返してください。無言や空白は避けてください。
8. 自分のセリフは「」や『』などで囲まず、地の文なしでそのまま返してください。

これから会話を始めます。会話相手からの発言に対して、設定に沿ったキャラクターとして応答してください。`;
  }
  
  /**
   * チャット履歴を含むプロンプトを構築
   * @param {Object} character キャラクター情報
   * @param {Object} persona ペルソナ情報
   * @param {Array} messages メッセージ履歴
   * @returns {string} 完全なプロンプト
   */
  buildChatPrompt(character, persona, messages, userMessage) {
    const systemPrompt = this.buildSystemPrompt(character, persona);
    const chatHistory = this.formatChatHistory(character, persona, messages);
    
    const fullPrompt = `${systemPrompt}\n\n${chatHistory}\n\n${persona.name}: ${userMessage}\n\n${character.name}: `;
    
    console.log('完成したチャットプロンプト:', fullPrompt);
    
    return fullPrompt;
  }
  
  /**
   * チャット履歴をフォーマット
   * @param {Object} character キャラクター情報
   * @param {Object} persona ペルソナ情報
   * @param {Array} messages メッセージ履歴
   * @returns {string} フォーマットされたチャット履歴
   */
  formatChatHistory(character, persona, messages) {
    if (!character || !persona || !messages) {
      throw new Error('Character, persona, and messages are required');
    }
    
    // チャット履歴（最大10メッセージ）
    const recentMessages = messages.slice(-10);
    
    let chatHistory = '';
    recentMessages.forEach(message => {
      if (message.type !== 'text') return;
      
      const speaker = message.sender === 'user' ? persona.name : character.name;
      chatHistory += `${speaker}: ${message.content}\n`;
    });
    
    return chatHistory;
  }
  
  /**
   * 画像プロンプト生成用のプロンプトを構築
   * @param {Object} character キャラクター情報
   * @param {string} sceneDescription シーン説明
   * @returns {string} 画像プロンプト生成用プロンプト
   */
  buildImagePromptGenerationPrompt(character, sceneDescription) {
    // 外見部分を抽出
    let appearance = "";
    const appearanceMatch = character.description.match(/外見:([\s\S]*?)(?=性格:|設定:|$)/i);
    if (appearanceMatch && appearanceMatch[1]) {
      appearance = appearanceMatch[1].trim();
    }
    
    return `以下の文章からStable Diffusionで高品質な画像を生成するためのプロンプトを作成してください。
シーン説明: ${sceneDescription}

キャラクター情報:
名前: ${character.name}
外見: ${appearance || character.description}

以下の形式でプロンプトを作成してください:

ポジティブプロンプト:
(ここにポジティブプロンプトを記述)

ネガティブプロンプト:
(ここにネガティブプロンプトを記述)

必ずStable Diffusion向けの英語のプロンプトを作成し、キャラクターの特徴を正確に反映させてください。
`;
  }
  
  /**
   * キャラクター特徴抽出用のプロンプトを構築
   * @param {string} characterDescription キャラクターの説明
   * @returns {string} 特徴抽出用プロンプト
   */
  buildFeatureExtractionPrompt(characterDescription) {
    return `以下のキャラクター記述から、画像生成に重要な身体的特徴を抽出し、構造化データとして出力してください。

キャラクター記述:
${characterDescription}

以下のカテゴリに分けて特徴を抽出してください:
1. hairColor: 髪の色
2. hairStyle: 髪型
3. eyeColor: 目の色
4. bodyType: 体型
5. skinTone: 肌の色調
6. distinguishingFeatures: その他の特徴的な外見要素

JSONフォーマットで出力してください:
{
  "hairColor": "抽出した髪の色",
  "hairStyle": "抽出した髪型",
  "eyeColor": "抽出した目の色",
  "bodyType": "抽出した体型",
  "skinTone": "抽出した肌の色調",
  "distinguishingFeatures": "抽出したその他の特徴"
}

キャラクター記述に情報がない場合は、空文字列を返してください。
`;
  }

  /**
   * 説明文を整形するプロンプトの構築
   * @param {string} description 説明文
   * @returns {string} 整形されたプロンプト
   */
  buildDescriptionOrganizationPrompt(description) {
    return `以下の文章を整理して、キャラクター設定として再構成してください。
設定には「性格:」「外見:」「設定:」の3つのセクションを含めてください。
文章中の情報が不足している場合は、適切な内容を追加して補完してください。

元の文章:
${description}

整理された設定を以下の形式で出力してください:

性格:
(性格や行動傾向の説明)

外見:
(身体的特徴や服装等の外見の説明)

設定:
(キャラクターの背景や状況等の設定説明)`;
  }
}

// シングルトンインスタンス
const promptBuilder = new PromptBuilder();

export default promptBuilder;