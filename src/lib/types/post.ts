import type { Timestamp } from 'firebase/firestore';

export interface Post {
	themeId: string;
	uid: string;
	userId: string;
	excuseText: string;
	aiScore: number;
	aiComment: string;
	likeCount: number;
	createdAt: Timestamp;
}

export interface PostWithId extends Post {
	id: string;
	isLikedByMe?: boolean;
}

export interface PostWithTheme extends PostWithId {
	themeContent: string;
}

export type SortType = 'newest' | 'aiScore' | 'likeCount';
