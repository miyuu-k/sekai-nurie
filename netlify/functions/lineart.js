/* eslint-disable import/extensions */
import OpenAI from "openai";
import * as multipart from "parse-multipart";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  /* ---------- メソッド制限 ---------- */
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST only" };
  }

  /* ---------- multipart 解析 ---------- */
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  const boundary    = multipart.getBoundary(contentType);
  if (!boundary)    return { statusCode: 400, body: "missing boundary" };

  const bodyBuf = Buffer.from(
    event.body,
    event.isBase64Encoded ? "base64" : "utf8"
  );

  const parts = multipart.Parse(bodyBuf, boundary);
  if (!parts.length) return { statusCode: 400, body: "no file" };

  /* ---------- OpenAI 呼び出し ---------- */
  try {
    const { data } = await openai.images.createVariation({
      model: "dall-e-2",
      image: parts[0].data,   // バッファ
      n:     1,
      size:  "512x512"
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: data[0].url })
    };
  } catch (e) {
    console.error("OPENAI ERROR:", e); // Netlify の Real-time に出力
    return { statusCode: 500, body: e.message };
  }
}
