import { readFile } from "fs/promises";

export async function handler(event) {
  const id = event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: "missing id" };

  try {
    const json = await readFile(`/tmp/${id}.json`, "utf8");
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: json
    };
  } catch {
    /* ファイルがまだ無ければ 202 で待たせる */
    return { statusCode: 202, body: "processing" };
  }
}
