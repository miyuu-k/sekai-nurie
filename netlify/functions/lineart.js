// netlify/functions/lineart.js
import OpenAI from "openai";
import * as parseMultipart from "parse-multipart";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // 1. 画像ファイルを取り出す（multipart/form-data）
  const contentType = event.headers["content-type"] || event.headers["Content-Type"];
  const boundary = parseMultipart.getBoundary(contentType);
  const parts = parseMultipart.parse(Buffer.from(event.body, "base64"), boundary);
  if (!parts.length) return { statusCode: 400, body: "No file" };

  // 2. OpenAI を呼び出す
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt =
    "cute colouring-book line art, kawaii, thick rounded outlines, for 6-year-olds, no shading, white background";

  const out = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    image: parts[0].data,           // バッファ
    detail: "standard"
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: out.data[0].url })
  };
};
