<script lang="ts">
  import { db } from '$lib/firebase/firebase';
  import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
  import { onMount } from 'svelte';

  let posts: any[] = [];
  let isLoading = true;

  const fetchPosts = async () => {
    isLoading = true;
    try {
      const themesSnap = await getDocs(collection(db, 'themes'));
      const themesMap = new Map();
      themesSnap.forEach(d => themesMap.set(d.id, d.data().content));

      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = new Map();
      usersSnap.forEach(d => usersMap.set(d.id, d.data().name));

      const postsSnap = await getDocs(collection(db, 'posts'));
      posts = postsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          themeContent: themesMap.get(data.themeId) || '削除されたお題',
          userName: usersMap.get(data.uid) || '不明なユーザー',
          ...data
        };
      });

      posts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    } catch (error) {
      console.error("投稿取得エラー:", error);
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    fetchPosts();
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '不明';
    const date = timestamp.toDate();
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`この投稿を削除しますか？\n※ユーザーのポイントは自動で減算されません。`)) return;
    
    try {
      await deleteDoc(doc(db, 'posts', id));
      posts = posts.filter(p => p.id !== id);
      alert('投稿を削除しました。');
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。");
    }
  };
</script>

<div class="admin-page">
  <div class="page-header-row">
    <div class="page-header">
      <h1 class="page-title">📝 投稿管理</h1>
      <p class="page-description">ユーザーの言い訳（投稿）の確認および削除を行えます。</p>
    </div>
  </div>

  <div class="table-container">
    {#if isLoading}
      <div class="loading-state">読み込み中...</div>
    {:else if posts.length === 0}
      <div class="empty-state">まだ投稿がありません。</div>
    {:else}
      <table class="modern-table">
        <thead>
          <tr>
            <th>投稿者</th>
            <th class="theme-col">お題</th>
            <th class="excuse-col">言い訳の内容</th>
            <th>評価</th>
            <th>投稿日時</th>
            <th class="actions-col">操作</th>
          </tr>
        </thead>
        <tbody>
          {#each posts as post}
            <tr>
              <td class="author-col font-bold">{post.userName}</td>
              <td class="theme-col"><span class="theme-label">{post.themeContent}</span></td>
              <td class="excuse-col">{post.excuseText}</td>
              <td class="stats-col">
                <span class="stat-badge ai-score">AI {post.aiScore || 0}点</span>
                <span class="stat-badge likes">❤️ {post.likeCount || 0}</span>
              </td>
              <td class="date-col">{formatDate(post.createdAt)}</td>
              <td class="actions-col">
                <button class="action-btn delete" on:click={() => handleDelete(post.id)}>削除</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  /* 基本レイアウト（変更なし） */
  .admin-page { max-width: 1200px; margin: 0 auto; }
  .page-header-row { display: flex; flex-direction: column; margin-bottom: 24px; gap: 16px; }
  .page-header { margin: 0; }
  .page-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
  .page-description { color: #64748b; margin: 0; font-size: 0.95rem; }

  /* テーブルデザイン（変更なし） */
  .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
  .modern-table th { background-color: #f8fafc; padding: 16px; font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
  .modern-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; line-height: 1.5; }
  .modern-table tbody tr:hover { background-color: #f8fafc; }

  .font-bold { font-weight: 600; color: #0f172a; }
  .date-col { color: #64748b; font-size: 0.85rem; white-space: nowrap; }
  
  .theme-col { width: 25%; min-width: 150px; }
  .theme-label { display: inline-block; background-color: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500; }
  
  .excuse-col { width: 35%; min-width: 250px; font-size: 0.95rem; }

  .stats-col { white-space: nowrap; }
  .stat-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; margin-bottom: 4px; margin-right: 4px; }
  .ai-score { background-color: #fef3c7; color: #d97706; }
  .likes { background-color: #fee2e2; color: #ef4444; }

  .actions-col { text-align: right; min-width: 80px; white-space: nowrap; }
  .action-btn { background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .action-btn.delete { color: #ef4444; border-color: #fca5a5; }
  .action-btn.delete:hover { background-color: #fef2f2; }

  .loading-state, .empty-state { padding: 48px; text-align: center; color: #64748b; }

  /* ======================================================== */
  /* ★スマホ用レスポンシブ（Flexboxのorderを使って完璧に並び替える） */
  /* ======================================================== */
  @media (max-width: 768px) {
    .page-title { font-size: 1.5rem; }

    .table-container { background: transparent; border: none; box-shadow: none; }
    .modern-table thead { display: none; }
    
    .modern-table, .modern-table tbody, .modern-table td { display: block; width: 100%; box-sizing: border-box; }

    /* ★変更：行（tr）を flex の column（縦並び）にして、中の要素の順番を自由に操れるようにします */
    .modern-table tr {
      display: flex;
      flex-direction: column;
      background: #ffffff;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    .modern-table td { padding: 0; border: none; }

    /* ★追加：orderプロパティを使って、HTMLの順番を無視して綺麗に並び替えます！ */
    .author-col { order: 1; font-size: 1.1rem; color: #2563eb; margin-bottom: 2px; }
    .date-col   { order: 2; font-size: 0.8rem; color: #94a3b8; margin-bottom: 12px; white-space: normal; }
    .theme-col  { order: 3; margin-bottom: 8px; }
    .excuse-col { order: 4; margin-bottom: 12px; }
    .stats-col  { order: 5; margin-bottom: 12px; }
    .actions-col{ order: 6; }

    /* お題ラベル */
    .theme-label { display: block; border-left: 3px solid #cbd5e1; border-radius: 0 4px 4px 0; padding-left: 8px; background: transparent; }

    /* 言い訳本文 */
    .excuse-col {
      font-size: 1.05rem;
      color: #0f172a;
      background-color: #f8fafc;
      padding: 12px !important;
      border-radius: 8px;
    }

    /* 評価バッジ */
    .stats-col { display: flex; gap: 8px; }
    .stat-badge { margin: 0; }

    /* 操作ボタン */
    .actions-col {
      padding-top: 12px !important;
      border-top: 1px dashed #e2e8f0;
      text-align: right;
    }
  }
</style>