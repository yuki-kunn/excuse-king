<script lang="ts">
  import { auth, provider } from '$lib/firebase/firebase';
  import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
  import { onMount } from 'svelte';

  // ログインしているユーザーの情報を保存する変数
  let user: any = null;

  // 画面が表示されたときに、すでにログインしているか確認します
  onMount(() => {
    onAuthStateChanged(auth, (currentUser) => {
      user = currentUser;
    });
  });

  // ログインボタンが押された時の処理
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました。");
    }
  };

  // ログアウトボタンが押された時の処理
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };
</script>

<div class="home-container">
  <h1>言い訳の王様</h1>
  <p>AIの無茶振りお題に、最高の言い訳を返そう！</p>

  {#if user}
    <div class="user-info">
      <p>ようこそ、{user.displayName} さん！</p>
      <button class="btn logout-btn" on:click={logout}>ログアウト</button>
    </div>
  {:else}
    <div class="login-section">
      <p>遊ぶにはログインしてください</p>
      <button class="btn login-btn" on:click={loginWithGoogle}>
        Googleアカウントでログイン
      </button>
    </div>
  {/if}
</div>

<style>
  .home-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    padding: 20px;
    text-align: center;
  }

  h1 {
    font-size: 40px;
    font-weight: 900;
    color: #ffffff;
    /* 文字の縁取りと、ドロップシャドウでゲームタイトル風に */
    -webkit-text-stroke: 2px #222;
    text-shadow: 4px 4px 0px #ff4742;
    margin-bottom: 10px;
    letter-spacing: 2px;
  }

  p {
    font-weight: bold;
    color: #555;
    margin-bottom: 40px;
  }

  /* ゲーム風の物理ボタンデザイン */
  .btn {
    padding: 16px 32px;
    font-size: 16px;
    font-weight: 900;
    border: 4px solid #222; /* 太い枠線 */
    border-radius: 12px; /* 少し丸みを持たせる */
    cursor: pointer;
    transition: all 0.1s;
    /* くっきりした影 */
    box-shadow: 6px 6px 0px #222;
  }

  /* ボタンを押した時の「沈み込む」アニメーション */
  .btn:active {
    transform: translate(6px, 6px);
    box-shadow: 0px 0px 0px #222;
  }

  .login-btn {
    background-color: #4285F4;
    color: white;
  }

  .logout-btn {
    background-color: #e0e0e0;
    color: #222;
  }

  .user-info {
    margin-top: 20px;
    font-weight: bold;
  }
</style>