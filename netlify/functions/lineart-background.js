// netlify/functions/lineart-background.js
import OpenAI from "openai";
import * as multipart from "parse-multipart";
import { Readable } from "stream";

export const handler = async (event) => {
  /* ---------- 呼び出し直後にログ ---------- */
  console.log("invoked", new Date().toISOString());
  console.log("method", event.httpMethod, "path", event.rawUrl);

  /* ---------- メソッド判定 ---------- */
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST only" };
  }

  /* ---------- JSON か multipart か判定 ---------- */
  const isJson = (event.headers["content-type"] || "").includes("application/json");

  let imgBuf;
  if (isJson) {
    /* ======= JSON: { dataURL: ... } ======= */
    const { dataURL } = JSON.parse(event.body || "{}");
    if (!dataURL) return { statusCode: 400, body: "No dataURL" };

    // DataURL -> Buffer
    const base64 = dataURL.split(",")[1];
    imgBuf = Buffer.from(base64, "base64");
  } else {
    /* ======= multipart/form-data (未使用ならスキップ可) ======= */
    const boundary = multipart.getBoundary(event.headers["content-type"]);
    const parts = multipart.Parse(Buffer.from(event.body, "base64"), boundary);
    if (!parts.length) return { statusCode: 400, body: "No file" };
    imgBuf = parts[0].data;
  }

  /* ---------- 4MB/PNG チェック（簡易） ---------- */
  if (imgBuf.length > 4 * 1024 * 1024) {
    return { statusCode: 400, body: "Image too large (>4MB)" };
  }

  /* ---------- OpenAI DALL·E 2 Variations ---------- */
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = Readable.from(imgBuf);

    const res = await openai.images.createVariation({
      model: "dall-e-2",
      image: stream,
      n: 1,
      size: "512x512"          // 512 だと速くて4MB制限にも余裕
    });

    const url = res.data[0].url;
    console.log("generated", url);

    return {
      statusCode: 202,                   // background関数なので 202
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    };
  } catch (e) {
    console.error("OpenAI error", e);
    return { statusCode: 500, body: "OpenAI error" };
  }
};
