<script lang="ts">
	import type { PostWithId, PostWithTheme } from '$lib/types';

	interface Props {
		post: PostWithId | PostWithTheme;
		showTheme?: boolean;
		showDelete?: boolean;
		onLike?: (post: PostWithId | PostWithTheme) => void | Promise<void>;
		onDelete?: (post: PostWithId | PostWithTheme) => void | Promise<void>;
	}

	let { post, showTheme = false, showDelete = false, onLike, onDelete }: Props = $props();

	let isExpanded = $state(false);

	const themeContent = $derived(
		'themeContent' in post ? (post as PostWithTheme).themeContent : undefined
	);

	function toggleExpand() {
		if (showTheme) {
			isExpanded = !isExpanded;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (showTheme && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			toggleExpand();
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="post-card"
	class:clickable={showTheme}
	role={showTheme ? 'button' : undefined}
	tabindex={showTheme ? 0 : undefined}
	onclick={toggleExpand}
	onkeypress={handleKeyPress}
>
	{#if showTheme && themeContent}
		<div class="theme-label">お題: {themeContent}</div>
	{:else}
		<div class="post-header">
			<span class="user-name">{post.userId}</span>
		</div>
	{/if}

	<p class="excuse-text">
		{#if showTheme}
			「{post.excuseText}」
		{:else}
			{post.excuseText}
		{/if}
	</p>

	<div class="post-footer">
		<div class="post-stats">
			<span class="score-badge">AI {post.aiScore}点</span>
			<span class="like-badge">❤️ {post.likeCount || 0}</span>
		</div>

		<div class="action-buttons">
			{#if onLike && !showDelete}
				<button
					class="like-btn"
					class:liked={post.isLikedByMe}
					onclick={(e) => {
						e.stopPropagation();
						onLike?.(post);
					}}
				>
					{post.isLikedByMe ? '❤️' : '🤍'} {post.likeCount || 0}
				</button>
			{/if}

			{#if showDelete && onDelete}
				<button
					class="delete-post-btn"
					onclick={(e) => {
						e.stopPropagation();
						onDelete?.(post);
					}}
				>
					🗑️ 削除
				</button>
			{/if}

			{#if showTheme}
				<button
					class="expand-btn"
					onclick={(e) => {
						e.stopPropagation();
						toggleExpand();
					}}
				>
					{isExpanded ? '▲ 閉じる' : '▼ AIの返答を見る'}
				</button>
			{/if}
		</div>
	</div>

	{#if post.aiComment}
		{#if !showTheme || isExpanded}
			<div class="ai-comment-box" class:expanded={isExpanded}>
				🤖「{post.aiComment}」
			</div>
		{/if}
	{/if}
</div>

<style>
	.post-card {
		background-color: #fff;
		border: 3px solid #222;
		border-radius: 12px;
		padding: 16px;
		box-shadow: 4px 4px 0px #222;
		transition: all 0.2s;
	}

	.post-card.clickable {
		cursor: pointer;
	}

	.post-card.clickable:hover {
		transform: translate(-2px, -2px);
		box-shadow: 6px 6px 0px #222;
	}

	.post-card.clickable:active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0px #222;
	}

	.theme-label {
		font-size: 12px;
		font-weight: 900;
		color: #666;
		margin-bottom: 8px;
		background-color: #f0f0f0;
		display: inline-block;
		padding: 4px 8px;
		border-radius: 4px;
	}

	.post-header {
		margin-bottom: 8px;
	}

	.user-name {
		font-weight: 900;
		color: #555;
		font-size: 14px;
	}

	.excuse-text {
		font-size: 16px;
		font-weight: bold;
		margin: 0 0 16px 0;
		line-height: 1.5;
		color: #222;
	}

	.post-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 12px;
		flex-wrap: wrap;
		gap: 8px;
	}

	.action-buttons {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
	}

	.post-stats {
		display: flex;
		gap: 12px;
	}

	.score-badge {
		background-color: #222;
		color: #ffcc00;
		font-weight: 900;
		font-size: 14px;
		padding: 4px 12px;
		border-radius: 20px;
	}

	.like-badge {
		background-color: #ffeeee;
		color: #ff4742;
		font-weight: 900;
		font-size: 14px;
		padding: 4px 12px;
		border-radius: 20px;
		border: 2px solid #ff4742;
	}

	.like-btn {
		background-color: #fff;
		border: 3px solid #222;
		padding: 6px 16px;
		border-radius: 20px;
		font-weight: 900;
		cursor: pointer;
		box-shadow: 2px 2px 0px #222;
		transition: all 0.1s ease;
	}

	.like-btn:active {
		transform: translate(2px, 2px);
		box-shadow: 0px 0px 0px #222;
	}

	.like-btn.liked {
		background-color: #ffeeee;
		color: #ff4742;
		border-color: #ff4742;
	}

	.delete-post-btn {
		background-color: #fff;
		color: #666;
		border: 2px solid #ccc;
		font-weight: bold;
		padding: 4px 12px;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.1s;
	}

	.delete-post-btn:hover {
		border-color: #ff4742;
		color: #ff4742;
		background-color: #ffeeee;
	}

	.delete-post-btn:active {
		transform: scale(0.95);
	}

	.ai-comment-box {
		background-color: #f0f0f0;
		border: 2px dashed #222;
		border-radius: 8px;
		padding: 10px;
		font-weight: bold;
		font-size: 14px;
		color: #333;
		margin-top: 12px;
	}

	.ai-comment-box.expanded {
		animation: slideDown 0.3s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			max-height: 0;
			padding: 0 10px;
		}
		to {
			opacity: 1;
			max-height: 200px;
			padding: 10px;
		}
	}

	.expand-btn {
		background-color: #fff;
		color: #4285f4;
		border: 2px solid #4285f4;
		font-weight: 900;
		font-size: 12px;
		padding: 4px 12px;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.1s;
		white-space: nowrap;
	}

	.expand-btn:hover {
		background-color: #e3f2fd;
	}

	.expand-btn:active {
		transform: scale(0.95);
	}
</style>
