<script lang="ts">
	import { db, auth } from '$lib/firebase/firebase';
	import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import { PAGINATION } from '$lib/constants/gameConstants';
	import type { ThemeWithId } from '$lib/types';

	let themes: ThemeWithId[] = [];
	let unsubscribe: (() => void) | undefined;
	let manualThemeText = '';
	let isAddingManual = false;
	let isGeneratingAI = false;
	let currentPage = 1;

	const itemsPerPage = PAGINATION.THEMES_PER_PAGE;

	$: totalPages = Math.max(1, Math.ceil(themes.length / itemsPerPage));
	$: paginatedThemes = themes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	onMount(() => {
		const q = query(collection(db, 'themes'), orderBy('createdAt', 'desc'));
		unsubscribe = onSnapshot(q, (snapshot) => {
			themes = snapshot.docs.map(
				(doc) =>
					({
						id: doc.id,
						...doc.data()
					}) as ThemeWithId
			);
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});

	async function handleManualAdd() {
		if (!manualThemeText.trim()) {
			alert('お題を入力してください！');
			return;
		}
		const user = auth.currentUser;
		if (!user) {
			alert('お題を追加するにはログインが必要です。');
			return;
		}

		isAddingManual = true;
		try {
			await addDoc(collection(db, 'themes'), {
				content: manualThemeText,
				createdAt: serverTimestamp(),
				createdBy: user.uid
			});
			manualThemeText = '';
			currentPage = 1;
		} catch (error) {
			console.error('手動追加エラー:', error);
			alert('お題の追加に失敗しました。');
		}
		isAddingManual = false;
	}

	async function handleAIGenerate() {
		const user = auth.currentUser;
		if (!user) {
			alert('お題を生成するにはログインが必要です。');
			return;
		}

		isGeneratingAI = true;
		try {
			const response = await fetch('/api/generateTheme', { method: 'POST' });
			if (!response.ok) throw new Error('APIエラー');

			const data = await response.json();

			await addDoc(collection(db, 'themes'), {
				content: data.themeText,
				createdAt: serverTimestamp(),
				createdBy: 'AI'
			});
			currentPage = 1;
		} catch (error) {
			console.error('AI生成エラー:', error);
			alert('AIお題の生成に失敗しました。');
		}
		isGeneratingAI = false;
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}
</script>

<div class="themes-container">
  <h2 class="page-title">お題一覧</h2>

  <div class="create-section">
    <div class="manual-create">
      <input 
        type="text" 
        class="theme-input" 
        bind:value={manualThemeText} 
        placeholder="自分で新しいお題を考える..."
        maxlength="50"
      />
      <button class="btn add-btn" on:click={handleManualAdd} disabled={isAddingManual}>
        {isAddingManual ? '追加中...' : '✍️ 手動で追加'}
      </button>
    </div>

    <div class="ai-create">
      <p class="ai-hint">または、AIに無茶振りお題を作ってもらう</p>
      <button class="btn ai-btn" on:click={handleAIGenerate} disabled={isGeneratingAI}>
        {isGeneratingAI ? '🤖 考案中...' : '✨ AIに自動生成させる'}
      </button>
    </div>
  </div>

  <div class="themes-list">
    {#if themes.length === 0}
      <p class="empty-text">お題がありません。最初のお題を作ってみよう！</p>
    {:else}
      {#each paginatedThemes as theme}
        <a href={`/themes/${theme.id}`} class="theme-card">
          <span class="theme-icon">👑</span>
          <p class="theme-content">{theme.content}</p>
        </a>
      {/each}
    {/if}
  </div>

  {#if totalPages > 1}
    <div class="pagination">
      <button class="page-btn" disabled={currentPage === 1} on:click={() => goToPage(currentPage - 1)}>
        ◀ 前へ
      </button>
      
      <span class="page-info">{currentPage} / {totalPages}</span>
      
      <button class="page-btn" disabled={currentPage === totalPages} on:click={() => goToPage(currentPage + 1)}>
        次へ ▶
      </button>
    </div>
  {/if}

</div>

<style>
  .themes-container { padding: 20px; display: flex; flex-direction: column; align-items: center; max-width: 600px; margin: 0 auto; }
  .page-title { font-size: 32px; font-weight: 900; color: #ffcc00; -webkit-text-stroke: 2px #222; text-shadow: 4px 4px 0px #222; margin-bottom: 24px; }

  /* お題生成エリアのデザイン */
  .create-section { width: 100%; background-color: #fff; border: 4px solid #222; border-radius: 12px; padding: 20px; box-sizing: border-box; box-shadow: 6px 6px 0px #222; margin-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
  
  .manual-create { display: flex; flex-direction: column; gap: 12px; }
  .theme-input { width: 100%; box-sizing: border-box; padding: 12px; font-size: 16px; font-weight: bold; border: 3px solid #222; border-radius: 8px; }
  .theme-input:focus { outline: none; background-color: #ffffee; border-color: #ffcc00; }
  
  .ai-create { border-top: 2px dashed #ccc; padding-top: 16px; display: flex; flex-direction: column; align-items: center; }
  .ai-hint { font-weight: bold; color: #555; margin: 0 0 12px 0; font-size: 14px; }

  .btn { width: 100%; padding: 14px; font-size: 16px; font-weight: 900; border: 3px solid #222; border-radius: 8px; cursor: pointer; box-shadow: 4px 4px 0px #222; transition: all 0.1s; box-sizing: border-box; text-align: center; }
  .btn:active:not(:disabled) { transform: translate(4px, 4px); box-shadow: 0px 0px 0px #222; }
  .btn:disabled { opacity: 0.7; cursor: wait; }
  
  .add-btn { background-color: #ffcc00; color: #222; }
  .ai-btn { background-color: #4285F4; color: #fff; }

  /* リストのデザイン */
  .themes-list { width: 100%; display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
  .theme-card { text-decoration: none; color: #222; display: flex; align-items: center; background-color: #fff; border: 3px solid #222; border-radius: 12px; padding: 16px; box-shadow: 4px 4px 0px #222; transition: transform 0.1s; }
  .theme-card:active { transform: translate(4px, 4px); box-shadow: 0px 0px 0px #222; }
  .theme-icon { font-size: 24px; margin-right: 16px; }
  .theme-content { font-size: 18px; font-weight: 900; margin: 0; line-height: 1.4; }
  .empty-text { font-weight: bold; color: #666; text-align: center; }

  /* ページネーションのデザイン */
  .pagination { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 40px; }
  .page-btn { padding: 8px 16px; font-weight: 900; background-color: #fff; border: 3px solid #222; border-radius: 8px; cursor: pointer; box-shadow: 3px 3px 0px #222; transition: all 0.1s; }
  .page-btn:active:not(:disabled) { transform: translate(3px, 3px); box-shadow: 0px 0px 0px #222; }
  .page-btn:disabled { background-color: #eee; color: #999; border-color: #ccc; cursor: not-allowed; box-shadow: none; transform: none; }
  .page-info { font-weight: 900; font-size: 18px; color: #222; }
</style>