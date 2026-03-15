<script lang="ts">
	import { db } from '$lib/firebase/firebase';
	import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import { PAGINATION } from '$lib/constants/gameConstants';
	import type { UserWithId } from '$lib/types';

	let rankedUsers: UserWithId[] = [];
	let unsubscribe: (() => void) | undefined;

	onMount(() => {
		const q = query(
			collection(db, 'users'),
			orderBy('totalPoints', 'desc'),
			limit(PAGINATION.RANKING_LIMIT)
		);

		unsubscribe = onSnapshot(q, (snapshot) => {
			rankedUsers = snapshot.docs.map(
				(doc) =>
					({
						id: doc.id,
						...doc.data()
					}) as UserWithId
			);
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
        
        <a href={`/user/${user.id}`} class="rank-card" class:top-rank={index < 3}>
          
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

        </a>
        
      {/each}
    {/if}
  </div>
</div>

<style>
  /* 既存のスタイル */
  .ranking-container { padding: 20px; display: flex; flex-direction: column; align-items: center; max-width: 600px; margin: 0 auto; }
  .page-title { font-size: 32px; font-weight: 900; color: #ffcc00; -webkit-text-stroke: 2px #222; text-shadow: 4px 4px 0px #222; margin-bottom: 8px; }
  .subtitle { font-weight: bold; color: #555; margin-bottom: 32px; }
  .ranking-list { width: 100%; display: flex; flex-direction: column; gap: 16px; }

  /* ★変更：aタグにしたので、リンクの下線などを消す設定を追加します */
  .rank-card {
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border: 4px solid #222;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 4px 4px 0px #222;
    transition: transform 0.1s, box-shadow 0.1s;
    text-decoration: none; /* 下線を消す */
    color: inherit;        /* 文字色を黒のままにする */
    cursor: pointer;
  }
  
  /* ★追加：押したときのアニメーション */
  .rank-card:active {
    transform: translate(4px, 4px);
    box-shadow: 0px 0px 0px #222;
  }

  /* 既存のスタイル */
  .rank-card.top-rank { background-color: #ffffee; border-color: #ff4742; box-shadow: 6px 6px 0px #ff4742; }
  .rank-card.top-rank:active { box-shadow: 0px 0px 0px #ff4742; }

  .rank-badge { font-size: 24px; font-weight: 900; width: 40px; text-align: center; margin-right: 16px; color: #222; }
  .user-info { flex-grow: 1; display: flex; flex-direction: column; }
  .user-title { font-size: 12px; font-weight: 900; color: #ff4742; background-color: #ffeeee; padding: 2px 8px; border-radius: 12px; align-self: flex-start; margin-bottom: 4px; }
  .user-name { font-size: 18px; font-weight: 900; color: #222; }
  .point-display { text-align: right; }
  .point-number { font-size: 24px; font-weight: 900; color: #222; }
  .point-label { font-size: 14px; font-weight: bold; color: #666; }
</style>