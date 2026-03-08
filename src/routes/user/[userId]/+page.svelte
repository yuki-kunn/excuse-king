<script lang="ts">
  import { page } from '$app/stores';
  import { db } from '$lib/firebase/firebase';
  import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
  import { onMount } from 'svelte';

  const targetUserId = $page.params.userId;
  let targetUser: any = null;
  
  // ★変更：生のデータ用
  let rawPosts: any[] = [];
  let isLoading = true;

  // ★追加：ソート用の変数と自動計算
  let sortBy: 'newest' | 'aiScore' | 'likeCount' = 'newest';

  $: userPosts = rawPosts.slice().sort((a, b) => {
    if (sortBy === 'aiScore') return (b.aiScore || 0) - (a.aiScore || 0);
    if (sortBy === 'likeCount') return (b.likeCount || 0) - (a.likeCount || 0);
    return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
  });

  onMount(async () => {
    try {
      const userRef = doc(db, 'users', targetUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        targetUser = userSnap.data();
      } else {
        isLoading = false;
        return;
      }

      const postsQuery = query(collection(db, 'posts'), where('uid', '==', targetUserId));
      const postsSnap = await getDocs(postsQuery);
      
      let loadedPosts = [];
      for (const postDoc of postsSnap.docs) {
        const postData = postDoc.data();
        const themeRef = doc(db, 'themes', postData.themeId);
        const themeSnap = await getDoc(themeRef);
        const themeContent = themeSnap.exists() ? themeSnap.data().content : "削除されたお題";
        
        loadedPosts.push({ id: postDoc.id, themeContent, ...postData });
      }
      
      // ★変更：rawPostsに保存するだけ
      rawPosts = loadedPosts;
    } catch (error) {
      console.error("プロフィール読み込みエラー:", error);
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="user-profile-container">
  <a href="/ranking" class="back-btn">◀ ランキングに戻る</a>

  {#if isLoading}
    <p class="loading">読み込み中...</p>
  {:else if !targetUser}
    <div class="error-box"><p>ユーザーが見つかりませんでした。</p></div>
  {:else}
    
    <div class="profile-card">
      <div class="profile-header">
        <span class="user-title">{targetUser.title || '見習い'}</span>
        <h3 class="user-name">{targetUser.name}</h3>
      </div>
      <div class="points-box">
        <span class="points-label">総所持ポイント</span>
        <div><span class="points-number">{targetUser.totalPoints || 0}</span><span class="points-unit">pt</span></div>
      </div>
    </div>

    <div class="history-section">
      <div class="section-header">
        <h3 class="section-title">📜 {targetUser.name} の伝説</h3>
        <div class="sort-options">
          <button class="sort-btn" class:active={sortBy === 'newest'} on:click={() => sortBy = 'newest'}>✨ 新着順</button>
          <button class="sort-btn" class:active={sortBy === 'aiScore'} on:click={() => sortBy = 'aiScore'}>🤖 AI高得点順</button>
          <button class="sort-btn" class:active={sortBy === 'likeCount'} on:click={() => sortBy = 'likeCount'}>❤️ いいね順</button>
        </div>
      </div>
      
      {#if userPosts.length === 0}
        <p class="empty-text">まだ投稿がありません。</p>
      {:else}
        <div class="posts-list">
          {#each userPosts as post}
            <div class="history-card">
              <div class="theme-label">お題: {post.themeContent}</div>
              <p class="excuse-text">「{post.excuseText}」</p>
              <div class="post-stats">
                <span class="score-badge">AI {post.aiScore}点</span>
                <span class="like-badge">❤️ {post.likeCount || 0}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* 既存のスタイル */
  .user-profile-container { padding: 20px; display: flex; flex-direction: column; align-items: center; max-width: 600px; margin: 0 auto; }
  .back-btn { align-self: flex-start; text-decoration: none; color: #222; font-weight: 900; margin-bottom: 24px; background-color: #fff; border: 3px solid #222; padding: 6px 12px; border-radius: 8px; box-shadow: 3px 3px 0px #222; transition: all 0.1s; }
  .back-btn:active { transform: translate(3px, 3px); box-shadow: 0px 0px 0px #222; }

  .profile-card { width: 100%; background-color: #fff; border: 4px solid #222; border-radius: 12px; padding: 24px; box-sizing: border-box; box-shadow: 6px 6px 0px #4285F4; margin-bottom: 40px; }
  .profile-header { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px dashed #ccc; padding-bottom: 16px; }
  .user-title { background-color: #ffcc00; color: #222; font-weight: 900; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-bottom: 8px; }
  .user-name { font-size: 24px; font-weight: 900; margin: 0; color: #222; }
  .points-box { display: flex; justify-content: space-between; align-items: center; }
  .points-label { font-weight: bold; color: #666; }
  .points-number { font-size: 32px; font-weight: 900; color: #4285F4; }
  .points-unit { font-weight: bold; color: #666; }

  .history-section { width: 100%; }
  
  /* ★追加：ソートエリアのスタイル */
  .section-header { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
  .section-title { font-size: 20px; font-weight: 900; margin: 0; color: #222; border-left: 6px solid #4285F4; padding-left: 10px; }
  .sort-options { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
  .sort-btn { padding: 6px 12px; border: 2px solid #222; border-radius: 20px; background-color: #fff; font-weight: 900; font-size: 14px; cursor: pointer; color: #222; white-space: nowrap; transition: all 0.1s; }
  .sort-btn.active { background-color: #222; color: #ffcc00; box-shadow: 3px 3px 0px #ffcc00; transform: translate(-2px, -2px); }

  .empty-text { font-weight: bold; color: #666; text-align: center; margin-top: 32px; }
  .posts-list { display: flex; flex-direction: column; gap: 16px; }
  .history-card { background-color: #fff; border: 3px solid #222; border-radius: 12px; padding: 16px; box-shadow: 4px 4px 0px #222; }
  .theme-label { font-size: 12px; font-weight: 900; color: #666; margin-bottom: 8px; background-color: #f0f0f0; display: inline-block; padding: 4px 8px; border-radius: 4px; }
  .excuse-text { font-size: 16px; font-weight: bold; margin: 0 0 16px 0; line-height: 1.5; color: #222; }
  .post-stats { display: flex; gap: 12px; margin-top: 12px; }
  .score-badge { background-color: #222; color: #ffcc00; font-weight: 900; font-size: 14px; padding: 4px 12px; border-radius: 20px; }
  .like-badge { background-color: #ffeeee; color: #ff4742; font-weight: 900; font-size: 14px; padding: 4px 12px; border-radius: 20px; border: 2px solid #ff4742; }

  .error-box { text-align: center; margin-top: 50px; font-weight: bold; color: #ff4742; }
</style>