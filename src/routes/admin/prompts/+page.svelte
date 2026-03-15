<script lang="ts">
  import { db } from '$lib/firebase/firebase';
  import { doc, getDoc, setDoc } from 'firebase/firestore';
  import { onMount } from 'svelte';

  let prompts = {
    // ★修正: ${} の前にバックスラッシュ(\)を入れて、ただの文字として認識させます
    judgeSystemPrompt: `あなたは「言い訳の王様」というエンタメアプリの非常に厳しい審査員です。
        以下のお題に対するユーザーの言い訳を、独自性や面白さの観点から厳しく10点満点で判定してください。
        また、言い訳に対する辛口のツッコミ（1〜2行）も生成してください。

        お題: 「\${themeText}」
        言い訳: 「\${excuseText}」

        【重要・厳守】
        返答は必ず以下のJSONフォーマットのみを出力してください。
        「Here is the JSON」などの挨拶、前置き、説明文は一切書かないでください。純粋なJSONデータのみを出力してください。

        {
        "score": 数値 (0〜10),
        "comment": "ツッコミのテキスト"
        }`,

    themeGeneratePrompt: `あなたは「言い訳の王様」というエンタメアプリのゲームマスターです。
        ユーザーが面白い言い訳をしたくなるような、理不尽で笑える「お題」を1つだけ生成してください。
        例: 「また遅刻？今日で3回目だよ？」、「宿題、犬が食べたって本当ですか？」、「なぜ昨日、私のプリン食べたの？」

        【重要・厳守】
        返答は必ず以下のJSONフォーマットのみを出力してください。
        {
        "themeText": "生成したお題のテキスト"
        }`
  };
  
  let isLoading = true;
  let isSaving = false;

  // データベース（system/prompts）から現在の設定を読み込む
  const fetchPrompts = async () => {
    try {
      const docRef = doc(db, 'system', 'prompts');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        prompts = docSnap.data() as typeof prompts;
      }
    } catch (error) {
      console.error("プロンプト取得エラー:", error);
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    fetchPrompts();
  });

  // 設定の保存
  const handleSave = async () => {
    isSaving = true;
    try {
      const docRef = doc(db, 'system', 'prompts');
      // マージモードで保存（なければ作成される）
      await setDoc(docRef, prompts, { merge: true });
      alert("AIのプロンプト（性格・テイスト）を更新しました！\n次回のAI呼び出し時から適用されます。");
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました。");
    } finally {
      isSaving = false;
    }
  };
</script>

<div class="admin-page">
  <div class="page-header-row">
    <div class="page-header">
      <h1 class="page-title">🤖 AI設定（プロンプト管理）</h1>
      <p class="page-description">Gemini AIに渡す裏側の指示（システムプロンプト）をリアルタイムに変更できます。</p>
    </div>
    
    <button class="btn save-btn" on:click={handleSave} disabled={isSaving || isLoading}>
      {isSaving ? '保存中...' : '💾 設定を保存して反映'}
    </button>
  </div>

  {#if isLoading}
    <div class="loading-state">読み込み中...</div>
  {:else}
    <div class="settings-container">
      
      <div class="setting-card">
        <div class="card-header">
          <h3>📝 言い訳採点AIの性格設定</h3>
          <span class="badge ai-badge">Gemini 採点用</span>
        </div>
        <p class="hint">ユーザーが言い訳を投稿した際の、AIの採点基準やコメントの口調（ツンデレ、関西弁、王様風など）を指定します。</p>
        
        <textarea 
          bind:value={prompts.judgeSystemPrompt} 
          rows="6" 
          class="prompt-textarea"
          placeholder="例：あなたは関西弁の漫才師です。ユーザーのボケ（言い訳）に対して鋭くツッコミを入れてください。"
        ></textarea>
      </div>

      <div class="setting-card">
        <div class="card-header">
          <h3>👑 お題生成AIのテイスト設定</h3>
          <span class="badge ai-badge">Gemini お題生成用</span>
        </div>
        <p class="hint">AIにお題を自動生成させる際の、シチュエーションの傾向（SF風、社畜風、ファンタジーなど）を指定します。</p>
        
        <textarea 
          bind:value={prompts.themeGeneratePrompt} 
          rows="5" 
          class="prompt-textarea"
          placeholder="例：会社員が絶対にやりたくない、気まずいビジネスシーンのお題を考えてください。"
        ></textarea>
      </div>

    </div>
  {/if}
</div>

<style>
  .admin-page { max-width: 1000px; margin: 0 auto; }
  .page-header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; gap: 16px; }
  .page-header { margin: 0; }
  .page-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
  .page-description { color: #64748b; margin: 0; font-size: 0.95rem; }

  .settings-container { display: flex; flex-direction: column; gap: 24px; }

  .setting-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .card-header h3 { margin: 0; font-size: 1.2rem; color: #0f172a; }
  
  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
  .ai-badge { background-color: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe; }

  .hint { color: #64748b; font-size: 0.9rem; margin: 0 0 16px 0; line-height: 1.5; }

  .prompt-textarea { width: 100%; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; box-sizing: border-box; resize: vertical; font-family: monospace; background-color: #f8fafc; color: #334155; line-height: 1.6; transition: all 0.2s; }
  .prompt-textarea:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); background-color: #fff; }

  .btn { padding: 12px 24px; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; white-space: nowrap; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .save-btn { background-color: #2563eb; color: #fff; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
  .save-btn:hover:not(:disabled) { background-color: #1d4ed8; }
  
  .loading-state { padding: 48px; text-align: center; color: #64748b; }

  /* スマホ対応 */
  @media (max-width: 768px) {
    .page-header-row { flex-direction: column; align-items: stretch; }
    .save-btn { width: 100%; text-align: center; }
    .setting-card { padding: 16px; }
    .prompt-textarea { font-size: 0.95rem; }
  }
</style>