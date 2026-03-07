import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST({ request }) {
  try {
    const { themeText, excuseText } = await request.json();

    console.log(`[API] お題: ${themeText}`);
    console.log(`[API] 言い訳: ${excuseText}`);
    console.log("[API] Geminiへリクエストを送信します...");
    const startTime = Date.now(); // 時間計測用

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { 
        responseMimeType: "application/json", // 確実にJSONフォーマットで返してもらうための強力な設定
        temperature: 0.7 
      }
    });

    const prompt = `
      あなたは「言い訳の王様」というエンタメアプリの非常に厳しい審査員です。
      以下のお題に対するユーザーの言い訳を、独自性や面白さの観点から厳しく10点満点で判定してください。
      また、言い訳に対する辛口のツッコミ（1〜2行）も生成してください。

      お題: 「${themeText}」
      言い訳: 「${excuseText}」

      【重要・厳守】
      返答は必ず以下のJSONフォーマットのみを出力してください。
      「Here is the JSON」などの挨拶、前置き、説明文は一切書かないでください。純粋なJSONデータのみを出力してください。

      {
        "score": 数値 (0〜10),
        "comment": "ツッコミのテキスト"
      }
    `;

   // AIにリクエストを送信
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    console.log(`[API] Geminiからの返答を受信しました！（${(Date.now() - startTime) / 1000}秒）`);
    console.log(`[API] 生のテキスト: ${responseText}`); // 何を喋ったか確認用

    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("AIの返答からJSONデータを見つけられませんでした。");
    }
    
    // { から } までの部分だけを切り取ります
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    
    // 切り取った純粋なJSONをデータに変換
    const evaluation = JSON.parse(jsonString);

    return json(evaluation);

  } catch (error) {
    console.error("[API] AI判定エラー:", error);
    return json({ error: "AIの判定に失敗しました。" }, { status: 500 });
  }
}
