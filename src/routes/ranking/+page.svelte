<script lang="ts">
  import { db } from '$lib/firebase/firebase';
  // Firestoreから「ポイント順」に並び替えて取得する機能を読み込みます
  import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
  import { onMount, onDestroy } from 'svelte';

  let rankedUsers: any[] = [];
  let unsubscribe: () => void;

  onMount(() => {
    // データベースの 'users' コレクションから、'totalPoints' が多い順にトップ50人を取得する設定
    const q = query(
      collection(db, 'users'), 
      orderBy('totalPoints', 'desc'), 
      limit(50)
    );

    // リアルタイムで監視（誰かのポイントが上がったら、自動でランキングが入れ替わります！）
    unsubscribe = onSnapshot(q, (snapshot) => {
      rankedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>

<div class="ranking-container">
  <h2 class="page-title">🏆 王様ランキング 🏆</h2>
  <p class="subtitle">言い訳ポイントを稼いで頂点を目指せ！</p>

  <div class="ranking-list">
    {#if rankedUsers.length === 0}
      <p class="loading">ランキングを集計中...</p>
    {:else}
      {#each rankedUsers as user, index}
        <div class="rank-card" class:top-rank={index < 3}>
          
          <div class="rank-badge">
            {#if index === 0}🥇
            {:else if index === 1}🥈
            {:else if index === 2}🥉
            {:else}{index + 1}
            {/if}
          </div>

          <div class="user-info">
            <span class="user-title">{user.title || '見習い'}</span>
            <span class="user-name">{user.name}</span>
          </div>

          <div class="point-display">
            <span class="point-number">{user.totalPoints || 0}</span>
            <span class="point-label">pt</span>
          </div>

        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .ranking-container {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .page-title {
    font-size: 32px;
    font-weight: 900;
    color: #ffcc00;
    -webkit-text-stroke: 2px #222;
    text-shadow: 4px 4px 0px #222;
    margin-bottom: 8px;
  }

  .subtitle {
    font-weight: bold;
    color: #555;
    margin-bottom: 32px;
  }

  .ranking-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ランキングカードの基本デザイン */
  .rank-card {
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border: 4px solid #222;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 4px 4px 0px #222;
    transition: transform 0.2s;
  }

  /* トップ3の特別なデザイン（黄色背景で少し大きく） */
  .rank-card.top-rank {
    background-color: #ffffee;
    border-color: #ff4742;
    transform: scale(1.02);
    box-shadow: 6px 6px 0px #ff4742;
  }

  .rank-badge {
    font-size: 24px;
    font-weight: 900;
    width: 40px;
    text-align: center;
    margin-right: 16px;
    color: #222;
  }

  .user-info {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .user-title {
    font-size: 12px;
    font-weight: 900;
    color: #ff4742;
    background-color: #ffeeee;
    padding: 2px 8px;
    border-radius: 12px;
    align-self: flex-start;
    margin-bottom: 4px;
  }

  .user-name {
    font-size: 18px;
    font-weight: 900;
    color: #222;
  }

  .point-display {
    text-align: right;
  }

  .point-number {
    font-size: 24px;
    font-weight: 900;
    color: #222;
  }

  .point-label {
    font-size: 14px;
    font-weight: bold;
    color: #666;
  }
</style>