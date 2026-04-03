<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth, db, googleProvider } from '$lib/firebase/firebase';
  import {
    createUserWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged
  } from 'firebase/auth';
  import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
  import { onMount } from 'svelte';

  let email = '';
  let password = '';
  let confirmPassword = '';
  let userName = '';
  let errorMessage = '';
  let isLoading = false;

  // すでにログイン済みの場合はマイページへリダイレクト
  onMount(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          goto('/mypage');
        }
      }
    });
  });

  const validateForm = (): boolean => {
    if (!email.trim() || !password.trim() || !userName.trim()) {
      errorMessage = 'すべての項目を入力してください';
      return false;
    }

    if (password.length < 6) {
      errorMessage = 'パスワードは6文字以上で入力してください';
      return false;
    }

    if (password !== confirmPassword) {
      errorMessage = 'パスワードが一致しません';
      return false;
    }

    if (userName.length > 15) {
      errorMessage = 'ユーザー名は15文字以内で入力してください';
      return false;
    }

    return true;
  };

  const signupWithEmail = async () => {
    errorMessage = '';

    if (!validateForm()) {
      return;
    }

    isLoading = true;

    try {
      // Firebase Authにアカウントを作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Firestoreにユーザー情報を保存
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        name: userName,
        email: email,
        totalPoints: 0,
        title: "見習い",
        createdAt: serverTimestamp()
      });

      // 登録完了後、マイページへリダイレクト
      setTimeout(() => {
        goto('/mypage');
      }, 500);

    } catch (error: any) {
      isLoading = false;
      console.error('新規登録エラー:', error);

      // エラーメッセージを日本語化
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'このメールアドレスは既に使用されています';
          break;
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません';
          break;
        case 'auth/weak-password':
          errorMessage = 'パスワードが弱すぎます（6文字以上推奨）';
          break;
        default:
          errorMessage = '新規登録に失敗しました。もう一度お試しください';
      }
    }
  };

  const signupWithGoogle = async () => {
    try {
      isLoading = true;
      const result = await signInWithPopup(auth, googleProvider);

      // Firestoreにユーザーが存在するか確認
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // 新規ユーザーの場合はFirestoreに保存
        await setDoc(userRef, {
          name: result.user.displayName || 'ユーザー',
          email: result.user.email,
          totalPoints: 0,
          title: "見習い",
          createdAt: serverTimestamp()
        });
      }

      // マイページへリダイレクト
      goto('/mypage');

    } catch (error) {
      console.error('Google認証エラー:', error);
      errorMessage = 'Googleログインに失敗しました';
      isLoading = false;
    }
  };
</script>

<div class="signup-container">
  <h1>新規登録</h1>
  <p>言い訳の王様へようこそ！</p>

  <div class="signup-box">
    {#if errorMessage}
      <div class="error-message">{errorMessage}</div>
    {/if}

    <div class="input-group">
      <label for="userName">ユーザー名（言い訳ネーム）</label>
      <input
        id="userName"
        type="text"
        class="text-input"
        bind:value={userName}
        placeholder="例：遅刻魔のタカシ"
        maxlength="15"
        disabled={isLoading}
      />
    </div>

    <div class="input-group">
      <label for="email">メールアドレス</label>
      <input
        id="email"
        type="email"
        class="text-input"
        bind:value={email}
        placeholder="example@mail.com"
        disabled={isLoading}
      />
    </div>

    <div class="input-group">
      <label for="password">パスワード（6文字以上）</label>
      <input
        id="password"
        type="password"
        class="text-input"
        bind:value={password}
        placeholder="••••••"
        disabled={isLoading}
      />
    </div>

    <div class="input-group">
      <label for="confirmPassword">パスワード（確認）</label>
      <input
        id="confirmPassword"
        type="password"
        class="text-input"
        bind:value={confirmPassword}
        placeholder="••••••"
        disabled={isLoading}
      />
    </div>

    <button
      class="btn signup-btn"
      on:click={signupWithEmail}
      disabled={isLoading}
    >
      {isLoading ? '登録中...' : 'アカウント作成'}
    </button>

    <div class="divider">
      <span>または</span>
    </div>

    <button
      class="btn google-btn"
      on:click={signupWithGoogle}
      disabled={isLoading}
    >
      Googleアカウントで登録
    </button>

    <div class="link-section">
      <p>すでにアカウントをお持ちですか？</p>
      <a href="/login" class="link">ログインはこちら</a>
    </div>
  </div>
</div>

<style>
  .signup-container {
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

  .signup-box {
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

  .signup-btn {
    background-color: #ffcc00;
    color: #222;
    margin-bottom: 16px;
  }

  .google-btn {
    background-color: #4285F4;
    color: white;
  }

  .divider {
    position: relative;
    text-align: center;
    margin: 20px 0;
  }

  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background-color: #ddd;
  }

  .divider span {
    position: relative;
    background-color: #fff;
    padding: 0 12px;
    color: #888;
    font-weight: bold;
    font-size: 14px;
  }

  .link-section {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 2px solid #eee;
  }

  .link-section p {
    margin-bottom: 8px;
    font-size: 14px;
    color: #666;
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
