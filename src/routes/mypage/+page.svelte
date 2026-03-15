<script lang="ts">
	import { goto } from '$app/navigation';
	import { db, auth } from '$lib/firebase/firebase';
	import { onAuthStateChanged } from 'firebase/auth';
	import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import SortButtons from '$lib/components/SortButtons.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { fetchUserPostsWithThemes, sortPosts, getTitle } from '$lib/utils';
	import type { User, PostWithId, PostWithTheme, SortType } from '$lib/types';
	import type { User as FirebaseUser } from 'firebase/auth';

	let currentUser: FirebaseUser | null = null;
	let dbUser: User | null = null;
	let rawPosts: PostWithTheme[] = [];
	let isLoading = true;
	let unsubscribeAuth: (() => void) | undefined;
	let sortBy: SortType = 'newest';

	$: myPosts = sortPosts(rawPosts, sortBy);

	onMount(() => {
		unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
			if (user) {
				currentUser = user;

				// ユーザー情報と投稿を並列で取得（パフォーマンス最適化）
				const [userSnap, posts] = await Promise.all([
					getDoc(doc(db, 'users', user.uid)),
					fetchUserPostsWithThemes(db, user.uid)
				]);

				if (userSnap.exists()) {
					dbUser = userSnap.data() as User;
				}

				rawPosts = posts;
				isLoading = false;
			} else {
				goto('/');
			}
		});
	});

	onDestroy(() => {
		if (unsubscribeAuth) unsubscribeAuth();
	});

	async function handleDeletePost(post: PostWithId | PostWithTheme) {
		const confirmMessage =
			'この言い訳を本当に削除しますか？\n※獲得したポイントも没収されます！';
		if (!confirm(confirmMessage)) return;

		if (!currentUser || !dbUser) return;

		try {
			const pointsToDeduct = (post.aiScore || 0) + (post.likeCount || 0);
			const currentPoints = dbUser.totalPoints || 0;
			const newPoints = Math.max(0, currentPoints - pointsToDeduct);
			const newTitle = getTitle(newPoints);

			// データベースの更新を並列実行（パフォーマンス最適化）
			await Promise.all([
				updateDoc(doc(db, 'users', currentUser.uid), {
					totalPoints: newPoints,
					title: newTitle
				}),
				deleteDoc(doc(db, 'posts', post.id))
			]);

			// UI更新
			rawPosts = rawPosts.filter((p) => p.id !== post.id);
			dbUser = {
				...dbUser,
				totalPoints: newPoints,
				title: newTitle
			};

			alert(`投稿を削除しました。（${pointsToDeduct} pt 減少しました）\n現在の称号: ${newTitle}`);
		} catch (error) {
			console.error('削除エラー:', error);
			alert('削除に失敗しました。');
		}
	}

	function handleSortChange(newSortBy: SortType) {
		sortBy = newSortBy;
	}
</script>

<div class="mypage-container">
	{#if isLoading}
		<LoadingSpinner />
	{:else if currentUser}
		<div class="header-actions">
			<h2 class="page-title">マイページ</h2>
			<a href="/mypage/settings" class="settings-btn">⚙️ 設定</a>
		</div>

		<div class="profile-card">
			<div class="profile-header">
				<span class="user-title">{dbUser?.title || '見習い'}</span>
				<h3 class="user-name">{dbUser?.name || '名無し'}</h3>
			</div>
			<div class="points-box">
				<span class="points-label">総所持ポイント</span>
				<div>
					<span class="points-number">{dbUser?.totalPoints || 0}</span>
					<span class="points-unit">pt</span>
				</div>
			</div>
		</div>

		<div class="history-section">
			<div class="section-header">
				<h3 class="section-title">📜 あなたの伝説</h3>
				<SortButtons bind:sortBy onSortChange={handleSortChange} />
			</div>

			{#if myPosts.length === 0}
				<p class="empty-text">まだ投稿がありません。お題に挑戦してみよう！</p>
			{:else}
				<div class="posts-list">
					{#each myPosts as post (post.id)}
						<PostCard {post} showTheme={true} showDelete={true} onDelete={handleDeletePost} />
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.mypage-container {
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 600px;
		margin: 0 auto;
	}

	.header-actions {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.page-title {
		font-size: 28px;
		font-weight: 900;
		color: #222;
		margin: 0;
	}

	.settings-btn {
		background-color: #e0e0e0;
		color: #222;
		text-decoration: none;
		font-weight: 900;
		padding: 8px 16px;
		border: 3px solid #222;
		border-radius: 8px;
		box-shadow: 3px 3px 0px #222;
		transition: all 0.1s;
	}

	.settings-btn:active {
		transform: translate(3px, 3px);
		box-shadow: 0px 0px 0px #222;
	}

	.profile-card {
		width: 100%;
		background-color: #222;
		color: #fff;
		border-radius: 12px;
		padding: 24px;
		box-sizing: border-box;
		box-shadow: 6px 6px 0px #ffcc00;
		margin-bottom: 40px;
	}

	.profile-header {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		margin-bottom: 16px;
		border-bottom: 2px dashed #555;
		padding-bottom: 16px;
	}

	.user-title {
		background-color: #ffcc00;
		color: #222;
		font-weight: 900;
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 14px;
		margin-bottom: 8px;
	}

	.user-name {
		font-size: 24px;
		font-weight: 900;
		margin: 0;
	}

	.points-box {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.points-label {
		font-weight: bold;
		color: #aaa;
	}

	.points-number {
		font-size: 32px;
		font-weight: 900;
		color: #ffcc00;
	}

	.points-unit {
		font-weight: bold;
		color: #aaa;
	}

	.history-section {
		width: 100%;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 16px;
	}

	.section-title {
		font-size: 20px;
		font-weight: 900;
		margin: 0;
		color: #222;
		border-left: 6px solid #ff4742;
		padding-left: 10px;
	}

	.empty-text {
		font-weight: bold;
		color: #666;
		text-align: center;
		padding: 40px 20px;
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
</style>