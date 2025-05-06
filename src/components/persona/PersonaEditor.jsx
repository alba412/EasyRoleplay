import React, { useState } from 'react';
import sdAPI from '../../services/api/sd';
import koboldAPI from '../../services/api/kobold';
import './PersonaEditor.css';

const PersonaEditor = ({ persona, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    ...persona,
    descriptionInput: persona.description || '',
    personalityOutput: persona.personality || '',
    appearanceOutput: persona.appearance || ''
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(persona.avatarPath || '');

  // プロンプト欄を分割
  const [positivePrompt, setPositivePrompt] = useState('masterpiece, best quality, high detail, photorealistic ');
  const [negativePrompt, setNegativePrompt] = useState('bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, deformed body, bloated, ugly, unrealistic');

  const [error, setError] = useState(null);

  // 入力変更ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // 説明文を整形する
  const handleOrganizeDescription = async () => {
    if (!formData.descriptionInput.trim()) {
      setError('説明文を入力してください');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `
以下の文章から、人物の性格と外見の特徴を抽出・補完し、約8項目の短い単語や文で表現してください。

元の文章:
${formData.descriptionInput}

以下の2つのセクションに分けて出力してください:

性格:
(約8項目の性格特性や心理面をカンマ区切りで簡潔に列挙してください。例: 「冷静沈着、分析的思考、完璧主義、几帳面、好奇心旺盛、論理的、内向的、忍耐強い」)

外見:
(約8項目の身体的特徴をカンマ区切りで日本語で簡潔に列挙してください。例: 「長身、細身、黒髪ロング、切れ長の瞳、白い肌、シャープな顔立ち、スーツ姿、端正な立ち振る舞い」)
`;

      const organizedText = await koboldAPI.generateText(prompt, { max_length: 800 });

      const personalityMatch = organizedText.match(/性格:([\s\S]*?)(?=外見:|$)/i);
      const appearanceMatch = organizedText.match(/外見:([\s\S]*?)$/i);

      const personalityText = personalityMatch ? personalityMatch[1].trim() : '';
      const appearanceText = appearanceMatch ? appearanceMatch[1].trim() : '';

      setFormData({
        ...formData,
        personalityOutput: personalityText,
        appearanceOutput: appearanceText
      });
    } catch (err) {
      console.error('Text organization failed:', err);
      setError('テキストの整理に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 画像プロンプト生成（日本語→英語変換）
  const handleGenerateImagePrompt = async () => {
    if (!formData.appearanceOutput.trim()) {
      setError('外見の説明を入力または生成してください');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `
以下の日本語を、Stable Diffusion用の簡潔な英語プロンプトに翻訳してください。
例:1boy, adult male, muscular build, short black hair, sharp gaze, wearing suit, calm expression

日本語:${formData.appearanceOutput}

翻訳結果:
`;

      const result = await koboldAPI.generateText(prompt, { max_length: 300 });

      // 余計な前後のテキストを削除し、純粋な翻訳部分だけを抽出
      let cleanResult = result.trim();

      // 「Here's the translation of ~」などの前置き文を削除
      if (cleanResult.includes(':')) {
        // コロン以降のテキストを取得
        const colonPos = cleanResult.lastIndexOf(':');
        cleanResult = cleanResult.substring(colonPos + 1);
      }

      // 一般的な応答表現を削除
      const phrasesToRemove = [
        "翻訳結果",
        "Here's the translation",
        "Here is the translation",
        "The English prompt",
        "English prompt",
        "Translated prompt"
      ];

      for (const phrase of phrasesToRemove) {
        if (cleanResult.includes(phrase)) {
          const index = cleanResult.indexOf(phrase);
          const colonIndex = cleanResult.indexOf(':', index);
          if (colonIndex !== -1) {
            cleanResult = cleanResult.substring(colonIndex + 1);
          }
        }
      }

      // 行頭の不要なテキストを削除
      cleanResult = cleanResult.replace(/^\s*[\n\r]*/g, '');

      // 最終的な整形
      cleanResult = cleanResult.trim();

      // 品質タグの後に生成したプロンプトを追加（カンマを忘れないように）
      setPositivePrompt(`masterpiece, best quality, high detail, photorealistic, ${cleanResult}`);
    } catch (err) {
      console.error('Image prompt generation failed:', err);
      setError('画像プロンプトの生成に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 画像生成
  const handleGenerateImage = async () => {
    if (!positivePrompt.trim()) {
      setError('画像プロンプトを入力してください');
      return;
    }

    setIsGeneratingImage(true);
    setError(null);

    try {
      const result = await sdAPI.generateImage(positivePrompt, negativePrompt, {
        width: 512,
        height: 512,
        steps: 30
      });

      if (result.base64Images && result.base64Images.length > 0) {
        const imageData = `data:image/png;base64,${result.base64Images[0]}`;
        setImagePreview(imageData);

        setFormData({
          ...formData,
          tempImageData: imageData
        });
      }
    } catch (err) {
      console.error('Image generation failed:', err);
      setError('画像生成に失敗しました');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // フォーム送信
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('名前を入力してください');
      return;
    }

    try {
      // コピーを作成して修正する
      const dataToSave = { ...formData };

      // 画像データがある場合は保存
      if (formData.tempImageData) {
        const filename = `persona_${Date.now()}.png`;
        const imagePath = await window.electronAPI.saveImage(formData.tempImageData, filename);
        dataToSave.avatarPath = imagePath;
      } else if (!formData.avatarPath) {
        // 既存の画像パスがなく、新たに生成もしていない場合はデフォルト画像を設定
        dataToSave.avatarPath = 'images/default-avatar.png';
      }

      // 一時データと入力フィールドを削除
      delete dataToSave.tempImageData;
      delete dataToSave.descriptionInput;

      // 説明文を性格と外見から再構成
      dataToSave.description = `性格:\n${formData.personalityOutput || ''}\n\n外見:\n${formData.appearanceOutput || ''}`;

      onSave(dataToSave);
      setError(null);
    } catch (err) {
      console.error('Failed to save persona:', err);
      setError('ペルソナの保存に失敗しました');
    }
  };

  return (
    <div className="persona-editor">
      <h2>{persona.id ? 'ペルソナを編集' : '新しいペルソナを作成'}</h2>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="editor-columns">
          <div className="editor-left">
            <div className="form-group">
              <label htmlFor="name">名前:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="ペルソナの名前"
              />
            </div>

            <div className="form-group">
              <label htmlFor="descriptionInput">説明テキスト（入力）:</label>
              <textarea
                id="descriptionInput"
                name="descriptionInput"
                value={formData.descriptionInput}
                onChange={handleChange}
                rows={6}
                placeholder="あなた自身や演じたいキャラクターの設定を記述してください。「特徴を抽出」ボタンを押すと、性格と外見に分けて整理します。"
              />
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleOrganizeDescription}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? '抽出中...' : '特徴を抽出（約8項目）'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="personalityOutput">性格:</label>
              <textarea
                id="personalityOutput"
                name="personalityOutput"
                value={formData.personalityOutput}
                onChange={handleChange}
                rows={5}
                placeholder="ペルソナの性格的特徴（約8項目）"
              />
            </div>

            <div className="form-group">
              <label htmlFor="appearanceOutput">外見（日本語）:</label>
              <textarea
                id="appearanceOutput"
                name="appearanceOutput"
                value={formData.appearanceOutput}
                onChange={handleChange}
                rows={5}
                placeholder="ペルソナの外見的特徴（約8項目、日本語）"
              />
            </div>
          </div>

          <div className="editor-right">
            <div className="avatar-section">
              <div className="avatar-preview">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Persona Avatar"
                    onError={(e) => {
                      console.log('画像読み込みエラー、デフォルト画像に置き換えます');
                      e.target.src = '/images/default-avatar.png';
                    }}
                  />
                ) : (
                  <img
                    src="/images/default-avatar.png"
                    alt="Default Avatar"
                    className="default-avatar"
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="positivePrompt">Positiveプロンプト:</label>
                <textarea
                  id="positivePrompt"
                  value={positivePrompt}
                  onChange={(e) => setPositivePrompt(e.target.value)}
                  rows={4}
                  placeholder="masterpiece, best quality, high detail, photorealistic"
                />
              </div>

              <div className="form-group">
                <label htmlFor="negativePrompt">Negativeプロンプト:</label>
                <textarea
                  id="negativePrompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="avatar-actions">
                <button
                  type="button"
                  onClick={handleGenerateImagePrompt}
                  disabled={isAnalyzing || !formData.appearanceOutput.trim()}
                  className="generate-prompt-button"
                >
                  {isAnalyzing ? '英語変換中...' : '日本語→英語変換'}
                </button>

                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !positivePrompt.trim()}
                >
                  {isGeneratingImage ? '画像生成中...' : '画像生成'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="form-submit">
          <button type="button" onClick={onCancel} className="cancel-button">
            キャンセル
          </button>
          <button type="submit" className="save-button">
            保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonaEditor;