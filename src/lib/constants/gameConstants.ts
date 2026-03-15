import type { UserTitle } from '$lib/types';

// 称号のしきい値
export const TITLE_THRESHOLDS = {
	GOD: 100,
	MASTER: 50,
	PRO: 20,
	BEGINNER: 0
} as const;

// 称号の名称
export const TITLES: Record<string, UserTitle> = {
	GOD: '言い訳の神',
	MASTER: '言い訳の達人',
	PRO: '言い訳のプロ',
	BEGINNER: '見習い'
} as const;

// ページネーション設定
export const PAGINATION = {
	THEMES_PER_PAGE: 20,
	RANKING_LIMIT: 50
} as const;

// ソート設定
export const SORT_OPTIONS = {
	NEWEST: 'newest',
	AI_SCORE: 'aiScore',
	LIKE_COUNT: 'likeCount'
} as const;
