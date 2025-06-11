import { readFile } from "fs/promises";

export const handler = async (event) => {
  const id = event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: "id required" };

  try {
    const data = await readFile(`/tmp/${id}.json`, "utf8");
    return { statusCode: 200, body: data };          // url か error
  } catch {
    return {
      statusCode: 202,
      body: JSON.stringify({ status: "processing" })
    };
  }
};
