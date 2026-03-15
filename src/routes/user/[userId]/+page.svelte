<script lang="ts">
	import { page } from '$app/stores';
	import { db, auth } from '$lib/firebase/firebase';
	import {
		doc,
		getDoc,
		setDoc,
		updateDoc,
		increment,
		serverTimestamp
	} from 'firebase/firestore';
	import { onMount } from 'svelte';
	import SortButtons from '$lib/components/SortButtons.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { fetchUserPostsWithThemes, sortPosts } from '$lib/utils';
	import type { User, PostWithTheme, SortType, PostWithId } from '$lib/types';

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

	async function handleLike(post: PostWithId | PostWithTheme) {
		const user = auth.currentUser;
		if (!user) {
			alert('いいねするにはログインが必要です！');
			return;
		}

		// 自分の投稿にはいいねできない
		if (post.uid === user.uid) {
			alert('自分の投稿にはいいねできません！');
			return;
		}

		if (post.isLikedByMe) return;

		// 楽観的UI更新
		const postIndex = rawPosts.findIndex((p) => p.id === post.id);
		if (postIndex !== -1) {
			rawPosts[postIndex].likeCount = (rawPosts[postIndex].likeCount || 0) + 1;
			rawPosts[postIndex].isLikedByMe = true;
			rawPosts = [...rawPosts];
		}

		try {
			const likeDocId = `${post.id}_${user.uid}`;
			const likeRef = doc(db, 'likes', likeDocId);

			const likeSnap = await getDoc(likeRef);
			if (likeSnap.exists()) {
				// すでにいいね済み（ロールバック）
				if (postIndex !== -1) {
					rawPosts[postIndex].likeCount -= 1;
					rawPosts[postIndex].isLikedByMe = false;
					rawPosts = [...rawPosts];
				}
				return;
			}

			await setDoc(likeRef, {
				postId: post.id,
				userId: user.uid,
				createdAt: serverTimestamp()
			});

			const postRef = doc(db, 'posts', post.id);
			await updateDoc(postRef, {
				likeCount: increment(1)
			});

			if (post.uid) {
				const authorRef = doc(db, 'users', post.uid);
				await updateDoc(authorRef, {
					totalPoints: increment(1)
				});
			}
		} catch (error) {
			console.error('いいねエラー:', error);
			// エラー時にロールバック
			if (postIndex !== -1) {
				rawPosts[postIndex].likeCount -= 1;
				rawPosts[postIndex].isLikedByMe = false;
				rawPosts = [...rawPosts];
			}
		}
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
						<PostCard {post} showTheme={true} onLike={handleLike} />
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