<script lang="ts">
  import { db } from '$lib/firebase/firebase';
  import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
  import { onMount } from 'svelte';

  let themes: any[] = [];
  let isLoading = true;
  let editingTheme: any = null;
  let isSaving = false;

  const fetchThemes = async () => {
    isLoading = true;
    try {
      const snap = await getDocs(collection(db, 'themes'));
      themes = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      themes.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    } catch (error) {
      console.error("お題取得エラー:", error);
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    fetchThemes();
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '不明';
    const date = timestamp.toDate();
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleDelete = async (id: string, content: string) => {
    if (!confirm(`お題「${content}」を削除しますか？\n※すでに投稿されている言い訳の表示に影響が出る可能性があります。`)) return;
    try {
      await deleteDoc(doc(db, 'themes', id));
      themes = themes.filter(t => t.id !== id);
      alert('お題を削除しました。');
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。");
    }
  };

  const openEditModal = (theme: any) => {
    editingTheme = { ...theme };
  };

  const handleSave = async () => {
    if (!editingTheme) return;
    isSaving = true;
    try {
      const themeRef = doc(db, 'themes', editingTheme.id);
      await updateDoc(themeRef, { content: editingTheme.content });
      themes = themes.map(t => t.id === editingTheme.id ? editingTheme : t);
      editingTheme = null;
      alert('お題を更新しました！');
    } catch (error) {
      console.error("更新エラー:", error);
      alert("更新に失敗しました。");
    } finally {
      isSaving = false;
    }
  };
</script>

<div class="admin-page">
  <div class="page-header">
    <h1 class="page-title">👑 お題管理</h1>
    <p class="page-description">ユーザーやAIが作成したお題の確認・修正・削除を行えます。</p>
  </div>

  <div class="table-container">
    {#if isLoading}
      <div class="loading-state">読み込み中...</div>
    {:else if themes.length === 0}
      <div class="empty-state">お題が登録されていません。</div>
    {:else}
      <table class="modern-table">
        <thead>
          <tr>
            <th class="content-col">お題の内容</th>
            <th>作成者</th>
            <th>作成日時</th>
            <th class="actions-col">操作</th>
          </tr>
        </thead>
        <tbody>
          {#each themes as theme}
            <tr>
              <td class="content-col font-bold">{theme.content}</td>
              <td class="author-col">
                {#if theme.createdBy === 'AI'}
                  <span class="badge ai-badge">AI自動生成</span>
                {:else}
                  <span class="badge user-badge">ユーザー</span>
                {/if}
              </td>
              <td class="date-col">{formatDate(theme.createdAt)}</td>
              <td class="actions-col">
                <button class="action-btn edit" on:click={() => openEditModal(theme)}>編集</button>
                <button class="action-btn delete" on:click={() => handleDelete(theme.id, theme.content)}>削除</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  {#if editingTheme}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>お題の編集</h2>
        <div class="form-group">
          <label for="edit-content">お題の内容</label>
          <textarea id="edit-content" bind:value={editingTheme.content} rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn cancel-btn" on:click={() => editingTheme = null} disabled={isSaving}>キャンセル</button>
          <button class="btn save-btn" on:click={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .admin-page { max-width: 1200px; margin: 0 auto; }
  .page-header { margin-bottom: 24px; }
  .page-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
  .page-description { color: #64748b; margin: 0; }

  /* PC用のテーブルデザイン（枠線を消してスッキリさせる） */
  .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
  .modern-table th { background-color: #f8fafc; padding: 16px; font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
  .modern-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; line-height: 1.5; }
  .modern-table tbody tr:hover { background-color: #f8fafc; }

  .content-col { width: 50%; min-width: 300px; }
  .font-bold { font-weight: 600; color: #0f172a; }
  .date-col { color: #64748b; font-size: 0.9rem; }

  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
  .ai-badge { background-color: #dbeafe; color: #1d4ed8; }
  .user-badge { background-color: #f1f5f9; color: #475569; }

  .actions-col { text-align: right; min-width: 140px; }
  .action-btn { background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-left: 8px; }
  .action-btn.edit { color: #0f172a; }
  .action-btn.edit:hover { background-color: #f1f5f9; border-color: #94a3b8; }
  .action-btn.delete { color: #ef4444; border-color: #fca5a5; }
  .action-btn.delete:hover { background-color: #fef2f2; }

  .loading-state, .empty-state { padding: 48px; text-align: center; color: #64748b; }

  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.5); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(2px); }
  .modal-content { background: #fff; padding: 32px; border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); margin: 16px; }
  .modal-content h2 { margin: 0 0 24px 0; font-size: 1.4rem; color: #0f172a; }

  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; font-size: 0.9rem; font-weight: 600; color: #475569; margin-bottom: 8px; }
  .form-group textarea { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; box-sizing: border-box; resize: vertical; font-family: inherit; }
  .form-group textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

  .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }
  .btn { padding: 10px 20px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cancel-btn { background-color: #f1f5f9; color: #475569; }
  .save-btn { background-color: #2563eb; color: #fff; }

  /* ======================================================== */
  /* ★追加：スマホ用レスポンシブ（テーブルをカード型に変換） */
  /* ======================================================== */
  @media (max-width: 768px) {
    /* テーブル全体の背景と線を消す */
    .table-container {
      background: transparent;
      border: none;
      box-shadow: none;
    }
    
    /* ヘッダー行を隠す */
    .modern-table thead {
      display: none;
    }

    /* 行（tr）を独立したカードにする */
    .modern-table, .modern-table tbody, .modern-table tr, .modern-table td {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }

    .modern-table tr {
      background: #ffffff;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    /* 各セルの余白を調整 */
    .modern-table td {
      padding: 0 0 8px 0;
      border: none;
    }
    .modern-table td:last-child {
      padding-bottom: 0;
    }

    /* お題内容を大きく目立たせる */
    .content-col {
      font-size: 1.1rem;
      margin-bottom: 12px;
      min-width: 0; /* PC用の幅指定を解除 */
    }

    /* 作成者バッジと日付を横並びに */
    .author-col, .date-col {
      display: inline-block;
      width: auto;
    }
    .date-col {
      margin-left: 8px;
    }

    /* 操作ボタンを右下に配置 */
    .actions-col {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #e2e8f0;
      text-align: right;
    }
  }
</style>