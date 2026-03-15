import type { PostWithId, SortType } from '$lib/types';

/**
 * 投稿をソートする
 * @param posts - ソートする投稿の配列
 * @param sortBy - ソート方法（newest: 新着順、aiScore: AI高得点順、likeCount: いいね順）
 * @returns ソートされた投稿の配列
 */
export function sortPosts(posts: PostWithId[], sortBy: SortType): PostWithId[] {
	return posts.slice().sort((a, b) => {
		if (sortBy === 'aiScore') {
			return (b.aiScore || 0) - (a.aiScore || 0);
		}
		if (sortBy === 'likeCount') {
			return (b.likeCount || 0) - (a.likeCount || 0);
		}
		// デフォルトは新着順
		return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
	});
}
