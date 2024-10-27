import fs from "fs";
import { promisify } from "util";

const readFileAsync = promisify(fs.readFile);

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const data = await readFileAsync(filePath, "utf-8");
  return JSON.parse(data) as T;
}
