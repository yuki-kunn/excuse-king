import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';
import { extractJSON, type AITheme } from '$lib/utils';
// ★追加：裏側からデータベースにアクセスする権限
import { adminDb } from '$lib/server/firebaseAdmin'; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST() {
	try {
		const model = genAI.getGenerativeModel({
			model: 'gemini-2.5-flash',
			generationConfig: {
				responseMimeType: 'application/json',
				temperature: 0.9
			}
		});

		// ★変更：デフォルトのプロンプト（DBが空だった時の保険）
		let promptText = `
      あなたは「言い訳の王様」というエンタメアプリのゲームマスターです。
      ユーザーが面白い言い訳をしたくなるような、理不尽で笑える「お題」を1つだけ生成してください。
      例: 「また遅刻？今日で3回目だよ？」、「宿題、犬が食べたって本当ですか？」、「なぜ昨日、私のプリン食べたの？」

      【重要・厳守】
      返答は必ず以下のJSONフォーマットのみを出力してください。
      {
        "themeText": "生成したお題のテキスト"
      }
    `;

		// ★追加：データベースの管理画面設定を読みに行く
		try {
			const promptDoc = await adminDb.collection('system').doc('prompts').get();
			// もし管理画面で保存されたプロンプトがあれば、それで上書きする
			if (promptDoc.exists && promptDoc.data()?.themeGeneratePrompt) {
				promptText = promptDoc.data()?.themeGeneratePrompt;
			}
		} catch (dbError) {
			console.error('[API] プロンプトDB読み込みエラー (デフォルトを使用します):', dbError);
		}

		// DBの指示（またはデフォルト）をGeminiに投げる
		const result = await model.generateContent(promptText);
		const responseText = result.response.text();

		const data = extractJSON<AITheme>(responseText);

		return json(data);
	} catch (error) {
		console.error('[API] お題生成エラー:', error);
		return json({ error: 'AIのお題生成に失敗しました。' }, { status: 500 });
	}
}