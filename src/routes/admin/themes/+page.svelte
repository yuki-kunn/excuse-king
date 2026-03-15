<script lang="ts">
  import { db } from '$lib/firebase/firebase';
  import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
  import { onMount } from 'svelte';
  import type { Theme } from '$lib/types/admin';
  import { formatDate } from '$lib/utils/admin';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Modal from '$lib/components/admin/Modal.svelte';
  import Badge from '$lib/components/admin/Badge.svelte';
  import FormGroup from '$lib/components/admin/FormGroup.svelte';
  import '$lib/styles/admin-table.css';

  let themes: Theme[] = [];
  let isLoading = true;
  let editingTheme: Theme | null = null;
  let isSaving = false;

  const fetchThemes = async () => {
    isLoading = true;
    try {
      const snap = await getDocs(collection(db, 'themes'));
      themes = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Theme));
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

  const openEditModal = (theme: Theme) => {
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

  const closeModal = () => {
    editingTheme = null;
  };
</script>

<div class="admin-page">
  <PageHeader
    title="👑 お題管理"
    description="ユーザーやAIが作成したお題の確認・修正・削除を行えます。"
  />

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
                  <Badge variant="ai" text="AI自動生成" />
                {:else}
                  <Badge variant="user" text="ユーザー" />
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

  <Modal
    isOpen={editingTheme !== null}
    title="お題の編集"
    {isSaving}
    onClose={closeModal}
    onSave={handleSave}
  >
    {#if editingTheme}
      <FormGroup label="お題の内容" id="edit-content">
        <textarea id="edit-content" bind:value={editingTheme.content} rows="3"></textarea>
      </FormGroup>
    {/if}
  </Modal>
</div>

<style>
  .content-col {
    width: 50%;
    min-width: 300px;
  }

  .font-bold {
    font-weight: 600;
    color: #0f172a;
  }

  .date-col {
    color: #64748b;
    font-size: 0.9rem;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .content-col {
      font-size: 1.1rem;
      margin-bottom: 12px;
      min-width: 0;
    }

    .author-col,
    .date-col {
      display: inline-block;
      width: auto;
    }

    .date-col {
      margin-left: 8px;
    }
  }
</style>
