import { json } from '@sveltejs/kit';
import { adminAuth, adminDb } from '$lib/server/firebaseAdmin';

export async function POST({ request }) {
  try {
    // 1. セキュリティチェック
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: '認証トークンがありません' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (decodedToken.email !== 'hokuyoyuki@gmail.com') {
      return json({ error: '管理者権限がありません' }, { status: 403 });
    }

    // 2. データ受け取り (uid と変更したいデータ)
    const { uid, email, password, name, title, totalPoints, isBanned } = await request.json();

    // 3. 【Firebase Auth】ログイン情報の更新
    const authUpdates: any = {};
    if (email) authUpdates.email = email;
    if (password) authUpdates.password = password; // パスワードが入力された時だけ更新

    // Authに変更があれば更新実行
    if (Object.keys(authUpdates).length > 0) {
      await adminAuth.updateUser(uid, authUpdates);
    }

    // 4. 【Firestore】プロフィールの更新
    await adminDb.collection('users').doc(uid).update({
      name: name,
      email: email,
      title: title,
      totalPoints: Number(totalPoints),
      // ★追加：BAN状態を保存（確実に真偽値にするため Boolean() を使う）
      isBanned: Boolean(isBanned)
    });
    return json({ success: true });

  } catch (error: any) {
    console.error("ユーザー更新エラー:", error);
    return json({ error: error.message }, { status: 500 });
  }
}