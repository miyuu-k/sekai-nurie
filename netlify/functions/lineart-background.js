import OpenAI from "openai";
import * as multipart from "parse-multipart";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST only" };
  }

  /* === ここが multipart 受信 === */
  const contentType = event.headers["content-type"] || "";
  const boundary    = multipart.getBoundary(contentType);
  const parts       = multipart.Parse(Buffer.from(event.body, "base64"), boundary);
  if (!parts.length) return { statusCode: 400, body: "no file" };

  const buf = parts[0].data;                    // ← PNG バイナリ
  if (buf.length > 4 * 1024 * 1024) {
    return { statusCode: 400, body: "Image > 4 MB" };
  }

  /* === ここから下はそのまま === */
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
    } catch (e) {
      await writeFile(tmpPath, JSON.stringify({ error: e.message }));
    }
  })();

  return { statusCode: 202, headers: { "x-job-id": id } };
};
