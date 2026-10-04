import fs from "node:fs";
import { promisify } from "node:util";

const readFileAsync = promisify(fs.readFile);

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const data = await readFileAsync(filePath, "utf-8");
  try {
    return JSON.parse(data) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from ${filePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
