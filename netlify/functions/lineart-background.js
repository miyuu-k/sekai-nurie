// netlify/functions/lineart-background.js
import OpenAI from "openai";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST only" };
  }

  const { dataURL } = JSON.parse(event.body || "{}");
  if (!dataURL) return { statusCode: 400, body: "No dataURL" };

  const buf = Buffer.from(dataURL.split(",")[1], "base64");
  if (buf.length > 4 * 1024 * 1024) {
    return { statusCode: 400, body: "Image > 4 MB" };
  }

  const id = randomUUID();
  const tmpPath = `/tmp/${id}.json`;

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

  /* ←──────────────────────────────────────┐
     Background Function なので body は空でも
     OK。ジョブ ID を header に乗せて返す。 */
  return {
    statusCode: 202,
    headers: { "x-job-id": id }
  };
};
