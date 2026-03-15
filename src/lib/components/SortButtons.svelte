<script lang="ts">
	import type { SortType } from '$lib/types';

	interface Props {
		sortBy: SortType;
		onSortChange: (sortType: SortType) => void;
	}

	let { sortBy = $bindable(), onSortChange }: Props = $props();

	function handleSort(newSortType: SortType) {
		sortBy = newSortType;
		onSortChange(newSortType);
	}
</script>

<div class="sort-options">
	<button
		class="sort-btn"
		class:active={sortBy === 'newest'}
		onclick={() => handleSort('newest')}
	>
		✨ 新着順
	</button>
	<button
		class="sort-btn"
		class:active={sortBy === 'aiScore'}
		onclick={() => handleSort('aiScore')}
	>
		🤖 AI高得点順
	</button>
	<button
		class="sort-btn"
		class:active={sortBy === 'likeCount'}
		onclick={() => handleSort('likeCount')}
	>
		❤️ いいね順
	</button>
</div>

<style>
	.sort-options {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-bottom: 8px;
	}

	.sort-btn {
		padding: 6px 12px;
		border: 2px solid #222;
		border-radius: 20px;
		background-color: #fff;
		font-weight: 900;
		font-size: 14px;
		cursor: pointer;
		color: #222;
		white-space: nowrap;
		transition: all 0.1s;
	}

	.sort-btn.active {
		background-color: #222;
		color: #ffcc00;
		box-shadow: 3px 3px 0px #ffcc00;
		transform: translate(-2px, -2px);
	}
</style>
