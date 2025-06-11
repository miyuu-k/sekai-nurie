import OpenAI from "openai";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST only" };
  }

  /* ---- DataURL を受け取る ---- */
  const { dataURL } = JSON.parse(event.body || "{}");
  if (!dataURL) return { statusCode: 400, body: "No dataURL" };

  /* ---- base64 → Buffer ---- */
  const base64 = dataURL.split(",")[1];
  const buf = Buffer.from(base64, "base64");

  /* 画像 4 MB 制限チェック（DALL·E 2 要件） */
  if (buf.length > 4 * 1024 * 1024) {
    return { statusCode: 400, body: "Image > 4 MB" };
  }

  const id = randomUUID();            // ジョブ ID
  const tmpPath = `/tmp/${id}.json`;  // 同一インスタンスで数分保持

  /* ---- バックグラウンドで生成 ---- */
  (async () => {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.images.createVariation({
        model: "dall-e-2",
        image: Readable.from(buf),
        n: 1,
        size: "512x512"
      });
      await writeFile(tmpPath, JSON.stringify({ url: res.data[0].url }));
      console.log("finish", id);
    } catch (e) {
      await writeFile(tmpPath, JSON.stringify({ error: e.message }));
      console.error("error", id, e);
    }
  })();

  return {
    statusCode: 202,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  };
};
