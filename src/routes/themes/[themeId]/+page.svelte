<script lang="ts">
	import { page } from '$app/stores';
	import { db, auth } from '$lib/firebase/firebase';
	import {
		doc,
		getDoc,
		collection,
		query,
		where,
		onSnapshot,
		setDoc,
		updateDoc,
		increment,
		serverTimestamp
	} from 'firebase/firestore';
	import { onAuthStateChanged } from 'firebase/auth';
	import { onMount, onDestroy } from 'svelte';
	import SortButtons from '$lib/components/SortButtons.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { sortPosts } from '$lib/utils';
	import type { ThemeWithId, PostWithId, SortType } from '$lib/types';
	import type { User } from 'firebase/auth';

	const themeId = $page.params.themeId;

	let theme: ThemeWithId | null = null;
	let rawPosts: PostWithId[] = [];
	let currentUser: User | null = null;
	let unsubscribe: (() => void) | undefined;
	let unsubscribeAuth: (() => void) | undefined;
	let sortBy: SortType = 'newest';
	let isBanned = false;

	$: posts = sortPosts(rawPosts, sortBy);
	$: hasPosted = currentUser
		? rawPosts.some((post) => post.uid === (currentUser?.uid || ''))
		: false;

	onMount(async () => {
		if (!themeId) return;

		unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
			currentUser = user;
			if (user) {
				const userDocRef = doc(db, 'users', user.uid);
				const userSnap = await getDoc(userDocRef);
				const userData = userSnap.data();
				isBanned = userData?.isBanned || false;
			} else {
				isBanned = false;
			}
		});

		const themeRef = doc(db, 'themes', themeId);
		const themeSnap = await getDoc(themeRef);

		if (themeSnap.exists()) {
			theme = { id: themeSnap.id, ...themeSnap.data() } as ThemeWithId;
		}

		const q = query(collection(db, 'posts'), where('themeId', '==', themeId));

		unsubscribe = onSnapshot(q, (snapshot) => {
			rawPosts = snapshot.docs.map(
				(doc) =>
					({
						id: doc.id,
						...doc.data(),
						isLikedByMe: false
					}) as PostWithId
			);
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		if (unsubscribeAuth) unsubscribeAuth();
	});

	async function handleLike(post: PostWithId) {
		const user = auth.currentUser;
		if (!user) {
			alert('いいねするにはログインが必要です！');
			return;
		}

		if (post.isLikedByMe) return;

		// 楽観的UI更新
		post.likeCount = (post.likeCount || 0) + 1;
		post.isLikedByMe = true;
		rawPosts = [...rawPosts];

		try {
			const likeDocId = `${post.id}_${user.uid}`;
			const likeRef = doc(db, 'likes', likeDocId);

			const likeSnap = await getDoc(likeRef);
			if (likeSnap.exists()) {
				// すでにいいね済み（ロールバック）
				post.likeCount -= 1;
				post.isLikedByMe = false;
				rawPosts = [...rawPosts];
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
			post.likeCount -= 1;
			post.isLikedByMe = false;
			rawPosts = [...rawPosts];
		}
	}

	function handleSortChange(newSortBy: SortType) {
		sortBy = newSortBy;
	}
</script>

<div class="post-list-container">
	<a href="/themes" class="back-btn">◀ 戻る</a>

	{#if theme}
		<div class="theme-header">
			<div class="theme-icon">👑</div>
			<h2 class="theme-title">{theme.content}</h2>
		</div>
	{:else}
		<LoadingSpinner message="お題を読み込み中..." />
	{/if}

	{#if isBanned}
		<div class="banned-message">🚨 アカウントが凍結されているため、投稿できません</div>
	{:else if hasPosted}
		<div class="posted-message">✅ あなたはこのお題に投稿済みです</div>
	{:else}
		<a href={`/themes/${themeId}/post`} class="post-btn">✏️ 言い訳を投稿する</a>
	{/if}

	<div class="posts-wrapper">
		<div class="section-header">
			<h3 class="section-title">みんなの言い訳</h3>
			<SortButtons bind:sortBy onSortChange={handleSortChange} />
		</div>

		{#if posts.length === 0}
			<p class="empty-text">まだ言い訳がありません。一番乗りを目指そう！</p>
		{:else}
			{#each posts as post (post.id)}
				<PostCard {post} onLike={handleLike} />
			{/each}
		{/if}
	</div>
</div>

<style>
	.post-list-container {
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 600px;
		margin: 0 auto;
		gap: 16px;
	}

	.back-btn {
		align-self: flex-start;
		text-decoration: none;
		color: #222;
		font-weight: 900;
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

	.theme-header {
		background-color: #ffcc00;
		border: 4px solid #222;
		border-radius: 12px;
		padding: 20px;
		width: 100%;
		box-sizing: border-box;
		box-shadow: 6px 6px 0px #222;
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.theme-icon {
		font-size: 40px;
	}

	.theme-title {
		font-size: 20px;
		font-weight: 900;
		margin: 0;
		line-height: 1.4;
	}

	.post-btn {
		display: block;
		width: 100%;
		box-sizing: border-box;
		text-align: center;
		background-color: #ff4742;
		color: white;
		text-decoration: none;
		font-size: 18px;
		font-weight: 900;
		padding: 16px;
		border: 4px solid #222;
		border-radius: 12px;
		box-shadow: 6px 6px 0px #222;
		transition: all 0.1s;
	}

	.post-btn:active {
		transform: translate(6px, 6px);
		box-shadow: 0px 0px 0px #222;
	}

	.posted-message {
		width: 100%;
		box-sizing: border-box;
		text-align: center;
		background-color: #f0f0f0;
		color: #666;
		font-size: 16px;
		font-weight: 900;
		padding: 16px;
		border: 4px dashed #ccc;
		border-radius: 12px;
	}

	.banned-message {
		width: 100%;
		box-sizing: border-box;
		text-align: center;
		background-color: #fef2f2;
		color: #ef4444;
		font-size: 16px;
		font-weight: 900;
		padding: 16px;
		border: 4px solid #ef4444;
		border-radius: 12px;
		box-shadow: 6px 6px 0px #ef4444;
	}

	.posts-wrapper {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-title {
		font-size: 20px;
		font-weight: 900;
		margin: 0;
		text-shadow: 2px 2px 0px #4285f4;
		color: #222;
	}

	.empty-text {
		font-weight: bold;
		color: #666;
		text-align: center;
		padding: 40px 20px;
	}
</style>