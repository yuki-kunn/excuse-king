import type { PostWithTheme } from '$lib/types';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * 特定ユーザーの投稿をすべて取得し、お題情報も含める
 * N+1問題を解決するために、テーマをバッチで取得
 * @param db - Firestoreインスタンス
 * @param userId - ユーザーID
 * @returns お題情報を含む投稿の配列
 */
export async function fetchUserPostsWithThemes(
	db: Firestore,
	userId: string
): Promise<PostWithTheme[]> {
	// 1. ユーザーの投稿を全て取得
	const postsQuery = query(collection(db, 'posts'), where('uid', '==', userId));
	const postsSnap = await getDocs(postsQuery);

	// 2. 必要なテーマIDを収集
	const themeIds = new Set<string>();
	postsSnap.docs.forEach((doc) => {
		const data = doc.data();
		if (data.themeId) {
			themeIds.add(data.themeId);
		}
	});

	// 3. テーマを並列で一括取得（N+1問題の解決）
	const themePromises = Array.from(themeIds).map(async (themeId) => {
		const themeRef = doc(db, 'themes', themeId);
		const themeSnap = await getDoc(themeRef);
		return {
			id: themeId,
			content: themeSnap.exists() ? themeSnap.data().content : '削除されたお題'
		};
	});

	const themes = await Promise.all(themePromises);
	const themeMap = new Map(themes.map((theme) => [theme.id, theme.content]));

	// 4. 投稿データとテーマ情報を結合
	return postsSnap.docs.map((postDoc) => {
		const postData = postDoc.data();
		return {
			id: postDoc.id,
			themeContent: themeMap.get(postData.themeId) || '削除されたお題',
			...postData
		} as PostWithTheme;
	});
}

/**
 * 特定のお題に対してユーザーが投稿済みかチェック
 * @param db - Firestoreインスタンス
 * @param themeId - お題ID
 * @param userId - ユーザーID
 * @returns 投稿済みならtrue
 */
export async function hasUserPosted(
	db: Firestore,
	themeId: string,
	userId: string
): Promise<boolean> {
	const duplicateQuery = query(
		collection(db, 'posts'),
		where('themeId', '==', themeId),
		where('uid', '==', userId)
	);
	const duplicateSnap = await getDocs(duplicateQuery);
	return !duplicateSnap.empty;
}
