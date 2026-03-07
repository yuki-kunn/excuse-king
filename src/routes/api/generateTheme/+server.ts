import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST() {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.9 // 少し高めにして、ぶっ飛んだお題が出やすくします
      }
    });

    const prompt = `
      あなたは「言い訳の王様」というエンタメアプリのゲームマスターです。
      ユーザーが面白い言い訳をしたくなるような、理不尽で笑える「お題」を1つだけ生成してください。
      例: 「また遅刻？今日で3回目だよ？」、「宿題、犬が食べたって本当ですか？」、「なぜ昨日、私のプリン食べたの？」

      【重要・厳守】
      返答は必ず以下のJSONフォーマットのみを出力してください。
      {
        "themeText": "生成したお題のテキスト"
      }
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // JSON抽出の安全装置
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("JSONデータが見つかりませんでした。");
    
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    const data = JSON.parse(jsonString);

    return json(data);

  } catch (error) {
    console.error("[API] お題生成エラー:", error);
    return json({ error: "AIのお題生成に失敗しました。" }, { status: 500 });
  }
}