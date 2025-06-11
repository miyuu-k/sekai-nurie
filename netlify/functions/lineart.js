// netlify/functions/lineart.js
import OpenAI from "openai";
import * as multipart from "parse-multipart";
import { Readable } from "stream";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  /* 1. multipart/form-data から画像を抜き出す */
  const contentType =
    event.headers["content-type"] || event.headers["Content-Type"];
  const boundary = multipart.getBoundary(contentType);
  const parts = multipart.Parse(Buffer.from(event.body, "base64"), boundary);
  if (!parts.length) {
    return { statusCode: 400, body: "No file" };
  }
  const imgBuf = parts[0].data; // Buffer

  /* 2. OpenAI (DALL·E 2) でバリエーション生成 */
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // createVariation は Node ストリームまたは fs.ReadStream が必要
  const stream = Readable.from(imgBuf);       // Buffer → Stream

  const out = await openai.images.createVariation({
    model: "dall-e-2",        // ← ★ DALL·E 2 を明示
    image: stream,            // アップロード画像
    n: 1,
    size: "1024x1024"
  });

  /* 3. 生成 URL を返却 */
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: out.data[0].url })
  };
};
