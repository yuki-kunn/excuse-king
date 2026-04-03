<script lang="ts">
  // ★追加: 画面遷移のための goto をインポート
  import { goto } from '$app/navigation';
  import { auth, provider, db } from '$lib/firebase/firebase';
  import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
  import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
  import { onMount } from 'svelte';

  let user: any = null;
  let dbUser: any = null;
  let isRegistering = false;
  let newUserName = "";
  // ★追加: 画面遷移中かどうかを判定するフラグ
  let isRedirecting = false; 

  onMount(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      user = currentUser;
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          // すでに登録済みのユーザーがログインした時
          dbUser = userSnap.data();
          isRegistering = false;
          
          // ★追加: 1.5秒待ってからマイページへ自動遷移！
          isRedirecting = true;
          setTimeout(() => {
            goto('/mypage');
          }, 1500);

        } else {
          // 初回ログイン（未登録）の時は登録画面へ
          isRegistering = true;
          newUserName = currentUser.displayName || "";
        }
      } else {
        dbUser = null;
        isRegistering = false;
        isRedirecting = false;
      }
    });
  });

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました。");
    }
  };

  const completeRegistration = async () => {
    if (!newUserName.trim()) {
      alert("ユーザー名を入力してください！");
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const newUserData = {
        name: newUserName,
        totalPoints: 0,
        title: "見習い",
        createdAt: serverTimestamp()
      };

      await setDoc(userRef, newUserData);
      
      dbUser = newUserData;
      isRegistering = false;
      
      // ★追加: 新規登録が完了した時も、1.5秒待ってマイページへ！
      isRedirecting = true;
      setTimeout(() => {
        goto('/mypage');
      }, 1500);
      
    } catch (error) {
      console.error("登録エラー:", error);
      alert("登録に失敗しました。");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      dbUser = null;
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };
</script>

<div class="home-container">
  <h1>言い訳の王様</h1>
  <p>AIの無茶振りお題に、最高の言い訳を返そう！</p>

  {#if isRegistering}
    <div class="registration-section">
      <h3>はじめまして！<br>あなたの「言い訳ネーム」を教えてください</h3>
      <input type="text" class="name-input" bind:value={newUserName} placeholder="例：遅刻魔のタカシ" maxlength="15" />
      <button class="btn submit-btn" on:click={completeRegistration}>この名前で始める！</button>
    </div>

  {:else if user && dbUser}
    <div class="user-info">
      <div class="user-badge">称号：{dbUser.title}</div>
      <p>ようこそ、<br><span class="highlight-name">{dbUser.name}</span> さん！</p>
      
      {#if isRedirecting}
        <p class="redirect-msg">🚀 マイページへ移動しています...</p>
      {:else}
        <button class="btn logout-btn" on:click={logout}>ログアウト</button>
      {/if}
    </div>

  {:else}
    <div class="login-section">
      <p>遊ぶにはログインしてください</p>
      <button class="btn login-btn" on:click={loginWithGoogle}>Googleアカウントでログイン</button>

      <div class="divider">
        <span>または</span>
      </div>

      <div class="email-auth-links">
        <a href="/login" class="btn email-login-btn">メール&パスワードでログイン</a>
        <p class="signup-prompt">アカウントをお持ちでない方</p>
        <a href="/signup" class="link">新規登録はこちら</a>
      </div>
    </div>
  {/if}
</div>

<style>
  .home-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 20px; text-align: center; }
  h1 { font-size: 40px; font-weight: 900; color: #ffffff; -webkit-text-stroke: 2px #222; text-shadow: 4px 4px 0px #ff4742; margin-bottom: 10px; letter-spacing: 2px; }
  p { font-weight: bold; color: #555; margin-bottom: 40px; }

  .btn { padding: 16px 32px; font-size: 16px; font-weight: 900; border: 4px solid #222; border-radius: 12px; cursor: pointer; transition: all 0.1s; box-shadow: 6px 6px 0px #222; width: 100%; max-width: 300px; box-sizing: border-box; }
  .btn:active { transform: translate(6px, 6px); box-shadow: 0px 0px 0px #222; }

  .login-btn { background-color: #4285F4; color: white; }
  .logout-btn { background-color: #e0e0e0; color: #222; margin-top: 24px; }
  .submit-btn { background-color: #ffcc00; color: #222; margin-top: 16px; }

  .registration-section { background-color: #fff; border: 4px solid #222; border-radius: 12px; padding: 24px; box-shadow: 6px 6px 0px #222; width: 100%; max-width: 320px; box-sizing: border-box; animation: popIn 0.3s ease-out; }
  .registration-section h3 { margin-top: 0; color: #222; line-height: 1.5; font-size: 18px; text-shadow: 1px 1px 0px #ffcc00; }
  
  .name-input { width: 100%; box-sizing: border-box; padding: 12px; font-size: 16px; font-weight: bold; border: 3px solid #222; border-radius: 8px; margin-top: 8px; text-align: center; }
  .name-input:focus { outline: none; background-color: #ffffee; }

  .user-info { background-color: #fff; border: 4px solid #222; border-radius: 12px; padding: 32px 24px; box-shadow: 6px 6px 0px #222; width: 100%; max-width: 320px; box-sizing: border-box; }
  .highlight-name { font-size: 24px; font-weight: 900; color: #ff4742; }
  .user-badge { background-color: #222; color: #ffcc00; display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 900; font-size: 14px; margin-bottom: 16px; }

  /* ★追加: リダイレクト中の文字を少し点滅させるアニメーション */
  .redirect-msg { color: #4285F4; font-weight: 900; margin-top: 24px; animation: pulse 1s infinite; }
  @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }

  /* メール認証セクションのスタイル */
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
    background-color: #f5f5f5;
    padding: 0 12px;
    color: #888;
    font-weight: bold;
    font-size: 14px;
  }

  .email-auth-links {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .email-login-btn {
    background-color: #ffcc00;
    color: #222;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .signup-prompt {
    margin: 8px 0 0 0;
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