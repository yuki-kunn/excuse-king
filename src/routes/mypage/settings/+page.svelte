<script lang="ts">
  import { goto } from '$app/navigation';
  import { db, auth } from '$lib/firebase/firebase';
  import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
  import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
  import { onMount, onDestroy } from 'svelte';

  let currentUser: any = null;
  let newName: string = "";
  let isUpdating = false;
  let unsubscribeAuth: () => void;

  onMount(() => {
    // ログイン状態の確認と、現在のユーザー名の取得
    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          newName = userSnap.data().name;
        }
      } else {
        // ログインしていなければHomeに戻す
        goto('/');
      }
    });
  });

  onDestroy(() => {
    if (unsubscribeAuth) unsubscribeAuth();
  });

  // 1. ユーザー名変更処理
  const handleUpdateName = async () => {
    if (!newName.trim()) {
      alert("新しいユーザー名を入力してください！");
      return;
    }
    isUpdating = true;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { name: newName });
      alert("ユーザー名を更新しました！");
      goto('/mypage'); // 変更後はマイページに戻る
    } catch (error) {
      console.error("更新エラー:", error);
      alert("更新に失敗しました。");
    }
    isUpdating = false;
  };

  // 2. ログアウト処理
  const handleLogout = async () => {
    if (confirm("ログアウトしますか？")) {
      try {
        await signOut(auth);
        goto('/');
      } catch (error) {
        console.error("ログアウトエラー:", error);
      }
    }
  };

  // 3. アカウント削除（退会）処理
  const handleDeleteAccount = async () => {
    if (confirm("【警告】本当にアカウントとすべてのデータを削除しますか？\nこの操作は取り消せません！")) {
      try {
        // ① データベースのユーザー情報を削除
        await deleteDoc(doc(db, 'users', currentUser.uid));
        // ② Google認証のアカウント連携を解除・削除
        await deleteUser(currentUser);
        
        alert("アカウントを削除しました。ご利用ありがとうございました！");
        goto('/');
      } catch (error: any) {
        console.error("退会エラー:", error);
        // セキュリティ上の理由で、ログインしてから時間が経ちすぎていると削除できないための対応
        if (error.code === 'auth/requires-recent-login') {
          alert("セキュリティのため、一度ログアウトして再度ログインし直してから退会処理を行ってください。");
        } else {
          alert("退会処理に失敗しました。");
        }
      }
    }
  };
</script>

<div class="settings-container">
  <a href="/mypage" class="back-btn">◀ マイページへ戻る</a>

  <h2 class="page-title">⚙️ ユーザー設定</h2>

  {#if currentUser}
    <div class="settings-card">
      
      <div class="section">
        <label for="nameInput" class="section-label">ユーザー名の変更</label>
        <div class="input-group">
          <input 
            id="nameInput" 
            type="text" 
            class="name-input" 
            bind:value={newName} 
            maxlength="15"
          />
          <button class="btn update-btn" on:click={handleUpdateName} disabled={isUpdating}>
            {isUpdating ? '更新中...' : '変更を保存'}
          </button>
        </div>
      </div>

      <hr class="divider" />

      <div class="section account-actions">
        <button class="btn logout-btn" on:click={handleLogout}>
          ログアウト
        </button>

        <button class="btn delete-btn" on:click={handleDeleteAccount}>
          アカウントを削除して退会する
        </button>
      </div>

    </div>
  {:else}
    <p class="loading">読み込み中...</p>
  {/if}
</div>

<style>
  .settings-container { padding: 20px; display: flex; flex-direction: column; align-items: center; }
  
  .back-btn { align-self: flex-start; text-decoration: none; color: #222; font-weight: 900; margin-bottom: 24px; background-color: #fff; border: 3px solid #222; padding: 6px 12px; border-radius: 8px; box-shadow: 3px 3px 0px #222; transition: all 0.1s; }
  .back-btn:active { transform: translate(3px, 3px); box-shadow: 0px 0px 0px #222; }

  .page-title { font-size: 28px; font-weight: 900; color: #222; margin-bottom: 24px; align-self: flex-start; }

  .settings-card { width: 100%; background-color: #fff; border: 4px solid #222; border-radius: 12px; padding: 24px; box-sizing: border-box; box-shadow: 6px 6px 0px #222; }

  .section { margin-bottom: 24px; }
  .section-label { display: block; font-weight: 900; color: #555; margin-bottom: 12px; font-size: 16px; }
  
  .input-group { display: flex; flex-direction: column; gap: 12px; }
  .name-input { width: 100%; box-sizing: border-box; padding: 12px; font-size: 16px; font-weight: bold; border: 3px solid #222; border-radius: 8px; }
  .name-input:focus { outline: none; background-color: #ffffee; border-color: #ffcc00; }

  .btn { width: 100%; padding: 14px; font-size: 16px; font-weight: 900; border: 3px solid #222; border-radius: 8px; cursor: pointer; box-shadow: 4px 4px 0px #222; transition: all 0.1s; box-sizing: border-box; }
  .btn:active:not(:disabled) { transform: translate(4px, 4px); box-shadow: 0px 0px 0px #222; }

  .update-btn { background-color: #ffcc00; color: #222; }
  .update-btn:disabled { background-color: #ccc; cursor: not-allowed; }

  .divider { border: 0; border-top: 2px dashed #ccc; margin: 32px 0; }

  .account-actions { display: flex; flex-direction: column; gap: 16px; margin-bottom: 0; }
  .logout-btn { background-color: #e0e0e0; color: #222; }
  .delete-btn { background-color: #fff; color: #ff4742; border-color: #ff4742; box-shadow: 4px 4px 0px #ff4742; }
  .delete-btn:active { box-shadow: 0px 0px 0px #ff4742; }
</style>