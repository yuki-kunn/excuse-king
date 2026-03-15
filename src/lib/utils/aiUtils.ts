/**
 * AIのレスポンステキストからJSON部分を抽出する
 * @param responseText - AIからの生のレスポンステキスト
 * @returns 抽出されたJSONオブジェクト
 * @throws JSONが見つからない場合、またはパースエラーの場合
 */
export function extractJSON<T>(responseText: string): T {
	const startIndex = responseText.indexOf('{');
	const endIndex = responseText.lastIndexOf('}');

	if (startIndex === -1 || endIndex === -1) {
		throw new Error('AIの返答からJSONデータを見つけられませんでした。');
	}

	const jsonString = responseText.substring(startIndex, endIndex + 1);
	return JSON.parse(jsonString) as T;
}

/**
 * AIの評価結果の型
 */
export interface AIEvaluation {
	score: number;
	comment: string;
}

/**
 * AIのお題生成結果の型
 */
export interface AITheme {
	themeText: string;
}
