<script lang="ts">
  import { auth, provider, db } from '$lib/firebase/firebase';
  import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
  // ★追加：データベース（Firestore）を操作する機能を読み込みます
  import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
  import { onMount } from 'svelte';

  let user: any = null;       // Googleアカウントの基本情報
  let dbUser: any = null;     // Firestoreに保存したアプリ専用のユーザー情報
  let isRegistering = false;  // 「新規登録画面」を表示するかどうかのフラグ
  let newUserName = "";       // 入力された新しいユーザー名

  onMount(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      user = currentUser;
      
      if (currentUser) {
        // ログインしたら、Firestoreの 'users' コレクションにデータがあるか確認します
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          // すでに登録済みのユーザーなら、データを読み込んで通常画面へ
          dbUser = userSnap.data();
          isRegistering = false;
        } else {
          // データがない（初めてのログイン）なら、新規登録画面へ切り替え
          isRegistering = true;
          // 初期値として、とりあえずGoogleの名前を枠に入れておいてあげます
          newUserName = currentUser.displayName || "";
        }
      } else {
        dbUser = null;
        isRegistering = false;
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

  // ★追加：ユーザー名を決めて「登録完了」を押した時の処理
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
        title: "見習い", // 最初は「見習い」の称号を与えます
        createdAt: serverTimestamp()
      };

      // データベースの 'users' コレクションに保存！
      await setDoc(userRef, newUserData);
      
      dbUser = newUserData;
      isRegistering = false;
      
    } catch (error) {
      console.error("登録エラー:", error);
      alert("登録に失敗しました。");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // ログアウトした時に画面の表示もリセットします
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
      <input 
        type="text" 
        class="name-input" 
        bind:value={newUserName} 
        placeholder="例：遅刻魔のタカシ"
        maxlength="15"
      />
      <button class="btn submit-btn" on:click={completeRegistration}>
        この名前で始める！
      </button>
    </div>

  {:else if user && dbUser}
    <div class="user-info">
      <div class="user-badge">称号：{dbUser.title}</div>
      <p>ようこそ、<br><span class="highlight-name">{dbUser.name}</span> さん！</p>
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
  .home-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 20px; text-align: center; }
  h1 { font-size: 40px; font-weight: 900; color: #ffffff; -webkit-text-stroke: 2px #222; text-shadow: 4px 4px 0px #ff4742; margin-bottom: 10px; letter-spacing: 2px; }
  p { font-weight: bold; color: #555; margin-bottom: 40px; }

  /* 共通ボタン */
  .btn { padding: 16px 32px; font-size: 16px; font-weight: 900; border: 4px solid #222; border-radius: 12px; cursor: pointer; transition: all 0.1s; box-shadow: 6px 6px 0px #222; width: 100%; max-width: 300px; box-sizing: border-box; }
  .btn:active { transform: translate(6px, 6px); box-shadow: 0px 0px 0px #222; }

  .login-btn { background-color: #4285F4; color: white; }
  .logout-btn { background-color: #e0e0e0; color: #222; margin-top: 24px; }
  .submit-btn { background-color: #ffcc00; color: #222; margin-top: 16px; }

  /* 登録画面のスタイル */
  .registration-section { background-color: #fff; border: 4px solid #222; border-radius: 12px; padding: 24px; box-shadow: 6px 6px 0px #222; width: 100%; max-width: 320px; box-sizing: border-box; animation: popIn 0.3s ease-out; }
  .registration-section h3 { margin-top: 0; color: #222; line-height: 1.5; font-size: 18px; text-shadow: 1px 1px 0px #ffcc00; }
  
  .name-input { width: 100%; box-sizing: border-box; padding: 12px; font-size: 16px; font-weight: bold; border: 3px solid #222; border-radius: 8px; margin-top: 8px; text-align: center; }
  .name-input:focus { outline: none; background-color: #ffffee; }

  /* ユーザー情報のスタイル */
  .user-info { background-color: #fff; border: 4px solid #222; border-radius: 12px; padding: 32px 24px; box-shadow: 6px 6px 0px #222; width: 100%; max-width: 320px; box-sizing: border-box; }
  .highlight-name { font-size: 24px; font-weight: 900; color: #ff4742; }
  .user-badge { background-color: #222; color: #ffcc00; display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 900; font-size: 14px; margin-bottom: 16px; }

  @keyframes popIn { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
</style>