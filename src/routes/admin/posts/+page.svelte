<script lang="ts">
  import { db } from '$lib/firebase/firebase';
  import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
  import { onMount } from 'svelte';
  import type { Post } from '$lib/types/admin';
  import { formatDate } from '$lib/utils/admin';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Badge from '$lib/components/admin/Badge.svelte';
  import '$lib/styles/admin-table.css';

  let posts: Post[] = [];
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
        } as Post;
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
  <PageHeader
    title="📝 投稿管理"
    description="ユーザーの言い訳（投稿）の確認および削除を行えます。"
  />

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
                <Badge variant="ai-score" text="AI {post.aiScore || 0}点" />
                <Badge variant="likes" text="❤️ {post.likeCount || 0}" />
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
  .font-bold {
    font-weight: 600;
    color: #0f172a;
  }

  .date-col {
    color: #64748b;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .theme-col {
    width: 25%;
    min-width: 150px;
  }

  .theme-label {
    display: inline-block;
    background-color: #f1f5f9;
    color: #475569;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .excuse-col {
    width: 35%;
    min-width: 250px;
    font-size: 0.95rem;
  }

  .stats-col {
    white-space: nowrap;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .modern-table tr {
      display: flex;
      flex-direction: column;
    }

    .modern-table td {
      padding: 0;
      border: none;
    }

    .author-col {
      order: 1;
      font-size: 1.1rem;
      color: #2563eb;
      margin-bottom: 2px;
    }

    .date-col {
      order: 2;
      font-size: 0.8rem;
      color: #94a3b8;
      margin-bottom: 12px;
      white-space: normal;
    }

    .theme-col {
      order: 3;
      margin-bottom: 8px;
    }

    .excuse-col {
      order: 4;
      margin-bottom: 12px;
    }

    .stats-col {
      order: 5;
      margin-bottom: 12px;
    }

    .actions-col {
      order: 6;
    }

    .theme-label {
      display: block;
      border-left: 3px solid #cbd5e1;
      border-radius: 0 4px 4px 0;
      padding-left: 8px;
      background: transparent;
    }

    .excuse-col {
      font-size: 1.05rem;
      color: #0f172a;
      background-color: #f8fafc;
      padding: 12px !important;
      border-radius: 8px;
    }

    .stats-col {
      display: flex;
      gap: 8px;
    }

    .actions-col {
      padding-top: 12px !important;
      border-top: 1px dashed #e2e8f0;
      text-align: right;
    }
  }
</style>
