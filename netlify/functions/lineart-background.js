import OpenAI from "openai";
import * as multipart from "parse-multipart";
import { v4 as uuidv4 } from "uuid";
import { writeFile } from "fs/promises";

/* 背景でも logs は Real-time ストリームに出ます */
export const handler = async (event) => {
  try {
    /* ---- multipart 解析 ---- */
    const ctype   = event.headers["content-type"] || event.headers["Content-Type"] || "";
    const boundary = multipart.getBoundary(ctype);
    if (!boundary)                    throw new Error("missing boundary");

    const buf = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
    const parts = multipart.Parse(buf, boundary);
    if (!parts.length)                throw new Error("no file");

    /* ---- OpenAI 画像生成 ---- */
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { data } = await openai.images.createVariation({
      model: "dall-e-2",
      image: parts[0].data,
      n:     1,
      size:  "512x512"
    });

    /* ---- 一時ファイルに結果を書き込む ---- */
    const jobId = uuidv4();
    await writeFile(`/tmp/${jobId}.json`, JSON.stringify({ url: data[0].url }));

    /* 202 Accepted → フロントへ jobId 返す */
    return {
      statusCode: 202,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId })
    };
  } catch (e) {
    console.error("BG ERROR", e);
    return { statusCode: 500, body: e.message };
  }
};

