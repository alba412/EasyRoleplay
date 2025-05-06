import React, { useState } from 'react';
import koboldAPI from '../../services/api/kobold';
import sdAPI from '../../services/api/sd';
import { useAppContext } from '../../context/AppContext';
import { useChatContext } from '../../context/ChatContext';
import chatService from '../../services/storage/chat';
import './ImageGenerator.css';

const ImageGenerator = ({ onClose, sceneDescription = '' }) => {
  const { activeCharacter } = useAppContext();
  const { addMessage } = useChatContext();

  const [step, setStep] = useState(1); // 1: 説明入力, 2: プロンプト編集, 3: 結果表示
  const [description, setDescription] = useState(sceneDescription || '');
  const [generatedPrompts, setGeneratedPrompts] = useState({ positive: '', negative: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);

  // プロンプト生成
  const handleGeneratePrompt = async () => {
    if (!description.trim()) {
      setError('シーン説明を入力してください');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const result = await koboldAPI.generateImagePrompt(description, activeCharacter);
      setGeneratedPrompts(result);
      setStep(2);
    } catch (err) {
      setError('プロンプト生成に失敗しました: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 画像生成
  const handleGenerateImage = async () => {
    if (!generatedPrompts.positive) {
      setError('プロンプトを入力してください');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const result = await sdAPI.generateImage(
        generatedPrompts.positive,
        generatedPrompts.negative
      );

      if (result.base64Images && result.base64Images.length > 0) {
        setGeneratedImage(`data:image/png;base64,${result.base64Images[0]}`);
        setStep(3);
      } else {
        setError('画像が生成されませんでした');
      }
    } catch (err) {
      setError('画像生成に失敗しました: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // チャットに画像を追加
  const handleAddToChat = async () => {
    try {
      if (!generatedImage) return;

      // 画像を保存
      const imagePath = await chatService.saveImage(generatedImage);

      // チャットに追加
      addMessage({
        type: 'image',
        sender: 'user',
        content: imagePath,
        timestamp: new Date().toISOString(),
        promptInfo: {
          sourceText: description,
          positive: generatedPrompts.positive,
          negative: generatedPrompts.negative
        }
      });

      onClose();
    } catch (err) {
      setError('画像の保存に失敗しました: ' + err.message);
    }
  };

  return (
    <div className="image-generator">
      <div className="image-generator-header">
        <h3>画像生成</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {step === 1 && (
        <div className="step-content">
          <h4>ステップ 1: シーン説明</h4>
          <p>生成したい画像の内容を詳しく説明してください：</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例: 青い空の下で笑顔で立っている少女"
            rows={5}
            disabled={isGenerating}
          />
          <div className="step-actions">
            <button onClick={onClose}>キャンセル</button>
            <button
              onClick={handleGeneratePrompt}
              disabled={isGenerating || !description.trim()}
              className="primary-button"
            >
              {isGenerating ? '生成中...' : 'プロンプト生成'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step-content">
          <h4>ステップ 2: プロンプト編集</h4>
          <div className="prompt-editor">
            <label>
              ポジティブプロンプト:
              <textarea
                value={generatedPrompts.positive}
                onChange={(e) => setGeneratedPrompts({ ...generatedPrompts, positive: e.target.value })}
                rows={5}
                disabled={isGenerating}
              />
            </label>

            <label>
              ネガティブプロンプト:
              <textarea
                value={generatedPrompts.negative}
                onChange={(e) => setGeneratedPrompts({ ...generatedPrompts, negative: e.target.value })}
                rows={3}
                disabled={isGenerating}
              />
            </label>
          </div>
          <div className="step-actions">
            <button onClick={() => setStep(1)}>戻る</button>
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating || !generatedPrompts.positive.trim()}
              className="primary-button"
            >
              {isGenerating ? '生成中...' : '画像生成'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-content">
          <h4>ステップ 3: 画像確認</h4>
          <div className="image-preview">
            <img src={generatedImage} alt="Generated" />
          </div>
          <div className="step-actions">
            <button onClick={() => setStep(2)}>戻る</button>
            <button
              onClick={handleAddToChat}
              className="primary-button"
            >
              チャットに追加
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default ImageGenerator;