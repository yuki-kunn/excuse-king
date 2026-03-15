<script lang="ts">
	import { page } from '$app/stores';
	import { db } from '$lib/firebase/firebase';
	import { doc, getDoc } from 'firebase/firestore';
	import { onMount } from 'svelte';
	import SortButtons from '$lib/components/SortButtons.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { fetchUserPostsWithThemes, sortPosts } from '$lib/utils';
	import type { User, PostWithTheme, SortType } from '$lib/types';

	const targetUserId = $page.params.userId;
	let targetUser: User | null = null;
	let rawPosts: PostWithTheme[] = [];
	let isLoading = true;
	let sortBy: SortType = 'newest';

	$: userPosts = sortPosts(rawPosts, sortBy);

	onMount(async () => {
		try {
			if (!targetUserId) {
				isLoading = false;
				return;
			}

			// ユーザー情報と投稿を並列で取得（パフォーマンス最適化）
			const [userSnap, postsResult] = await Promise.all([
				getDoc(doc(db, 'users', targetUserId)),
				fetchUserPostsWithThemes(db, targetUserId)
			]);

			if (userSnap.exists()) {
				targetUser = userSnap.data() as User;

				// 削除された投稿があった場合、最新のポイントと称号を反映
				if (postsResult.deletedCount > 0 && postsResult.newTitle) {
					targetUser = {
						...targetUser,
						title: postsResult.newTitle
					};
				}
			}

			rawPosts = postsResult.posts;
		} catch (error) {
			console.error('プロフィール読み込みエラー:', error);
		} finally {
			isLoading = false;
		}
	});

	function handleSortChange(newSortBy: SortType) {
		sortBy = newSortBy;
	}
</script>

<div class="user-profile-container">
	<a href="/ranking" class="back-btn">◀ ランキングに戻る</a>

	{#if isLoading}
		<LoadingSpinner />
	{:else if !targetUser}
		<div class="error-box"><p>ユーザーが見つかりませんでした。</p></div>
	{:else}
		<div class="profile-card">
			<div class="profile-header">
				<span class="user-title">{targetUser.title || '見習い'}</span>
				<h3 class="user-name">{targetUser.name}</h3>
			</div>
			<div class="points-box">
				<span class="points-label">総所持ポイント</span>
				<div>
					<span class="points-number">{targetUser.totalPoints || 0}</span>
					<span class="points-unit">pt</span>
				</div>
			</div>
		</div>

		<div class="history-section">
			<div class="section-header">
				<h3 class="section-title">📜 {targetUser.name} の伝説</h3>
				<SortButtons bind:sortBy onSortChange={handleSortChange} />
			</div>

			{#if userPosts.length === 0}
				<p class="empty-text">まだ投稿がありません。</p>
			{:else}
				<div class="posts-list">
					{#each userPosts as post (post.id)}
						<PostCard {post} showTheme={true} />
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.user-profile-container {
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 600px;
		margin: 0 auto;
	}

	.back-btn {
		align-self: flex-start;
		text-decoration: none;
		color: #222;
		font-weight: 900;
		margin-bottom: 24px;
		background-color: #fff;
		border: 3px solid #222;
		padding: 6px 12px;
		border-radius: 8px;
		box-shadow: 3px 3px 0px #222;
		transition: all 0.1s;
	}

	.back-btn:active {
		transform: translate(3px, 3px);
		box-shadow: 0px 0px 0px #222;
	}

	.profile-card {
		width: 100%;
		background-color: #fff;
		border: 4px solid #222;
		border-radius: 12px;
		padding: 24px;
		box-sizing: border-box;
		box-shadow: 6px 6px 0px #4285f4;
		margin-bottom: 40px;
	}

	.profile-header {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		margin-bottom: 16px;
		border-bottom: 2px dashed #ccc;
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
		color: #222;
	}

	.points-box {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.points-label {
		font-weight: bold;
		color: #666;
	}

	.points-number {
		font-size: 32px;
		font-weight: 900;
		color: #4285f4;
	}

	.points-unit {
		font-weight: bold;
		color: #666;
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
		border-left: 6px solid #4285f4;
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

	.error-box {
		text-align: center;
		margin-top: 50px;
		font-weight: bold;
		color: #ff4742;
	}
</style>