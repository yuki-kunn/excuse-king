import { doc, getDoc } from 'firebase/firestore';
import { db } from '$lib/firebase/firebase';
import { error } from '@sveltejs/kit';

export const ssr = false;

// 画面を表示する前に実行される特別な関数です
export const load = async ({ params }) => {
  // URLからお題のIDを取得して、Firebaseからデータを取ってきます
  const themeRef = doc(db, 'themes', params.themeId);
  const themeSnap = await getDoc(themeRef);

  if (themeSnap.exists()) {
    // データがあれば、それを画面（+page.svelte）に渡します
    return {
      theme: { id: themeSnap.id, ...themeSnap.data() }
    };
  } else {
    // データが無ければ、エラーページを表示します
    throw error(404, 'お題が見つかりませんでした');
  }
};