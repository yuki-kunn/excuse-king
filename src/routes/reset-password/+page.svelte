<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/firebase/firebase';
  import { sendPasswordResetEmail } from 'firebase/auth';

  let email = '';
  let errorMessage = '';
  let successMessage = '';
  let isLoading = false;

  const resetPassword = async () => {
    errorMessage = '';
    successMessage = '';

    if (!email.trim()) {
      errorMessage = 'メールアドレスを入力してください';
      return;
    }

    isLoading = true;

    try {
      await sendPasswordResetEmail(auth, email);
      successMessage = 'パスワードリセット用のメールを送信しました。メールボックスをご確認ください。';
      email = '';

      // 5秒後にログインページへリダイレクト
      setTimeout(() => {
        goto('/login');
      }, 5000);

    } catch (error: any) {
      console.error('パスワードリセットエラー:', error);

      // エラーメッセージを日本語化
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'このメールアドレスは登録されていません';
          break;
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'リクエストが多すぎます。しばらくしてからお試しください';
          break;
        default:
          errorMessage = 'パスワードリセットに失敗しました。もう一度お試しください';
      }
    } finally {
      isLoading = false;
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      resetPassword();
    }
  };
</script>

<div class="reset-container">
  <h1>パスワードリセット</h1>
  <p>登録したメールアドレスを入力してください</p>

  <div class="reset-box">
    {#if errorMessage}
      <div class="error-message">{errorMessage}</div>
    {/if}

    {#if successMessage}
      <div class="success-message">
        <div class="success-icon">✓</div>
        <p>{successMessage}</p>
        <p class="redirect-msg">5秒後にログインページへ移動します...</p>
      </div>
    {:else}
      <div class="input-group">
        <label for="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          class="text-input"
          bind:value={email}
          placeholder="example@mail.com"
          disabled={isLoading}
          on:keypress={handleKeyPress}
        />
      </div>

      <button
        class="btn reset-btn"
        on:click={resetPassword}
        disabled={isLoading}
      >
        {isLoading ? '送信中...' : 'リセットメールを送信'}
      </button>

      <div class="link-section">
        <a href="/login" class="link">ログインに戻る</a>
      </div>
    {/if}
  </div>
</div>

<style>
  .reset-container {
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
    -webkit-text-stroke: 2px #222;
    text-shadow: 4px 4px 0px #ff4742;
    margin-bottom: 10px;
    letter-spacing: 2px;
  }

  p {
    font-weight: bold;
    color: #555;
    margin-bottom: 30px;
  }

  .reset-box {
    background-color: #fff;
    border: 4px solid #222;
    border-radius: 12px;
    padding: 32px 24px;
    box-shadow: 6px 6px 0px #222;
    width: 100%;
    max-width: 400px;
    box-sizing: border-box;
  }

  .error-message {
    background-color: #ffe6e6;
    border: 3px solid #ff4742;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    color: #d32f2f;
    font-weight: bold;
    font-size: 14px;
  }

  .success-message {
    text-align: center;
    padding: 20px 0;
  }

  .success-icon {
    width: 60px;
    height: 60px;
    background-color: #4caf50;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    font-weight: 900;
    margin: 0 auto 16px;
    border: 4px solid #222;
    box-shadow: 4px 4px 0px #222;
  }

  .success-message p {
    color: #222;
    font-weight: bold;
    line-height: 1.6;
    margin-bottom: 8px;
  }

  .redirect-msg {
    color: #4285F4;
    font-size: 14px;
    margin-top: 16px;
  }

  .input-group {
    margin-bottom: 16px;
    text-align: left;
  }

  label {
    display: block;
    font-weight: 900;
    color: #222;
    margin-bottom: 6px;
    font-size: 14px;
  }

  .text-input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    font-size: 16px;
    font-weight: 600;
    border: 3px solid #222;
    border-radius: 8px;
    background-color: #fff;
  }

  .text-input:focus {
    outline: none;
    background-color: #ffffee;
  }

  .text-input:disabled {
    background-color: #f0f0f0;
    cursor: not-allowed;
  }

  .btn {
    width: 100%;
    padding: 14px 24px;
    font-size: 16px;
    font-weight: 900;
    border: 4px solid #222;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.1s;
    box-shadow: 6px 6px 0px #222;
    box-sizing: border-box;
  }

  .btn:active:not(:disabled) {
    transform: translate(6px, 6px);
    box-shadow: 0px 0px 0px #222;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .reset-btn {
    background-color: #ffcc00;
    color: #222;
    margin-bottom: 16px;
  }

  .link-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 2px solid #eee;
  }

  .link {
    color: #4285F4;
    font-weight: 900;
    text-decoration: none;
    font-size: 16px;
  }

  .link:hover {
    text-decoration: underline;
  }
</style>
