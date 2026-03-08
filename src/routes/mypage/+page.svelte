<script lang="ts">
  import { goto } from '$app/navigation';
  import { db, auth } from '$lib/firebase/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
  import { onMount, onDestroy } from 'svelte';

  let currentUser: any = null;
  let dbUser: any = null;
  
  // ★変更：取得した生のデータを保存する変数
  let rawPosts: any[] = [];
  let isLoading = true;
  let unsubscribeAuth: () => void;

  // ★追加：ソート用の変数と自動計算（リアクティブ）
  let sortBy: 'newest' | 'aiScore' | 'likeCount' = 'newest';

  $: myPosts = rawPosts.slice().sort((a, b) => {
    if (sortBy === 'aiScore') return (b.aiScore || 0) - (a.aiScore || 0);
    if (sortBy === 'likeCount') return (b.likeCount || 0) - (a.likeCount || 0);
    return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
  });

  const getTitle = (points: number) => {
    if (points >= 100) return "言い訳の神";
    if (points >= 50) return "言い訳の達人";
    if (points >= 20) return "言い訳のプロ";
    return "見習い";
  };

  onMount(() => {
    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          dbUser = userSnap.data();
        }

        const postsQuery = query(collection(db, 'posts'), where('uid', '==', user.uid));
        const postsSnap = await getDocs(postsQuery);
        
        let loadedPosts = [];
        for (const postDoc of postsSnap.docs) {
          const postData = postDoc.data();
          const themeRef = doc(db, 'themes', postData.themeId);
          const themeSnap = await getDoc(themeRef);
          const themeContent = themeSnap.exists() ? themeSnap.data().content : "削除されたお題";
          
          loadedPosts.push({ id: postDoc.id, themeContent, ...postData });
        }
        
        // ★変更：rawPostsに保存するだけ（並び替えは $: myPosts が自動でやります）
        rawPosts = loadedPosts;
        isLoading = false;
      } else {
        goto('/');
      }
    });
  });

  onDestroy(() => {
    if (unsubscribeAuth) unsubscribeAuth();
  });

const handleDeletePost = async (post: any) => {
    const confirmMessage = "この言い訳を本当に削除しますか？\n※獲得したポイントも没収されます！";
    if (!confirm(confirmMessage)) return;

    try {
      const pointsToDeduct = (post.aiScore || 0) + (post.likeCount || 0);
      const currentPoints = dbUser.totalPoints || 0;
      let newPoints = Math.max(0, currentPoints - pointsToDeduct);
      
      // 新しいポイントに基づいて称号を計算（ここで降格も判定されます）
      const newTitle = getTitle(newPoints);

      // 1. データベースの更新
      await updateDoc(doc(db, 'users', currentUser.uid), { 
        totalPoints: newPoints, 
        title: newTitle 
      });
      await deleteDoc(doc(db, 'posts', post.id));

      // 2. 画面表示の更新
      rawPosts = rawPosts.filter(p => p.id !== post.id);
      
      // =========================================================
      // ★修正：Svelteが変更を検知できるように、dbUser全体を上書き（再代入）します
      // =========================================================
      dbUser = { 
        ...dbUser, 
        totalPoints: newPoints, 
        title: newTitle 
      };

      alert(`投稿を削除しました。（${pointsToDeduct} pt 減少しました）\n現在の称号: ${newTitle}`);
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。");
    }
  };
</script>

<div class="mypage-container">
  {#if isLoading}
    <p class="loading">読み込み中...</p>
  {:else if currentUser}
    <div class="header-actions">
      <h2 class="page-title">マイページ</h2>
      <a href="/mypage/settings" class="settings-btn">⚙️ 設定</a>
    </div>

    <div class="profile-card">
      <div class="profile-header">
        <span class="user-title">{dbUser?.title || '見習い'}</span>
        <h3 class="user-name">{dbUser?.name || '名無し'}</h3>
      </div>
      <div class="points-box">
        <span class="points-label">総所持ポイント</span>
        <div><span class="points-number">{dbUser?.totalPoints || 0}</span><span class="points-unit">pt</span></div>
      </div>
    </div>

    <div class="history-section">
      <div class="section-header">
        <h3 class="section-title">📜 あなたの伝説</h3>
        <div class="sort-options">
          <button class="sort-btn" class:active={sortBy === 'newest'} on:click={() => sortBy = 'newest'}>✨ 新着順</button>
          <button class="sort-btn" class:active={sortBy === 'aiScore'} on:click={() => sortBy = 'aiScore'}>🤖 AI高得点順</button>
          <button class="sort-btn" class:active={sortBy === 'likeCount'} on:click={() => sortBy = 'likeCount'}>❤️ いいね順</button>
        </div>
      </div>
      
      {#if myPosts.length === 0}
        <p class="empty-text">まだ投稿がありません。お題に挑戦してみよう！</p>
      {:else}
        <div class="posts-list">
          {#each myPosts as post}
            <div class="history-card">
              <div class="theme-label">お題: {post.themeContent}</div>
              <p class="excuse-text">「{post.excuseText}」</p>
              <div class="post-footer">
                <div class="post-stats">
                  <span class="score-badge">AI {post.aiScore}点</span>
                  <span class="like-badge">❤️ {post.likeCount || 0}</span>
                </div>
                <button class="delete-post-btn" on:click={() => handleDeletePost(post)}>🗑️ 削除</button>
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
  .mypage-container { padding: 20px; display: flex; flex-direction: column; align-items: center; max-width: 600px; margin: 0 auto; }
  .header-actions { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .page-title { font-size: 28px; font-weight: 900; color: #222; margin: 0; }
  .settings-btn { background-color: #e0e0e0; color: #222; text-decoration: none; font-weight: 900; padding: 8px 16px; border: 3px solid #222; border-radius: 8px; box-shadow: 3px 3px 0px #222; transition: all 0.1s; }
  .settings-btn:active { transform: translate(3px, 3px); box-shadow: 0px 0px 0px #222; }

  .profile-card { width: 100%; background-color: #222; color: #fff; border-radius: 12px; padding: 24px; box-sizing: border-box; box-shadow: 6px 6px 0px #ffcc00; margin-bottom: 40px; }
  .profile-header { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px dashed #555; padding-bottom: 16px; }
  .user-title { background-color: #ffcc00; color: #222; font-weight: 900; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-bottom: 8px; }
  .user-name { font-size: 24px; font-weight: 900; margin: 0; }
  .points-box { display: flex; justify-content: space-between; align-items: center; }
  .points-label { font-weight: bold; color: #aaa; }
  .points-number { font-size: 32px; font-weight: 900; color: #ffcc00; }
  .points-unit { font-weight: bold; color: #aaa; }

  .history-section { width: 100%; }
  
  /* ★追加：ソートエリアのスタイル */
  .section-header { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
  .section-title { font-size: 20px; font-weight: 900; margin: 0; color: #222; border-left: 6px solid #ff4742; padding-left: 10px; }
  .sort-options { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
  .sort-btn { padding: 6px 12px; border: 2px solid #222; border-radius: 20px; background-color: #fff; font-weight: 900; font-size: 14px; cursor: pointer; color: #222; white-space: nowrap; transition: all 0.1s; }
  .sort-btn.active { background-color: #222; color: #ffcc00; box-shadow: 3px 3px 0px #ffcc00; transform: translate(-2px, -2px); }

  .empty-text { font-weight: bold; color: #666; text-align: center; margin-top: 32px; }
  .posts-list { display: flex; flex-direction: column; gap: 16px; }
  .history-card { background-color: #fff; border: 3px solid #222; border-radius: 12px; padding: 16px; box-shadow: 4px 4px 0px #222; }
  .theme-label { font-size: 12px; font-weight: 900; color: #666; margin-bottom: 8px; background-color: #f0f0f0; display: inline-block; padding: 4px 8px; border-radius: 4px; }
  .excuse-text { font-size: 16px; font-weight: bold; margin: 0 0 16px 0; line-height: 1.5; color: #222; }
  .post-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
  .post-stats { display: flex; gap: 12px; }
  .score-badge { background-color: #222; color: #ffcc00; font-weight: 900; font-size: 14px; padding: 4px 12px; border-radius: 20px; }
  .like-badge { background-color: #ffeeee; color: #ff4742; font-weight: 900; font-size: 14px; padding: 4px 12px; border-radius: 20px; border: 2px solid #ff4742; }
  .delete-post-btn { background-color: #fff; color: #666; border: 2px solid #ccc; font-weight: bold; padding: 4px 12px; border-radius: 8px; cursor: pointer; transition: all 0.1s; }
  .delete-post-btn:hover { border-color: #ff4742; color: #ff4742; background-color: #ffeeee; }
  .delete-post-btn:active { transform: scale(0.95); }
</style>