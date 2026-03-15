import type { PostWithTheme, PostWithId, UserTitle } from '$lib/types';
import {
	doc,
	getDoc,
	collection,
	query,
	where,
	getDocs,
	deleteDoc,
	updateDoc,
	writeBatch
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getTitle } from './titleUtils';

/**
 * 特定ユーザーの投稿をすべて取得し、お題情報も含める
 * N+1問題を解決するために、テーマをバッチで取得
 * お題が削除されている投稿は自動的にクリーンアップされる
 * @param db - Firestoreインスタンス
 * @param userId - ユーザーID
 * @returns お題情報を含む投稿の配列と削除情報
 */
export async function fetchUserPostsWithThemes(
	db: Firestore,
	userId: string
): Promise<{
	posts: PostWithTheme[];
	deletedCount: number;
	pointsDeducted: number;
	newTitle: UserTitle | null;
}> {
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
			content: themeSnap.exists() ? themeSnap.data().content : null,
			exists: themeSnap.exists()
		};
	});

	const themes = await Promise.all(themePromises);
	const themeMap = new Map(
		themes.map((theme) => [theme.id, { content: theme.content, exists: theme.exists }])
	);

	// 4. お題が削除されている投稿を特定
	const postsToDelete: Array<{ id: string; data: any }> = [];
	const validPosts: PostWithTheme[] = [];

	postsSnap.docs.forEach((postDoc) => {
		const postData = postDoc.data();
		const themeInfo = themeMap.get(postData.themeId);

		if (!themeInfo || !themeInfo.exists || !themeInfo.content) {
			// お題が削除されている場合、削除対象として記録
			postsToDelete.push({ id: postDoc.id, data: postData });
		} else {
			// 有効な投稿のみを返す
			validPosts.push({
				id: postDoc.id,
				themeContent: themeInfo.content,
				...postData
			} as PostWithTheme);
		}
	});

	// 5. 削除されたお題の投稿を同期的にクリーンアップ
	let pointsDeducted = 0;
	let newTitle: UserTitle | null = null;

	if (postsToDelete.length > 0) {
		const result = await cleanupDeletedThemePosts(db, postsToDelete, userId);
		pointsDeducted = result.pointsDeducted;
		newTitle = result.newTitle;
	}

	return {
		posts: validPosts,
		deletedCount: postsToDelete.length,
		pointsDeducted,
		newTitle
	};
}

/**
 * 削除されたお題に関連する投稿をクリーンアップする
 * @param db - Firestoreインスタンス
 * @param posts - 削除する投稿の配列（IDとデータ）
 * @param userId - ユーザーID
 * @returns 削除されたポイント数と新しい称号
 */
async function cleanupDeletedThemePosts(
	db: Firestore,
	posts: Array<{ id: string; data: any }>,
	userId: string
): Promise<{ pointsDeducted: number; newTitle: UserTitle }> {
	console.log(`削除されたお題に関連する${posts.length}件の投稿をクリーンアップ中...`);

	// ユーザーの現在のポイントを取得
	const userRef = doc(db, 'users', userId);
	const userSnap = await getDoc(userRef);
	if (!userSnap.exists()) {
		return { pointsDeducted: 0, newTitle: '見習い' };
	}

	const currentPoints = userSnap.data().totalPoints || 0;
	let totalPointsToDeduct = 0;

	// 各投稿を削除し、ポイントを計算
	for (const post of posts) {
		try {
			const pointsLost = (post.data.aiScore || 0) + (post.data.likeCount || 0);
			totalPointsToDeduct += pointsLost;

			// 投稿に関連するいいねを削除
			const likesQuery = query(collection(db, 'likes'), where('postId', '==', post.id));
			const likesSnap = await getDocs(likesQuery);

			const batch = writeBatch(db);
			likesSnap.docs.forEach((likeDoc) => {
				batch.delete(likeDoc.ref);
			});
			batch.delete(doc(db, 'posts', post.id));
			await batch.commit();

			console.log(`投稿 ${post.id} を削除しました (${pointsLost}pt)`);
		} catch (error) {
			console.error(`投稿 ${post.id} の削除中にエラーが発生しました:`, error);
		}
	}

	// ポイントと称号を更新
	const newPoints = Math.max(0, currentPoints - totalPointsToDeduct);
	const newTitle = getTitle(newPoints);

	await updateDoc(userRef, {
		totalPoints: newPoints,
		title: newTitle
	});

	console.log(
		`クリーンアップ完了: ${posts.length}件削除、${totalPointsToDeduct}pt減少、新しい称号: ${newTitle}`
	);

	return { pointsDeducted: totalPointsToDeduct, newTitle };
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

/**
 * 投稿を削除し、関連するすべてのデータを整理する
 * - 投稿に関連するいいねをすべて削除
 * - 投稿を削除
 * - 投稿者のポイントを減算し、称号を更新
 *
 * @param db - Firestoreインスタンス
 * @param post - 削除する投稿
 * @param userId - 投稿者のユーザーID
 * @param currentPoints - 現在の総ポイント
 * @returns 新しいポイントと称号
 */
export async function deletePostWithCleanup(
	db: Firestore,
	post: PostWithId | PostWithTheme,
	userId: string,
	currentPoints: number
): Promise<{ newPoints: number; newTitle: UserTitle }> {
	// 1. この投稿に関連するすべてのいいねを取得
	const likesQuery = query(collection(db, 'likes'), where('postId', '==', post.id));
	const likesSnap = await getDocs(likesQuery);

	// 2. バッチ処理で効率的に削除（Firestoreは最大500件/バッチ）
	const batch = writeBatch(db);

	// いいねを削除
	likesSnap.docs.forEach((likeDoc) => {
		batch.delete(likeDoc.ref);
	});

	// 投稿を削除
	batch.delete(doc(db, 'posts', post.id));

	// 3. バッチをコミット
	await batch.commit();

	// 4. ポイント計算と称号更新
	const pointsToDeduct = (post.aiScore || 0) + (post.likeCount || 0);
	const newPoints = Math.max(0, currentPoints - pointsToDeduct);
	const newTitle = getTitle(newPoints);

	// 5. ユーザーのポイントと称号を更新
	await updateDoc(doc(db, 'users', userId), {
		totalPoints: newPoints,
		title: newTitle
	});

	return { newPoints, newTitle };
}
