<script lang="ts">
  import { db } from '$lib/firebase/firebase';
  // Firestoreからデータを取得・追加・監視するための機能を読み込みます
  import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
  import { onMount } from 'svelte';

  // お題のデータを格納する配列（リスト）です
  let themes: any[] = [];

  // 画面が表示されたときに実行される処理
  onMount(() => {
    // 1. データベースの "themes" コレクションを指定し、"createdAt"（作成日時）の降順（新しい順）で並び替える設定を作ります
    const q = query(collection(db, 'themes'), orderBy('createdAt', 'desc'));

    // 2. onSnapshotを使うことで、データベースに変更があったらリアルタイムで自動的に画面が更新されるようになります
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 取得したデータを、扱いやすい配列の形に変換して themes 変数に入れます
      themes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    });

    // 画面を離れた時に監視を解除します（メモリ節約のため）
    return () => unsubscribe();
  });

  // 【開発用】テスト用のお題をデータベースに追加する機能
  const addDummyTheme = async () => {
    const dummyTexts = [
      "「なぜ昨日、私のプリン食べたの？」に対する言い訳",
      "「また遅刻？今日で3回目だよ？」に対する言い訳",
      "「宿題、犬が食べたって本当ですか？」に対する言い訳"
    ];
    // ランダムに1つ選ぶ
    const randomText = dummyTexts[Math.floor(Math.random() * dummyTexts.length)];

    try {
      // データベースの "themes" コレクションに新しいデータを追加します
      await addDoc(collection(db, 'themes'), {
        content: randomText, // お題の本文
        createdAt: serverTimestamp() // 現在の時刻をサーバー時間で保存
      });
    } catch (error) {
      console.error("お題の追加に失敗しました:", error);
      alert("エラーが発生しました。");
    }
  };
</script>

<div class="themes-container">
  <h2>お題一覧</h2>
  
  <button class="dev-btn" on:click={addDummyTheme}>
    ＋ ダミーお題を追加 (開発用)
  </button>

  <div class="theme-list">
    {#if themes.length === 0}
      <p class="empty-text">まだお題がありません。ダミーを追加してみてください！</p>
    {:else}
      {#each themes as theme}
        <a href={`/themes/${theme.id}`} class="theme-card">
          <div class="card-icon">💬</div>
          <div class="card-content">
            <p class="theme-text">{theme.content}</p>
          </div>
        </a>
      {/each}
    {/if}
  </div>
</div>

<style>
  .themes-container {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  h2 {
    font-size: 28px;
    font-weight: 900;
    color: #222;
    margin-bottom: 20px;
    text-shadow: 2px 2px 0px #ffcc00; /* ポップな影 */
  }

  .dev-btn {
    background-color: #ff4742;
    color: white;
    font-weight: bold;
    border: 3px solid #222;
    padding: 10px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    cursor: pointer;
    box-shadow: 4px 4px 0px #222;
    transition: all 0.1s;
  }

  .dev-btn:active {
    transform: translate(4px, 4px);
    box-shadow: 0px 0px 0px #222;
  }

  .empty-text {
    color: #666;
    font-weight: bold;
  }

  .theme-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px; /* カード同士の隙間 */
  }

  /* お題を表示するカードのデザイン（ネオブルータリズム風） */
  .theme-card {
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border: 4px solid #222;
    border-radius: 12px;
    padding: 16px;
    text-decoration: none;
    color: #222;
    box-shadow: 6px 6px 0px #222;
    transition: all 0.2s ease;
  }

  /* タップした時の動き */
  .theme-card:active {
    transform: translate(6px, 6px);
    box-shadow: 0px 0px 0px #222;
  }

  .card-icon {
    font-size: 32px;
    margin-right: 16px;
  }

  .theme-text {
    font-size: 16px;
    font-weight: bold;
    line-height: 1.5;
    margin: 0;
  }
</style>