<script lang="ts">
	interface Props {
		message?: string;
	}

	let { message = '読み込み中...' }: Props = $props();
</script>

<div class="loading-container">
	<div class="spinner"></div>
	<p class="loading-text">{message}</p>
</div>

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
	}

	.spinner {
		width: 50px;
		height: 50px;
		border: 4px solid #f0f0f0;
		border-top: 4px solid #ffcc00;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.loading-text {
		margin-top: 16px;
		font-weight: bold;
		color: #666;
		font-size: 16px;
	}
</style>
