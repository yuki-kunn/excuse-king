import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name: string;
  email?: string;
  title?: string;
  totalPoints?: number;
  isBanned?: boolean;
  provider?: 'password' | 'google.com';
  createdAt?: Timestamp;
}

export interface Post {
  id: string;
  themeId: string;
  uid: string;
  excuseText: string;
  aiScore?: number;
  likeCount?: number;
  createdAt?: Timestamp;
  // 拡張フィールド（フロントエンドで追加）
  themeContent?: string;
  userName?: string;
}

export interface Theme {
  id: string;
  content: string;
  createdBy: 'AI' | 'user';
  createdAt?: Timestamp;
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
  title: string;
}

export interface EditingUser extends User {
  newPassword?: string;
}
