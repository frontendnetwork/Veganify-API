import fs from "fs";
import { promisify } from "util";

const readFileAsync = promisify(fs.readFile);

export async function readJsonFile(filePath: string): Promise<any> {
  const data = await readFileAsync(filePath, "utf-8");
  return JSON.parse(data);
}
