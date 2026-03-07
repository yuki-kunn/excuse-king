<script lang="ts">
  import { goto } from '$app/navigation';
  import { db, auth } from '$lib/firebase/firebase';
  // ★追加: updateDoc, increment をインポート
  import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';

  export let data: any;
  const theme = data.theme;
  const themeId = theme.id;

  let excuseText = "";
  let isSubmitting = false;
  let aiResult: { score: number, comment: string } | null = null;

  // ★追加：ポイントに応じた称号を計算する関数
  const getTitle = (points: number) => {
    if (points >= 100) return "言い訳の神";
    if (points >= 50) return "言い訳の達人";
    if (points >= 20) return "言い訳のプロ";
    return "見習い";
  };

  const submitExcuse = async () => {
    if (!excuseText.trim()) {
      alert("言い訳を入力してください！");
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      alert("投稿するにはログインが必要です。");
      return;
    }

    isSubmitting = true;

    // 重複チェック
    try {
      const duplicateQuery = query(
        collection(db, 'posts'),
        where('themeId', '==', themeId),
        where('uid', '==', user.uid)
      );
      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
        alert("このお題にはすでに言い訳を投稿済みです！（1お題につき1回まで）");
        isSubmitting = false;
        return;
      }
    } catch (checkError) {
      console.error("重複チェックエラー:", checkError);
    }

    try {
      // AI判定
      const aiResponse = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeText: theme.content,
          excuseText: excuseText
        })
      });

      if (!aiResponse.ok) throw new Error("AIエラー");
      
      const evaluation = await aiResponse.json();
      
      aiResult = evaluation;
      isSubmitting = false;

      // ユーザー名の取得と、現在のポイント取得
      let customName = "名無し";
      let currentPoints = 0;
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          customName = userSnap.data().name;
          currentPoints = userSnap.data().totalPoints || 0;
        }
      } catch (e) {
        console.error("ユーザー情報の取得に失敗しました:", e);
      }

      // データベースに投稿を保存
      try {
        await addDoc(collection(db, 'posts'), {
          themeId: themeId,
          uid: user.uid,
          userId: customName,
          excuseText: excuseText,
          aiScore: evaluation.score,
          aiComment: evaluation.comment,
          likeCount: 0,
          createdAt: serverTimestamp()
        });

        // =========================================================
        // ★追加：ユーザーの所持ポイントにAIの点数を足し、称号を更新する！
        // =========================================================
        const newPoints = currentPoints + evaluation.score;
        const newTitle = getTitle(newPoints);
        
        await updateDoc(doc(db, 'users', user.uid), {
          totalPoints: increment(evaluation.score),
          title: newTitle
        });

      } catch (dbError) {
        console.error("データベース保存エラー:", dbError);
      }

    } catch (error) {
      console.error("投稿エラー:", error);
      alert("エラーが発生しました。もう一度お試しください。");
      isSubmitting = false;
    }
  };

  $: shareText = aiResult 
    ? `お題「${theme.content}」に対する私の言い訳\n\n「${excuseText}」\n\nAI判定: ${aiResult.score}点\n🤖「${aiResult.comment}」\n\n#言い訳の王様`
    : "";
  $: shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
</script>

<div class="post-container">
  {#if aiResult}
    <div class="result-box">
      <h2 class="result-title">🎯 判定結果 🎯</h2>
      <div class="score-circle">
        <span class="score-number">{aiResult.score}</span>
        <span class="score-max">/ 10点</span>
      </div>
      <div class="comment-box">
        <div class="comment-icon">🤖</div>
        <p class="comment-text">「{aiResult.comment}」</p>
      </div>
      <div class="action-buttons">
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" class="btn share-btn">𝕏 でシェアする</a>
        <button class="btn back-to-list-btn" on:click={() => goto(`/themes/${themeId}`)}>みんなの言い訳を見る</button>
      </div>
    </div>
  {:else}
    <a href={`/themes/${themeId}`} class="back-btn">◀ キャンセル</a>
    <div class="theme-box">
      <span class="theme-label">お題</span>
      <h2 class="theme-title">{theme.content}</h2>
    </div>
    <div class="input-area">
      <label for="excuse" class="input-label">あなたの言い訳をひねり出せ！</label>
      <textarea id="excuse" bind:value={excuseText} placeholder="いや、これには深い海よりも深い訳がありまして..." rows="5" disabled={isSubmitting}></textarea>
    </div>
    <button class="btn submit-btn" class:loading={isSubmitting} on:click={submitExcuse} disabled={isSubmitting}>
      {#if isSubmitting}🤖 審査員が判定中...{:else}🔥 言い訳をかます！{/if}
    </button>
  {/if}
</div>

<style>
  .post-container { padding: 20px; display: flex; flex-direction: column; align-items: center; }
  .btn { width: 100%; padding: 16px; font-size: 18px; font-weight: 900; border: 4px solid #222; border-radius: 12px; cursor: pointer; box-shadow: 6px 6px 0px #222; transition: all 0.1s; text-align: center; box-sizing: border-box; text-decoration: none; display: block; }
  .btn:not(:disabled):active { transform: translate(6px, 6px); box-shadow: 0px 0px 0px #222; }
  .back-btn { align-self: flex-start; text-decoration: none; color: #222; font-weight: 900; margin-bottom: 24px; background-color: #fff; border: 3px solid #222; padding: 6px 12px; border-radius: 8px; box-shadow: 3px 3px 0px #222; }
  .theme-box { background-color: #222; color: #fff; width: 100%; box-sizing: border-box; padding: 20px; border-radius: 12px; margin-bottom: 32px; transform: rotate(-1deg); box-shadow: 6px 6px 0px #ffcc00; }
  .theme-label { background-color: #ffcc00; color: #222; font-weight: 900; padding: 4px 12px; border-radius: 20px; font-size: 14px; display: inline-block; margin-bottom: 8px; }
  .theme-title { margin: 0; font-size: 18px; line-height: 1.5; }
  .input-area { width: 100%; margin-bottom: 32px; }
  .input-label { display: block; font-weight: 900; font-size: 18px; margin-bottom: 12px; color: #222; text-shadow: 1px 1px 0px #4285F4; }
  textarea { width: 100%; box-sizing: border-box; padding: 16px; font-size: 16px; font-weight: bold; border: 4px solid #222; border-radius: 12px; resize: none; background-color: #fff; color: #222; box-shadow: 6px 6px 0px #222; font-family: inherit; }
  textarea:focus { outline: none; background-color: #ffffee; }
  .submit-btn { background-color: #ff4742; color: white; }
  .submit-btn.loading { background-color: #ccc; cursor: wait; transform: translate(6px, 6px); box-shadow: 0px 0px 0px #222; }
  .result-box { width: 100%; display: flex; flex-direction: column; align-items: center; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.8) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
  .result-title { font-size: 28px; font-weight: 900; color: #ff4742; text-shadow: 2px 2px 0px #222; margin-bottom: 24px; }
  .score-circle { background-color: #ffcc00; border: 6px solid #222; border-radius: 50%; width: 150px; height: 150px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 8px 8px 0px #222; margin-bottom: 32px; transform: rotate(5deg); }
  .score-number { font-size: 64px; font-weight: 900; line-height: 1; color: #222; }
  .score-max { font-size: 18px; font-weight: 900; color: #222; }
  .comment-box { background-color: #fff; border: 4px solid #222; border-radius: 12px; padding: 20px; width: 100%; box-sizing: border-box; box-shadow: 6px 6px 0px #222; margin-bottom: 40px; position: relative; }
  .comment-icon { font-size: 40px; position: absolute; top: -24px; left: -12px; background-color: #f4f4f0; border-radius: 50%; }
  .comment-text { font-size: 18px; font-weight: bold; line-height: 1.6; margin: 0; color: #222; }
  .action-buttons { width: 100%; display: flex; flex-direction: column; gap: 16px; }
  .share-btn { background-color: #000; color: #fff; }
  .back-to-list-btn { background-color: #4285F4; color: #fff; }
</style>