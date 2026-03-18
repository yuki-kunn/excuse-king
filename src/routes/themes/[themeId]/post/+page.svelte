<script lang="ts">
	import { goto } from '$app/navigation';
	import { db, auth } from '$lib/firebase/firebase';
	import {
		doc,
		getDoc,
		collection,
		addDoc,
		serverTimestamp,
		updateDoc,
		increment
	} from 'firebase/firestore';
	import { hasUserPosted, getTitle } from '$lib/utils';
	import type { ThemeWithId } from '$lib/types';

	export let data: { theme: ThemeWithId };
	const theme = data.theme;
	const themeId = theme.id;

	let excuseText = '';
	let isSubmitting = false;
	let aiResult: { score: number; comment: string } | null = null;

	$: shareText = aiResult
		? `お題「${theme.content}」に対する私の言い訳\n\n「${excuseText}」\n\nAI判定: ${aiResult.score}点\n🤖「${aiResult.comment}」\n\n#言い訳の王様`
		: '';
	$: shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

	async function submitExcuse() {
		if (!excuseText.trim()) {
			alert('言い訳を入力してください！');
			return;
		}

		const user = auth.currentUser;
		if (!user) {
			alert('投稿するにはログインが必要です。');
			return;
		}

		isSubmitting = true;

		try {
			// BANチェック
			const userDocRef = doc(db, 'users', user.uid);
			const userSnap = await getDoc(userDocRef);
			const dbUser = userSnap.data();

			if (dbUser?.isBanned) {
				alert("アカウントが凍結されているため、言い訳を投稿できません🚨");
				isSubmitting = false;
				return;
			}

			// 重複チェック
			const alreadyPosted = await hasUserPosted(db, themeId, user.uid);
			if (alreadyPosted) {
				alert('このお題にはすでに言い訳を投稿済みです！（1お題につき1回まで）');
				isSubmitting = false;
				return;
			}

			// AI判定
			const aiResponse = await fetch('/api/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					themeText: theme.content,
					excuseText: excuseText
				})
			});

			if (!aiResponse.ok) throw new Error('AIエラー');

			const evaluation = await aiResponse.json();
			aiResult = evaluation;
			isSubmitting = false;

			const customName = dbUser?.name || '名無し';
			const currentPoints = dbUser?.totalPoints || 0;

			// 投稿保存とポイント更新を並列実行（パフォーマンス最適化）
			const newPoints = currentPoints + evaluation.score;
			const newTitle = getTitle(newPoints);

			await Promise.all([
				addDoc(collection(db, 'posts'), {
					themeId: themeId,
					uid: user.uid,
					userId: customName,
					excuseText: excuseText,
					aiScore: evaluation.score,
					aiComment: evaluation.comment,
					likeCount: 0,
					createdAt: serverTimestamp()
				}),
				updateDoc(doc(db, 'users', user.uid), {
					totalPoints: increment(evaluation.score),
					title: newTitle
				})
			]);
		} catch (error) {
			console.error('投稿エラー:', error);
			alert('エラーが発生しました。もう一度お試しください。');
			isSubmitting = false;
		}
	}
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