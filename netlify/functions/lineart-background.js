import OpenAI from "openai";
import * as multipart from "parse-multipart";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";

export const handler = async (event) => {
  /* --- HTTP メソッド確認 ------------------------------------------------ */
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST only" };
  }

  /* --- multipart 解析 -------------------------------------------------- */
  const contentType =
    event.headers["content-type"] || event.headers["Content-Type"] || "";
  const boundary = multipart.getBoundary(contentType);
  if (!boundary) {
    return { statusCode: 400, body: "missing multipart boundary" };
  }

  /* ★ isBase64Encoded を考慮して Buffer 化 ----------------------------- */
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "binary");

  const parts = multipart.Parse(bodyBuffer, boundary);
  if (!parts.length) return { statusCode: 400, body: "no file" };

  const buf = parts[0].data;
  if (buf.length > 4 * 1024 * 1024) {
    return { statusCode: 400, body: "Image > 4 MB" };
  }

  /* --- 非同期ジョブ実行 ------------------------------------------------ */
  const id = randomUUID();
  const tmpPath = `/tmp/${id}.json`;

  (async () => {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      /* ★ Buffer をそのまま渡し、サイズは 512x512 で指定 */
      const res = await openai.images.createVariation({
        model: "dall-e-2",
        image: buf,
        n: 1,
        size: "512x512"
      });

      await writeFile(tmpPath, JSON.stringify({ url: res.data[0].url }));
    } catch (e) {
      await writeFile(tmpPath, JSON.stringify({ error: e.message }));
    }
  })();

  /* --- 受け付けレスポンス --------------------------------------------- */
  return {
    statusCode: 202,
    headers: { "x-job-id": id }
  };
};
