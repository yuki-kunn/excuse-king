<script lang="ts">
  import { db, auth } from '$lib/firebase/firebase';
  import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
  import { onMount } from 'svelte';
  import type { User, NewUser, EditingUser } from '$lib/types/admin';
  import { adminApiPost, adminApiGet } from '$lib/utils/admin';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Modal from '$lib/components/admin/Modal.svelte';
  import Badge from '$lib/components/admin/Badge.svelte';
  import FormGroup from '$lib/components/admin/FormGroup.svelte';
  import '$lib/styles/admin-table.css';

  let users: User[] = [];
  let isLoading = true;
  let editingUser: EditingUser | null = null;
  let isCreating = false;
  let isSaving = false;
  let newUser: NewUser = { name: '', email: '', password: '', title: '見習い' };

  const fetchUsers = async () => {
    isLoading = true;
    try {
      const data = await adminApiGet('/api/admin/get-users');
      users = data.users.sort((a: User, b: User) => (b.totalPoints || 0) - (a.totalPoints || 0));
    } catch (error) {
      console.error("ユーザー取得エラー:", error);
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    fetchUsers();
  });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("名前、メールアドレス、パスワードは必須です！");
      return;
    }
    if (newUser.password.length < 6) {
      alert("パスワードは6文字以上で入力してください。");
      return;
    }

    isSaving = true;
    try {
      await adminApiPost('/api/admin/create-user', newUser);
      alert("✨ 新規ユーザー（ログインアカウント）を作成しました！");

      isCreating = false;
      newUser = { name: '', email: '', password: '', title: '見習い' };
      fetchUsers();
    } catch (error: any) {
      console.error("作成エラー:", error);
      alert(`エラー: ${error.message}`);
    } finally {
      isSaving = false;
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`本当にユーザー「${name}」のデータを削除しますか？\n※この操作は取り消せません。`)) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      users = users.filter(u => u.id !== id);
      alert('ユーザーを削除しました。');
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。");
    }
  };

  const openEditModal = (user: User) => {
    editingUser = { ...user } as EditingUser;
  };

  const handleSave = async () => {
    if (!editingUser) return;
    isSaving = true;
    try {
      await adminApiPost('/api/admin/update-user', {
        uid: editingUser.id,
        name: editingUser.name,
        email: editingUser.email,
        password: editingUser.newPassword,
        title: editingUser.title,
        totalPoints: editingUser.totalPoints
      });

      delete editingUser.newPassword;
      users = users.map(u => u.id === editingUser!.id ? editingUser! : u);

      editingUser = null;
      alert('ユーザー情報とログイン設定を更新しました！');
    } catch (error: any) {
      console.error("更新エラー:", error);
      alert(`エラー: ${error.message}`);
    } finally {
      isSaving = false;
    }
  };

  const closeCreateModal = () => {
    isCreating = false;
  };

  const closeEditModal = () => {
    editingUser = null;
  };
</script>

<div class="admin-page">
  <PageHeader
    title="👥 ユーザー管理"
    description="全ユーザーの閲覧・修正・削除、および新規作成が行えます。"
  >
    <button slot="actions" class="create-btn" on:click={() => (isCreating = true)}>
      ＋ 新規ユーザー作成
    </button>
  </PageHeader>

  <div class="table-container">
    {#if isLoading}
      <div class="loading-state">読み込み中...</div>
    {:else if users.length === 0}
      <div class="empty-state">ユーザーが登録されていません。</div>
    {:else}
      <table class="modern-table">
        <thead>
          <tr>
            <th>名前 / 状態</th>
            <th>メールアドレス</th>
            <th>称号</th>
            <th>総ポイント</th>
            <th class="actions-col">操作</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user}
            <tr class:banned-row={user.isBanned}>
              <td class="name-col">
                {user.name}
                {#if user.isBanned}
                  <Badge variant="ban" text="🚨凍結中" />
                {/if}
              </td>
              <td class="email-col">{user.email || '未設定'}</td>
              <td>
                <Badge variant="title" text={user.title || '見習い'} />
              </td>
              <td class="points-col">{user.totalPoints || 0} pt</td>
              <td class="actions-col">
                <button class="action-btn edit" on:click={() => openEditModal(user)}>編集</button>
                <button class="action-btn delete" on:click={() => handleDelete(user.id, user.name)}>削除</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <!-- 新規作成モーダル -->
  <Modal
    isOpen={isCreating}
    title="✨ 新規ユーザー作成"
    {isSaving}
    onClose={closeCreateModal}
    onSave={handleCreateUser}
    saveButtonText="作成する"
  >
    <p class="modal-hint">本物のログイン用アカウントを発行します。</p>

    <FormGroup label="名前 (表示名)" id="create-name">
      <input id="create-name" type="text" bind:value={newUser.name} placeholder="例：テスト太郎" />
    </FormGroup>

    <FormGroup label="ログイン用メールアドレス" id="create-email">
      <input id="create-email" type="email" bind:value={newUser.email} placeholder="例：test@example.com" />
    </FormGroup>

    <FormGroup label="ログイン用パスワード (6文字以上)" id="create-password">
      <input id="create-password" type="text" bind:value={newUser.password} placeholder="例：password123" />
    </FormGroup>

    <FormGroup label="初期の称号" id="create-title">
      <input id="create-title" type="text" bind:value={newUser.title} />
    </FormGroup>
  </Modal>

  <!-- 編集モーダル -->
  <Modal
    isOpen={editingUser !== null}
    title="ユーザー情報の編集"
    {isSaving}
    onClose={closeEditModal}
    onSave={handleSave}
  >
    {#if editingUser}
      <FormGroup label="名前" id="edit-name">
        <input id="edit-name" type="text" bind:value={editingUser.name} />
      </FormGroup>

      <FormGroup label="ログイン用メールアドレス" id="edit-email">
        <input
          id="edit-email"
          type="email"
          bind:value={editingUser.email}
          disabled={editingUser.provider === 'google.com'}
        />
      </FormGroup>

      {#if editingUser.provider === 'google.com'}
        <p class="modal-hint">※Google連携アカウントのため、パスワードの設定・変更はできません。</p>
      {:else}
        <FormGroup label="新しいパスワード (変更する場合のみ入力)" id="edit-password">
          <input id="edit-password" type="text" bind:value={editingUser.newPassword} placeholder="変更しない場合は空欄" />
        </FormGroup>
      {/if}

      <FormGroup label="称号" id="edit-title">
        <input id="edit-title" type="text" bind:value={editingUser.title} />
      </FormGroup>

      <FormGroup label="" id="edit-banned" danger={true}>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={editingUser.isBanned} />
          <span class="danger-text">🚨 このユーザーのアカウントを凍結（投稿禁止）にする</span>
        </label>
      </FormGroup>

      <FormGroup label="総ポイント" id="edit-points">
        <input id="edit-points" type="number" bind:value={editingUser.totalPoints} />
      </FormGroup>
    {/if}
  </Modal>
</div>

<style>
  .banned-row {
    opacity: 0.6;
    background-color: #fef2f2 !important;
  }

  .name-col {
    font-weight: 600;
    color: #0f172a;
  }

  .email-col {
    color: #64748b;
    font-size: 0.9rem;
  }

  .points-col {
    font-weight: 700;
    color: #2563eb;
  }

  .modal-hint {
    font-size: 0.85rem;
    color: #ef4444;
    margin-bottom: 24px;
    font-weight: bold;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .danger-text {
    color: #ef4444;
    font-weight: 700;
    font-size: 0.95rem;
  }

  @media (max-width: 768px) {
    .create-btn {
      width: 100%;
      padding: 14px;
      text-align: center;
      box-sizing: border-box;
    }
  }
</style>
