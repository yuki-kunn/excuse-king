import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';
import { extractJSON, type AIEvaluation } from '$lib/utils';
// ★追加：裏側からデータベースにアクセスする権限
import { adminDb } from '$lib/server/firebaseAdmin';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST({ request }) {
	try {
		const { themeText, excuseText } = await request.json();

		console.log(`[API] お題: ${themeText}`);
		console.log(`[API] 言い訳: ${excuseText}`);
		console.log('[API] Geminiへリクエストを送信します...');
		const startTime = Date.now();

		const model = genAI.getGenerativeModel({
			model: 'gemini-2.5-flash',
			generationConfig: {
				responseMimeType: 'application/json',
				temperature: 0.7
			}
		});

		// ★変更：デフォルトの「AIの性格」部分
		let basePrompt = `
      あなたは「言い訳の王様」というエンタメアプリの非常に厳しい審査員です。
      以下のお題に対するユーザーの言い訳を、独自性や面白さの観点から厳しく10点満点で判定してください。
      また、言い訳に対する辛口のツッコミ（1〜2行）も生成してください。
		`;

		// ★追加：データベースの管理画面設定を読みに行く
		try {
			const promptDoc = await adminDb.collection('system').doc('prompts').get();
			if (promptDoc.exists && promptDoc.data()?.judgeSystemPrompt) {
				// 管理画面で保存された性格データで上書き！
				basePrompt = promptDoc.data()?.judgeSystemPrompt;
			}
		} catch (dbError) {
			console.error('[API] プロンプトDB読み込みエラー (デフォルトを使用します):', dbError);
		}

		// ★変更：DBから取得した「性格」に、ユーザーが入力した「お題」と「言い訳」をここで合体させる！
		const finalPrompt = `${basePrompt}

      お題: 「${themeText}」
      言い訳: 「${excuseText}」

      【重要・厳守】
      返答は必ず以下のJSONフォーマットのみを出力してください。
      「Here is the JSON」などの挨拶、前置き、説明文は一切書かないでください。純粋なJSONデータのみを出力してください。

      {
        "score": 数値 (0〜10),
        "comment": "ツッコミのテキスト"
      }`;

		const result = await model.generateContent(finalPrompt);
		const responseText = result.response.text();

		console.log(`[API] Geminiからの返答を受信しました！（${(Date.now() - startTime) / 1000}秒）`);
		
		const evaluation = extractJSON<AIEvaluation>(responseText);

		return json(evaluation);
	} catch (error) {
		console.error('[API] AI判定エラー:', error);
		return json({ error: 'AIの判定に失敗しました。' }, { status: 500 });
	}
}