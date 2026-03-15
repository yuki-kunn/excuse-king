<script lang="ts">
  import { db } from '$lib/firebase/firebase';
  import { collection, getDocs } from 'firebase/firestore';
  import { onMount } from 'svelte';

  let stats = {
    users: 0,
    themes: 0,
    posts: 0
  };
  let isLoading = true;

  onMount(async () => {
    try {
      // コレクションの件数を取得（※データが多い場合は getCountFromServer が推奨ですが、今回はシンプルに取得します）
      const [usersSnap, themesSnap, postsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'themes')),
        getDocs(collection(db, 'posts'))
      ]);

      stats = {
        users: usersSnap.size,
        themes: themesSnap.size,
        posts: postsSnap.size
      };
    } catch (error) {
      console.error("統計データの取得エラー:", error);
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="dashboard">
  <header class="page-header">
    <h1 class="page-title">Dashboard</h1>
    <p class="page-description">言い訳の王様 システム全体の統計情報</p>
  </header>

  {#if isLoading}
    <p>データを読み込み中...</p>
  {:else}
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-icon">👥</span>
        <div class="stat-info">
          <h3>総ユーザー数</h3>
          <p class="stat-value">{stats.users}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <span class="stat-icon">👑</span>
        <div class="stat-info">
          <h3>総お題数</h3>
          <p class="stat-value">{stats.themes}</p>
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-icon">📝</span>
        <div class="stat-info">
          <h3>総投稿（言い訳）数</h3>
          <p class="stat-value">{stats.posts}</p>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 32px;
  }

  .page-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px 0;
  }

  .page-description {
    color: #64748b;
    margin: 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
  }

  .stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .stat-icon {
    font-size: 2.5rem;
    background: #f8fafc;
    padding: 16px;
    border-radius: 12px;
  }

  .stat-info h3 {
    margin: 0 0 8px 0;
    font-size: 0.9rem;
    color: #64748b;
    font-weight: 500;
  }

  .stat-value {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a;
  }
</style>