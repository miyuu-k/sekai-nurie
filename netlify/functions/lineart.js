// api/lineart.js
import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs/promises";

export const config = { api: { bodyParser: false } };  // Next.js / Vercel 用

export default async (req, res) => {
  // 1) アップロード画像を受け取る
  const form = formidable();
  const [_, files] = await form.parse(req);
  const filePath = files.file[0].filepath;

  // 2) OpenAI Images API を呼び出し
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY});

  const prompt =
    "cute colouring-book line art, kawaii, thick rounded outlines, for 6-year-olds, no shading, white background";

  const out = await openai.images.generate({
    model: "gpt-image-1",          // DALL·E 3 相当
    prompt,
    n: 1,
    size: "1024x1024",
    detail: "standard",
    image: await fs.readFile(filePath)     // バッファで渡す
  });

  // 3) 生成された URL を返す
  res.status(200).json({ url: out.data[0].url });
};
