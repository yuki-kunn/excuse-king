import { json } from '@sveltejs/kit';
import { adminAuth, adminDb } from '$lib/server/firebaseAdmin';

export async function POST({ request }) {
  try {
    // 1. セキュリティチェック：送信者が「hokuyoyuki@gmail.com」か確認する
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: '認証トークンがありません' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    // Firebaseの神様権限でトークンを解読
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (decodedToken.email !== 'hokuyoyuki@gmail.com') {
      return json({ error: '管理者権限がありません' }, { status: 403 });
    }

    // 2. フロントから送られてきたデータを受け取る
    const { email, password, name, title } = await request.json();

    // 3. 【Firebase Auth】に本当のログイン用アカウントを作成
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password, // 最低6文字必要です
      displayName: name,
    });

    // 4. 【Firestore】にもアプリ用のプロフィールデータを保存
    await adminDb.collection('users').doc(userRecord.uid).set({
      name: name,
      email: email,
      title: title || '見習い',
      totalPoints: 0,
      createdAt: new Date() // adminSDKではserverTimestampの代わりにnew Date()を使います
    });

    return json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error("ユーザー作成エラー:", error);
    return json({ error: error.message }, { status: 500 });
  }
}