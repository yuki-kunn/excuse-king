<script lang="ts">
  import { page } from '$app/stores';
  import { db } from '$lib/firebase/firebase';
  import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
  import { onMount, onDestroy } from 'svelte';

  // URLから [themeId] の部分を取得します
  const themeId = $page.params.themeId;

  let theme: any = null; // お題のデータ
  let posts: any[] = []; // 投稿（言い訳）のリスト
  let unsubscribe: () => void; // データベース監視解除用

  onMount(async () => {
    // 1. お題そのもののデータを取得
    const themeRef = doc(db, 'themes', themeId);
    const themeSnap = await getDoc(themeRef);
    
    if (themeSnap.exists()) {
      theme = { id: themeSnap.id, ...themeSnap.data() };
    } else {
      alert("お題が見つかりませんでした。");
    }

    // 2. このお題に対する投稿一覧を取得・監視
    // Firestoreで「themeIdが一致するもの」だけを絞り込みます
    const q = query(
      collection(db, 'posts'),
      where('themeId', '==', themeId)
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
      // 取得したデータを配列に変換
      let loadedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 新しい順に並び替え（JavaScript側で処理）
      loadedPosts.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      posts = loadedPosts;
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe(); // 画面を離れる時に監視をストップ
  });
</script>

<div class="post-list-container">
  <a href="/themes" class="back-btn">◀ 戻る</a>

  {#if theme}
    <div class="theme-header">
      <div class="theme-icon">👑</div>
      <h2 class="theme-title">{theme.content}</h2>
    </div>
  {:else}
    <p class="loading">お題を読み込み中...</p>
  {/if}

  <a href={`/themes/${themeId}/post`} class="post-btn">
    ✏️ 言い訳を投稿する
  </a>

  <div class="posts-wrapper">
    <h3 class="section-title">みんなの言い訳</h3>
    
    {#if posts.length === 0}
      <p class="empty-text">まだ言い訳がありません。一番乗りを目指そう！</p>
    {:else}
      {#each posts as post}
        <div class="post-card">
          <div class="post-header">
            <span class="user-name">{post.userId}</span> </div>
          <p class="excuse-text">{post.excuseText}</p>
          
          <div class="post-footer">
            <div class="ai-score">
              <span class="score-label">AI判定</span>
              <span class="score-value">{post.aiScore || 0}点</span>
            </div>
            <button class="like-btn">
              ❤️ {post.likeCount || 0}
            </button>
          </div>
          
          {#if post.aiComment}
            <div class="ai-comment-box">
              🤖「{post.aiComment}」
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .post-list-container {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .back-btn {
    align-self: flex-start;
    text-decoration: none;
    color: #222;
    font-weight: 900;
    margin-bottom: 16px;
    background-color: #fff;
    border: 3px solid #222;
    padding: 6px 12px;
    border-radius: 8px;
    box-shadow: 3px 3px 0px #222;
    transition: all 0.1s;
  }

  .back-btn:active {
    transform: translate(3px, 3px);
    box-shadow: 0px 0px 0px #222;
  }

  /* お題ヘッダー */
  .theme-header {
    background-color: #ffcc00;
    border: 4px solid #222;
    border-radius: 12px;
    padding: 20px;
    width: 100%;
    box-sizing: border-box;
    box-shadow: 6px 6px 0px #222;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .theme-icon {
    font-size: 40px;
  }

  .theme-title {
    font-size: 20px;
    font-weight: 900;
    margin: 0;
    line-height: 1.4;
  }

  /* 投稿ボタン（目立たせる） */
  .post-btn {
    display: block;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    background-color: #ff4742;
    color: white;
    text-decoration: none;
    font-size: 18px;
    font-weight: 900;
    padding: 16px;
    border: 4px solid #222;
    border-radius: 12px;
    box-shadow: 6px 6px 0px #222;
    margin-bottom: 32px;
    transition: all 0.1s;
  }

  .post-btn:active {
    transform: translate(6px, 6px);
    box-shadow: 0px 0px 0px #222;
  }

  .posts-wrapper {
    width: 100%;
  }

  .section-title {
    font-size: 20px;
    font-weight: 900;
    margin-bottom: 16px;
    text-shadow: 2px 2px 0px #4285F4;
    color: #222;
  }

  /* 投稿カード */
  .post-card {
    background-color: #fff;
    border: 3px solid #222;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 4px 4px 0px #222;
  }

  .post-header {
    margin-bottom: 8px;
  }

  .user-name {
    font-weight: 900;
    color: #555;
    font-size: 14px;
  }

  .excuse-text {
    font-size: 18px;
    font-weight: bold;
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .post-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .ai-score {
    background-color: #222;
    color: #fff;
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 900;
  }

  .score-value {
    color: #ffcc00;
    margin-left: 4px;
  }

  .like-btn {
    background-color: #fff;
    border: 3px solid #222;
    padding: 6px 16px;
    border-radius: 20px;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 2px 2px 0px #222;
  }

  .ai-comment-box {
    background-color: #f0f0f0;
    border: 2px dashed #222;
    border-radius: 8px;
    padding: 10px;
    font-weight: bold;
    font-size: 14px;
    color: #333;
  }
</style>