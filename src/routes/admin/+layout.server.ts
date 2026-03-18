import { redirect } from '@sveltejs/kit';
import { adminAuth } from '$lib/server/firebaseAdmin';
import type { LayoutServerLoad } from './$types';

const ADMIN_EMAIL = 'hokuyoyuki@gmail.com';

export const load: LayoutServerLoad = async ({ cookies }) => {
  // Cookieからトークンを取得
  const token = cookies.get('adminToken');

  // トークンがない場合は、クライアント側で認証を行う
  // （初回アクセス時はCookieがまだ設定されていないため）
  if (!token) {
    console.log('[Admin Auth] トークンが見つかりません（初回アクセスの可能性）');
    return {
      isAuthenticated: false
    };
  }

  try {
    // Firebase Admin SDKでトークンを検証
    const decodedToken = await adminAuth.verifyIdToken(token);

    // メールアドレスが管理者のものか確認
    if (decodedToken.email !== ADMIN_EMAIL) {
      console.log(`[Admin Auth] 権限がありません: ${decodedToken.email}`);
      // 不正なユーザーの場合はCookieをクリアしてリダイレクト
      cookies.delete('adminToken', { path: '/admin' });
      throw redirect(303, '/');
    }

    console.log(`[Admin Auth] 認証成功: ${decodedToken.email}`);

    // 認証成功時にユーザー情報を返す
    return {
      isAuthenticated: true,
      user: {
        email: decodedToken.email,
        uid: decodedToken.uid
      }
    };
  } catch (error: any) {
    // トークンの有効期限切れや不正なトークンの場合
    if (error?.code === 'auth/id-token-expired' || error?.code === 'auth/argument-error') {
      console.log('[Admin Auth] トークンの有効期限切れ - Cookieをクリア');
      cookies.delete('adminToken', { path: '/admin' });
      return {
        isAuthenticated: false
      };
    }

    console.error('[Admin Auth] トークン検証エラー:', error);
    cookies.delete('adminToken', { path: '/admin' });
    throw redirect(303, '/');
  }
};
