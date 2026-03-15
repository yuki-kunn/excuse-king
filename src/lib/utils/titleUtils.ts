import type { UserTitle } from '$lib/types';
import { TITLE_THRESHOLDS, TITLES } from '$lib/constants/gameConstants';

/**
 * ポイント数に応じた称号を計算する
 * @param points - 総獲得ポイント数
 * @returns 対応する称号
 */
export function getTitle(points: number): UserTitle {
	if (points >= TITLE_THRESHOLDS.GOD) return TITLES.GOD;
	if (points >= TITLE_THRESHOLDS.MASTER) return TITLES.MASTER;
	if (points >= TITLE_THRESHOLDS.PRO) return TITLES.PRO;
	return TITLES.BEGINNER;
}
