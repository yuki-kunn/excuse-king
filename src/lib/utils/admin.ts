import type { Timestamp } from 'firebase/firestore';
import { auth } from '$lib/firebase/firebase';

/**
 * Firestoreのタイムスタンプを日本語フォーマットに変換
 */
export function formatDate(timestamp: Timestamp | undefined): string {
  if (!timestamp) return '不明';
  const date = timestamp.toDate();
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * 現在ログイン中の管理者の認証トークンを取得
 */
export async function getAuthToken(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("ログインしていません");
  }
  return await currentUser.getIdToken();
}

/**
 * 管理者APIへのPOSTリクエストを実行
 */
export async function adminApiPost(endpoint: string, body: any): Promise<any> {
  const token = await getAuthToken();

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "APIリクエストに失敗しました");
  }

  return data;
}

/**
 * 管理者APIへのGETリクエストを実行
 */
export async function adminApiGet(endpoint: string): Promise<any> {
  const token = await getAuthToken();

  const res = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "APIリクエストに失敗しました");
  }

  return data;
}
