<script lang="ts">
  import { db, auth } from '$lib/firebase/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
  import { onMount, onDestroy } from 'svelte';

  let currentUser: any = null;
  let dbUser: any = null;
  let myPosts: any[] = [];
  let isLoading = true;
  let unsubscribeAuth: () => void;

  onMount(() => {
    // ログイン状態を監視します
    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      
      if (user) {
        // 1. ユーザーの基本情報とポイントを取得
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          dbUser = userSnap.data();
        }

        // 2. 自分の投稿履歴を取得
        const postsQuery = query(collection(db, 'posts'), where('uid', '==', user.uid));
        const postsSnap = await getDocs(postsQuery);
        
        let loadedPosts = [];
        
        // 投稿ごとに「どのお題だったか」のテキストも一緒に取得します
        for (const postDoc of postsSnap.docs) {
          const postData = postDoc.data();
          const themeRef = doc(db, 'themes', postData.themeId);
          const themeSnap = await getDoc(themeRef);
          const themeContent = themeSnap.exists() ? themeSnap.data().content : "削除されたお題";
          
          loadedPosts.push({
            id: postDoc.id,
            themeContent: themeContent,
            ...postData
          });
        }
        
        // 新しい順に並び替え
        loadedPosts.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });
        
        myPosts = loadedPosts;
      }
      
      isLoading = false;
    });
  });

  onDestroy(() => {
    if (unsubscribeAuth) unsubscribeAuth();
  });
</script>

<div class="mypage-container">
  
  {#if isLoading}
    <p class="loading">読み込み中...</p>
  {:else if !currentUser}
    <div class="error-box">
      <p>マイページを見るにはログインが必要です。</p>
      <a href="/" class="btn back-btn">Homeに戻る</a>
    </div>
  {:else}
    
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
        <div>
          <span class="points-number">{dbUser?.totalPoints || 0}</span>
          <span class="points-unit">pt</span>
        </div>
      </div>
    </div>

    <div class="history-section">
      <h3 class="section-title">📜 あなたの伝説（投稿履歴）</h3>
      
      {#if myPosts.length === 0}
        <p class="empty-text">まだ投稿がありません。お題に挑戦してみよう！</p>
      {:else}
        <div class="posts-list">
          {#each myPosts as post}
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
  .mypage-container { padding: 20px; display: flex; flex-direction: column; align-items: center; }
  
  .header-actions { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .page-title { font-size: 28px; font-weight: 900; color: #222; margin: 0; }
  .settings-btn { background-color: #e0e0e0; color: #222; text-decoration: none; font-weight: 900; padding: 8px 16px; border: 3px solid #222; border-radius: 8px; box-shadow: 3px 3px 0px #222; transition: all 0.1s; }
  .settings-btn:active { transform: translate(3px, 3px); box-shadow: 0px 0px 0px #222; }

  /* プロフィールカード */
  .profile-card { width: 100%; background-color: #222; color: #fff; border-radius: 12px; padding: 24px; box-sizing: border-box; box-shadow: 6px 6px 0px #ffcc00; margin-bottom: 40px; }
  .profile-header { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px dashed #555; padding-bottom: 16px; }
  .user-title { background-color: #ffcc00; color: #222; font-weight: 900; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-bottom: 8px; }
  .user-name { font-size: 24px; font-weight: 900; margin: 0; }
  
  .points-box { display: flex; justify-content: space-between; align-items: center; }
  .points-label { font-weight: bold; color: #aaa; }
  .points-number { font-size: 32px; font-weight: 900; color: #ffcc00; }
  .points-unit { font-weight: bold; color: #aaa; }

  /* 投稿履歴 */
  .history-section { width: 100%; }
  .section-title { font-size: 20px; font-weight: 900; margin-bottom: 16px; color: #222; border-left: 6px solid #ff4742; padding-left: 10px; }
  .empty-text { font-weight: bold; color: #666; text-align: center; margin-top: 32px; }
  .posts-list { display: flex; flex-direction: column; gap: 16px; }
  
  .history-card { background-color: #fff; border: 3px solid #222; border-radius: 12px; padding: 16px; box-shadow: 4px 4px 0px #222; }
  .theme-label { font-size: 12px; font-weight: 900; color: #666; margin-bottom: 8px; background-color: #f0f0f0; display: inline-block; padding: 4px 8px; border-radius: 4px; }
  .excuse-text { font-size: 16px; font-weight: bold; margin: 0 0 16px 0; line-height: 1.5; color: #222; }
  .post-stats { display: flex; gap: 12px; }
  .score-badge { background-color: #222; color: #ffcc00; font-weight: 900; font-size: 14px; padding: 4px 12px; border-radius: 20px; }
  .like-badge { background-color: #ffeeee; color: #ff4742; font-weight: 900; font-size: 14px; padding: 4px 12px; border-radius: 20px; border: 2px solid #ff4742; }

  /* エラー画面用 */
  .error-box { text-align: center; margin-top: 50px; }
  .btn { display: inline-block; padding: 12px 24px; font-weight: 900; background-color: #4285F4; color: white; border: 3px solid #222; border-radius: 8px; text-decoration: none; box-shadow: 4px 4px 0px #222; }
</style>