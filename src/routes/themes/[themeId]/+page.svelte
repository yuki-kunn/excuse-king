<script lang="ts">
  import { page } from '$app/stores';
  import { db, auth } from '$lib/firebase/firebase';
  import { doc, getDoc, collection, query, where, onSnapshot, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
  import { onAuthStateChanged } from 'firebase/auth';
  import { onMount, onDestroy } from 'svelte';

  const themeId = $page.params.themeId;

  let theme: any = null;
  // ★変更: データベースから取得した「そのままのデータ」を保存する変数
  let rawPosts: any[] = []; 
  let currentUser: any = null;
  let unsubscribe: () => void;
  let unsubscribeAuth: () => void;

  // ★追加: 現在の「並び替えのルール」を保存する変数（最初は新着順）
  let sortBy: 'newest' | 'aiScore' | 'likeCount' = 'newest';

  // ★追加: Svelteの魔法（$:）。sortBy か rawPosts が変化するたびに、自動で並び替えた posts を作ってくれます！
  $: posts = rawPosts.slice().sort((a, b) => {
    if (sortBy === 'aiScore') return (b.aiScore || 0) - (a.aiScore || 0); // AI高得点順
    if (sortBy === 'likeCount') return (b.likeCount || 0) - (a.likeCount || 0); // いいね多い順
    return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0); // 新着順（デフォルト）
  });

  $: hasPosted = currentUser ? rawPosts.some(post => post.uid === currentUser.uid) : false;

  onMount(async () => {
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      currentUser = user;
    });

    const themeRef = doc(db, 'themes', themeId);
    const themeSnap = await getDoc(themeRef);
    
    if (themeSnap.exists()) {
      theme = { id: themeSnap.id, ...themeSnap.data() };
    }

    const q = query(collection(db, 'posts'), where('themeId', '==', themeId));

    unsubscribe = onSnapshot(q, (snapshot) => {
      // 取得したデータを rawPosts に入れます（並び替えは上の $: posts が自動でやってくれます）
      rawPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isLikedByMe: false 
      }));
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (unsubscribeAuth) unsubscribeAuth();
  });

  const handleLike = async (post: any) => {
    const user = auth.currentUser;
    if (!user) {
      alert("いいねするにはログインが必要です！");
      return;
    }

    if (post.isLikedByMe) return;

    post.likeCount = (post.likeCount || 0) + 1;
    post.isLikedByMe = true;
    // ★変更: posts ではなく、元の rawPosts を更新することで、自動的に画面が再描画されます
    rawPosts = [...rawPosts];

    try {
      const likeDocId = `${post.id}_${user.uid}`;
      const likeRef = doc(db, 'likes', likeDocId);
      
      const likeSnap = await getDoc(likeRef);
      if (likeSnap.exists()) {
        post.likeCount -= 1;
        post.isLikedByMe = false;
        rawPosts = [...rawPosts];
        return;
      }

      await setDoc(likeRef, {
        postId: post.id,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likeCount: increment(1)
      });

      if (post.uid) {
        const authorRef = doc(db, 'users', post.uid);
        await updateDoc(authorRef, {
          totalPoints: increment(1)
        });
      }

    } catch (error) {
      console.error("いいねエラー:", error);
      post.likeCount -= 1;
      post.isLikedByMe = false;
      rawPosts = [...rawPosts];
    }
  };
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

  {#if hasPosted}
    <div class="posted-message">
      ✅ あなたはこのお題に投稿済みです
    </div>
  {:else}
    <a href={`/themes/${themeId}/post`} class="post-btn">
      ✏️ 言い訳を投稿する
    </a>
  {/if}

  <div class="posts-wrapper">
    <div class="section-header">
      <h3 class="section-title">みんなの言い訳</h3>
      <div class="sort-options">
        <button class="sort-btn" class:active={sortBy === 'newest'} on:click={() => sortBy = 'newest'}>✨ 新着順</button>
        <button class="sort-btn" class:active={sortBy === 'aiScore'} on:click={() => sortBy = 'aiScore'}>🤖 AI高得点順</button>
        <button class="sort-btn" class:active={sortBy === 'likeCount'} on:click={() => sortBy = 'likeCount'}>❤️ いいね順</button>
      </div>
    </div>
    
    {#if posts.length === 0}
      <p class="empty-text">まだ言い訳がありません。一番乗りを目指そう！</p>
    {:else}
      {#each posts as post}
        <div class="post-card">
          <div class="post-header">
            <span class="user-name">{post.userId}</span>
          </div>
          <p class="excuse-text">{post.excuseText}</p>
          
          <div class="post-footer">
            <div class="ai-score">
              <span class="score-label">AI判定</span>
              <span class="score-value">{post.aiScore || 0}点</span>
            </div>
            
            <button 
              class="like-btn" 
              class:liked={post.isLikedByMe} 
              on:click={() => handleLike(post)}
            >
              {post.isLikedByMe ? '❤️' : '🤍'} {post.likeCount || 0}
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
  .post-list-container { padding: 20px; display: flex; flex-direction: column; align-items: center; max-width: 600px; margin: 0 auto; }
  .back-btn { align-self: flex-start; text-decoration: none; color: #222; font-weight: 900; margin-bottom: 16px; background-color: #fff; border: 3px solid #222; padding: 6px 12px; border-radius: 8px; box-shadow: 3px 3px 0px #222; transition: all 0.1s; }
  .back-btn:active { transform: translate(3px, 3px); box-shadow: 0px 0px 0px #222; }
  .theme-header { background-color: #ffcc00; border: 4px solid #222; border-radius: 12px; padding: 20px; width: 100%; box-sizing: border-box; box-shadow: 6px 6px 0px #222; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; }
  .theme-icon { font-size: 40px; }
  .theme-title { font-size: 20px; font-weight: 900; margin: 0; line-height: 1.4; }
  
  .post-btn { display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #ff4742; color: white; text-decoration: none; font-size: 18px; font-weight: 900; padding: 16px; border: 4px solid #222; border-radius: 12px; box-shadow: 6px 6px 0px #222; margin-bottom: 32px; transition: all 0.1s; }
  .post-btn:active { transform: translate(6px, 6px); box-shadow: 0px 0px 0px #222; }

  .posted-message { width: 100%; box-sizing: border-box; text-align: center; background-color: #f0f0f0; color: #666; font-size: 16px; font-weight: 900; padding: 16px; border: 4px dashed #ccc; border-radius: 12px; margin-bottom: 32px; }

  .posts-wrapper { width: 100%; }
  
  /* ★追加：並び替えエリアのデザイン */
  .section-header { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
  .section-title { font-size: 20px; font-weight: 900; margin: 0; text-shadow: 2px 2px 0px #4285F4; color: #222; }
  .sort-options { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
  .sort-btn { padding: 6px 12px; border: 2px solid #222; border-radius: 20px; background-color: #fff; font-weight: 900; font-size: 14px; cursor: pointer; color: #222; white-space: nowrap; transition: all 0.1s; }
  .sort-btn.active { background-color: #222; color: #ffcc00; box-shadow: 3px 3px 0px #ffcc00; transform: translate(-2px, -2px); }

  .post-card { background-color: #fff; border: 3px solid #222; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 4px 4px 0px #222; }
  .post-header { margin-bottom: 8px; }
  .user-name { font-weight: 900; color: #555; font-size: 14px; }
  .excuse-text { font-size: 18px; font-weight: bold; margin: 0 0 16px 0; line-height: 1.5; }
  .post-footer { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .ai-score { background-color: #222; color: #fff; padding: 4px 12px; border-radius: 20px; font-weight: 900; }
  .score-value { color: #ffcc00; margin-left: 4px; }
  
  .like-btn { background-color: #fff; border: 3px solid #222; padding: 6px 16px; border-radius: 20px; font-weight: 900; cursor: pointer; box-shadow: 2px 2px 0px #222; transition: all 0.1s ease; }
  .like-btn:active { transform: translate(2px, 2px); box-shadow: 0px 0px 0px #222; }
  .like-btn.liked { background-color: #ffeeee; color: #ff4742; border-color: #ff4742; }

  .ai-comment-box { background-color: #f0f0f0; border: 2px dashed #222; border-radius: 8px; padding: 10px; font-weight: bold; font-size: 14px; color: #333; }
</style>