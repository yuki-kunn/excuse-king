import type { Timestamp } from 'firebase/firestore';

export type UserTitle = '見習い' | '言い訳のプロ' | '言い訳の達人' | '言い訳の神';

export interface User {
	name: string;
	totalPoints: number;
	title: UserTitle;
	createdAt: Timestamp;
}

export interface UserWithId extends User {
	id: string;
}
