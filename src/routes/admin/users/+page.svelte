<script lang="ts">
  // ★ auth をインポートに追加します（管理者の証明書を取得するため）
  import { db, auth } from '$lib/firebase/firebase';
  import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
  import { onMount } from 'svelte';

  let users: any[] = [];
  let isLoading = true;
  let editingUser: any = null;

  // ★ 追加：新規作成用の変数
  let isCreating = false;
  let isSaving = false; // ボタン連打防止用
  let newUser = { name: '', email: '', password: '', title: '見習い' };

  const fetchUsers = async () => {
    isLoading = true;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("ログインしていません");
      
      // 管理者の身分証明書を取得
      const token = await currentUser.getIdToken();

      // ★修正：ここは 'update-user' ではなく 'get-users' APIを呼び出します！
      const res = await fetch('/api/admin/get-users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // ポイント順に並び替えて保存
      users = data.users.sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
    } catch (error) {
      console.error("ユーザー取得エラー:", error);
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    fetchUsers();
  });

  // ==========================================
  // ★ 追加：新規ユーザー作成処理（APIを叩く）
  // ==========================================
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
      // 1. 現在ログインしている管理者（あなた）の「身分証明書(トークン)」を取得
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("ログインしていません");
      const token = await currentUser.getIdToken();

      // 2. 先ほど作ったサーバー(API)へ、身分証明書と一緒にデータを送る！
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ここで管理者の証明書を提示
        },
        body: JSON.stringify(newUser)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ユーザーの作成に失敗しました");
      }

      alert("✨ 新規ユーザー（ログインアカウント）を作成しました！");
      
      // 入力欄をリセットしてモーダルを閉じ、一覧を最新化する
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

  // 削除処理
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

  // 編集モーダルを開く
  const openEditModal = (user: any) => {
    editingUser = { ...user };
  };

// 編集保存処理
  const handleSave = async () => {
    if (!editingUser) return;
    isSaving = true;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("ログインしていません");
      const token = await currentUser.getIdToken();

      // ★直接Firestoreを更新せず、さっき作ったAPIを叩く！
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uid: editingUser.id,
          name: editingUser.name,
          email: editingUser.email,
          password: editingUser.newPassword, // 新しいパスワード（あれば）
          title: editingUser.title,
          totalPoints: editingUser.totalPoints
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新に失敗しました");

      // 画面のリストを更新（パスワード情報は画面から消しておく）
      delete editingUser.newPassword; 
      users = users.map(u => u.id === editingUser.id ? editingUser : u);
      
      editingUser = null;
      alert('ユーザー情報とログイン設定を更新しました！');
    } catch (error: any) {
      console.error("更新エラー:", error);
      alert(`エラー: ${error.message}`);
    } finally {
      isSaving = false;
    }
  };
</script>

<div class="admin-page">
  <div class="page-header-row">
    <div class="page-header">
      <h1 class="page-title">👥 ユーザー管理</h1>
      <p class="page-description">全ユーザーの閲覧・修正・削除、および新規作成が行えます。</p>
    </div>
    
    <button class="btn create-btn" on:click={() => isCreating = true}>
    ＋ 新規ユーザー作成
    </button>
  </div>

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
                  <span class="badge ban-badge">🚨凍結中</span>
                {/if}
              </td>
              <td class="email-col">{user.email || '未設定'}</td>
              <td><span class="badge title-badge">{user.title || '見習い'}</span></td>
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

  {#if isCreating}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>✨ 新規ユーザー作成</h2>
        <p class="modal-hint">本物のログイン用アカウントを発行します。</p>
        
        <div class="form-group">
          <label for="create-name">名前 (表示名)</label>
          <input id="create-name" type="text" bind:value={newUser.name} placeholder="例：テスト太郎" />
        </div>

        <div class="form-group">
          <label for="create-email">ログイン用メールアドレス</label>
          <input id="create-email" type="email" bind:value={newUser.email} placeholder="例：test@example.com" />
        </div>

        <div class="form-group">
          <label for="create-password">ログイン用パスワード (6文字以上)</label>
          <input id="create-password" type="text" bind:value={newUser.password} placeholder="例：password123" />
        </div>
        
        <div class="form-group">
          <label for="create-title">初期の称号</label>
          <input id="create-title" type="text" bind:value={newUser.title} />
        </div>

        <div class="modal-actions">
          <button class="btn cancel-btn" on:click={() => isCreating = false} disabled={isSaving}>キャンセル</button>
          <button class="btn save-btn" on:click={handleCreateUser} disabled={isSaving}>
            {isSaving ? '作成中...' : '作成する'}
          </button>
        </div>
      </div>
    </div>
  {/if}

{#if editingUser}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>ユーザー情報の編集</h2>
        
        <div class="form-group">
          <label for="edit-name">名前</label>
          <input id="edit-name" type="text" bind:value={editingUser.name} />
        </div>

        <div class="form-group">
          <label for="edit-email">ログイン用メールアドレス</label>
          <input 
            id="edit-email" 
            type="email" 
            bind:value={editingUser.email} 
            disabled={editingUser.provider === 'google.com'} 
          />
        </div>

        {#if editingUser.provider === 'google.com'}
          <p class="modal-hint">※Google連携アカウントのため、パスワードの設定・変更はできません。</p>
        {:else}
          <div class="form-group">
            <label for="edit-password">新しいパスワード (変更する場合のみ入力)</label>
            <input id="edit-password" type="text" bind:value={editingUser.newPassword} placeholder="変更しない場合は空欄" />
          </div>
        {/if}
        
        <div class="form-group">
          <label for="edit-title">称号</label>
          <input id="edit-title" type="text" bind:value={editingUser.title} />
        </div>

        <div class="form-group danger-zone">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={editingUser.isBanned} />
            <span class="danger-text">🚨 このユーザーのアカウントを凍結（投稿禁止）にする</span>
          </label>
        </div>
        
        <div class="form-group">
          <label for="edit-points">総ポイント</label>
          <input id="edit-points" type="number" bind:value={editingUser.totalPoints} />
        </div>

        <div class="modal-actions">
          <button class="btn cancel-btn" on:click={() => editingUser = null} disabled={isSaving}>キャンセル</button>
          <button class="btn save-btn" on:click={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .ban-badge { background-color: #ef4444; color: white; margin-left: 8px; font-size: 0.7rem; }
  .banned-row { opacity: 0.6; background-color: #fef2f2 !important; }
  .danger-zone { margin-top: 24px; padding: 16px; border: 2px dashed #ef4444; border-radius: 8px; background-color: #fef2f2; }
  .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .checkbox-label input { width: 20px; height: 20px; cursor: pointer; }
  .danger-text { color: #ef4444; font-weight: 700; font-size: 0.95rem; }
  .admin-page { max-width: 1200px; margin: 0 auto; }
  
  /* ヘッダー周りのレイアウト調整 */
  .page-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .page-header { margin: 0; }
  .page-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
  .page-description { color: #64748b; margin: 0; }
  
  /* 新規作成ボタン */
  .create-btn { background-color: #10b981; color: white; padding: 12px 24px; font-size: 1rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); }
  .create-btn:hover { background-color: #059669; }

  .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
  .modern-table th { background-color: #f8fafc; padding: 16px; font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
  .modern-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
  .modern-table tbody tr:hover { background-color: #f8fafc; }
  
  .name-col { font-weight: 600; color: #0f172a; }
  .email-col { color: #64748b; font-size: 0.9rem; }
  .points-col { font-weight: 700; color: #2563eb; }

  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
  .title-badge { background-color: #fef3c7; color: #d97706; }

  .actions-col { text-align: right; }
  .action-btn { background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-left: 8px; }
  .action-btn.edit { color: #0f172a; }
  .action-btn.edit:hover { background-color: #f1f5f9; border-color: #94a3b8; }
  .action-btn.delete { color: #ef4444; border-color: #fca5a5; }
  .action-btn.delete:hover { background-color: #fef2f2; }

  .loading-state, .empty-state { padding: 48px; text-align: center; color: #64748b; }

  /* モーダル周り */
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.5); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(2px); }
  .modal-content { background: #fff; padding: 32px; border-radius: 16px; width: 100%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
  .modal-content h2 { margin: 0 0 8px 0; font-size: 1.4rem; color: #0f172a; }
  .modal-hint { font-size: 0.85rem; color: #ef4444; margin-bottom: 24px; font-weight: bold; }

  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; font-size: 0.9rem; font-weight: 600; color: #475569; margin-bottom: 8px; }
  .form-group input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
  .form-group input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

  .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }
  .btn { padding: 10px 20px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cancel-btn { background-color: #f1f5f9; color: #475569; }
  .cancel-btn:hover:not(:disabled) { background-color: #e2e8f0; }
  .save-btn { background-color: #2563eb; color: #fff; }
  .save-btn:hover:not(:disabled) { background-color: #1d4ed8; }
  @media (max-width: 768px) {

    .page-header-row {
      flex-direction: column; /* 横並びから縦並びに変更 */
      align-items: stretch;   /* 子要素（ボタン）を横幅いっぱいに広げる */
      gap: 16px;              /* タイトルとボタンの間に余白を作る */
      margin-bottom: 24px;
    }

    .page-title {
      font-size: 1.5rem; /* スマホでは少し文字を小さくしてスッキリさせる */
    }

    .create-btn {
      width: 100%; /* 親指でタップしやすいようにボタンを全幅にする */
      padding: 14px;
      text-align: center;
      box-sizing: border-box;
    }
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