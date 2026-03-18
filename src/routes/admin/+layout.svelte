<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/firebase/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { onMount, onDestroy } from 'svelte';

  export let data: { isAuthenticated?: boolean; user?: { email: string; uid: string } };

  const ADMIN_EMAIL = "hokuyoyuki@gmail.com";
  let isAuthorized = false;
  let isLoading = true;
  let unsubscribeAuth: () => void;

  // ★追加：スマホ用のサイドバー開閉状態を管理するフラグ
  let isSidebarOpen = false;

  onMount(() => {
    // サーバー側で既に認証済みの場合
    if (data?.isAuthenticated && data?.user) {
      console.log('[Client] サーバー側で認証済み:', data.user.email);
      isAuthorized = true;
      isLoading = false;
    }

    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && user.email === ADMIN_EMAIL) {
        isAuthorized = true;
        // サーバーサイド認証のためにトークンをCookieに保存
        try {
          const token = await user.getIdToken();
          document.cookie = `adminToken=${token}; path=/admin; max-age=3600; SameSite=Strict`;
          console.log('[Client] トークンをCookieに保存しました');
        } catch (error) {
          console.error('[Client] トークンの取得に失敗しました:', error);
        }
      } else {
        if (!isLoading) { // 初回ロード中でない場合のみアラート表示
          alert("🔒 管理者権限がありません。");
        }
        document.cookie = 'adminToken=; path=/admin; max-age=0'; // Cookieを削除
        goto('/');
      }
      isLoading = false;
    });
  });

  onDestroy(() => {
    if (unsubscribeAuth) unsubscribeAuth();
  });

  // ★追加：リンクを押した時や、オーバーレイを押した時にサイドバーを閉じる関数
  const closeSidebar = () => {
    isSidebarOpen = false;
  };
</script>

{#if isLoading}
  <div class="loading-screen">Authenticating Admin...</div>
{:else if isAuthorized}
  <div class="admin-app">
    
    <header class="mobile-header">
      <h2>Admin Console</h2>
      <button class="hamburger-btn" on:click={() => isSidebarOpen = true}>
        ☰
      </button>
    </header>

    {#if isSidebarOpen}
      <div class="sidebar-overlay" on:click={closeSidebar}></div>
    {/if}

    <aside class="admin-sidebar" class:open={isSidebarOpen}>
      <div class="sidebar-header">
        <h2>Admin Console</h2>
        <button class="close-btn" on:click={closeSidebar}>✕</button>
      </div>
      <nav class="sidebar-nav">
        <a href="/admin" class:active={$page.url.pathname === '/admin'} on:click={closeSidebar}>📊 Dashboard</a>
        <a href="/admin/themes" class:active={$page.url.pathname.includes('/admin/themes')} on:click={closeSidebar}>👑 お題管理</a>
        <a href="/admin/posts" class:active={$page.url.pathname.includes('/admin/posts')} on:click={closeSidebar}>📝 投稿管理</a>
        <a href="/admin/users" class:active={$page.url.pathname.includes('/admin/users')} on:click={closeSidebar}>👥 ユーザー管理</a>
        <a href="/admin/prompts" class:active={$page.url.pathname.includes('/admin/prompts')} on:click={closeSidebar}>🤖 AI設定</a>
      </nav>
      <div class="sidebar-footer">
        <a href="/" class="back-to-app" on:click={closeSidebar}>◀ アプリに戻る</a>
      </div>
    </aside>

    <main class="admin-main">
      <slot />
    </main>
  </div>
{/if}

<style>
  :global(body) {
    background-color: #f8fafc;
    color: #334155;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    margin: 0;
  }

  .loading-screen { display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 1.2rem; color: #64748b; }

  .admin-app {
    display: flex;
    min-height: 100vh;
    max-width: 100vw;
    margin: 0;
    flex-direction: row; /* PC時は横並び */
  }

  /* ★追加：スマホ用のヘッダー（PCでは隠す） */
  .mobile-header {
    display: none;
    justify-content: space-between;
    align-items: center;
    background-color: #ffffff;
    padding: 16px 24px;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 30;
  }
  .mobile-header h2 { margin: 0; font-size: 1.2rem; color: #0f172a; font-weight: 700; }
  .hamburger-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #0f172a; padding: 0; }

  /* オーバーレイ（PCでは非表示） */
  .sidebar-overlay { display: none; }

  /* サイドバーの基本デザイン */
  .admin-sidebar {
    width: 260px;
    background-color: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    box-shadow: 1px 0 10px rgba(0,0,0,0.02);
    flex-shrink: 0; /* サイドバーが縮まないようにする */
  }

  .sidebar-header { padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
  .sidebar-header h2 { margin: 0; font-size: 1.2rem; color: #0f172a; font-weight: 700; }
  .close-btn { display: none; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b; }

  .sidebar-nav { display: flex; flex-direction: column; padding: 16px; gap: 8px; flex-grow: 1; overflow-y: auto; }
  .sidebar-nav a { text-decoration: none; color: #64748b; padding: 12px 16px; border-radius: 8px; font-size: 0.95rem; font-weight: 500; transition: all 0.2s ease; }
  .sidebar-nav a:hover { background-color: #f1f5f9; color: #0f172a; }
  .sidebar-nav a.active { background-color: #eff6ff; color: #2563eb; font-weight: 600; }

  .sidebar-footer { padding: 16px; border-top: 1px solid #f1f5f9; }
  .back-to-app { text-decoration: none; color: #94a3b8; font-size: 0.9rem; display: block; text-align: center; }
  .back-to-app:hover { color: #0f172a; }

  /* メインコンテンツエリア */
  .admin-main {
    flex-grow: 1;
    padding: 32px;
    background-color: #f8fafc;
    overflow-y: auto;
    width: calc(100vw - 260px); /* はみ出し防止 */
    box-sizing: border-box;
  }

  /* ======================================================== */
  /* ★ レスポンシブ対応（画面幅が 768px 以下のスマホ・タブレット用） */
  /* ======================================================== */
  @media (max-width: 768px) {
    .admin-app {
      flex-direction: column; /* 縦並びに変更 */
    }

    .mobile-header {
      display: flex; /* スマホ用ヘッダーを表示 */
    }

    .admin-main {
      width: 100%;
      padding: 16px; /* スマホでは余白を少し狭くする */
    }

    /* サイドバーを画面外（左側）に隠しておく */
    .admin-sidebar {
      position: fixed;
      top: 0;
      left: -280px; /* 完全に隠す */
      height: 100vh;
      z-index: 50;
      transition: left 0.3s ease; /* スライドインのアニメーション */
    }

    /* クラスに `open` が付いた時だけ画面内にスライドインする */
    .admin-sidebar.open {
      left: 0;
    }

    .sidebar-overlay {
      display: block; /* 半透明の黒背景を表示 */
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.5);
      z-index: 40;
    }

    .close-btn {
      display: block; /* スマホの時だけサイドバー内の「✕」ボタンを表示 */
    }
  }
</style>