import type { Timestamp } from 'firebase/firestore';

export interface Theme {
	content: string;
	createdAt: Timestamp;
	createdBy: string;
}

export interface ThemeWithId extends Theme {
	id: string;
}
