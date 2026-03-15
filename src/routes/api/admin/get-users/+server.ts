import { json } from '@sveltejs/kit';
import { adminAuth, adminDb } from '$lib/server/firebaseAdmin';

export async function GET({ request }) {
  try {
    // 1. セキュリティチェック：管理者の証明書を確認
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: '認証トークンがありません' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (decodedToken.email !== 'hokuyoyuki@gmail.com') {
      return json({ error: '管理者権限がありません' }, { status: 403 });
    }

    // 2. 【Firestore】から全ユーザーのプロフィール（ポイントや称号）を取得
    const dbUsersSnap = await adminDb.collection('users').get();
    const dbUsers = new Map();
    dbUsersSnap.forEach(doc => {
      dbUsers.set(doc.id, doc.data());
    });

    // 3. 【Firebase Auth】から全ユーザーの「本当のログイン情報」を取得（最大1000件）
    const authUsers = await adminAuth.listUsers(1000);

    // 4. Authの情報とFirestoreの情報をガッチャンコ（結合）する
    const mergedUsers = authUsers.users.map(authUser => {
      const dbUser = dbUsers.get(authUser.uid) || {};
      
      return {
        id: authUser.uid,
        email: authUser.email || '',
        provider: authUser.providerData[0]?.providerId || 'password',
        name: dbUser.name || authUser.displayName || '名無し',
        title: dbUser.title || '見習い',
        totalPoints: dbUser.totalPoints || 0,
        // ★追加：データベースにBANフラグがあれば取得（なければfalse）
        isBanned: dbUser.isBanned || false 
      };
    });

    return json({ users: mergedUsers });

  } catch (error: any) {
    console.error("ユーザー一覧取得エラー:", error);
    return json({ error: error.message }, { status: 500 });
  }
}