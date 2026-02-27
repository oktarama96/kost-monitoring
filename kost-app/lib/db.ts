import fs from "fs";
import path from "path";
import { DatabaseData } from "./types";

const DATA_FILE_PATH = path.join(process.cwd(), "data", "data.json");

export function readData(): DatabaseData {
  try {
    const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
    return JSON.parse(raw) as DatabaseData;
  } catch (error) {
    console.error("Error reading data.json:", error);
    return { rooms: [], bills: [] };
  }
}

export function writeData(data: DatabaseData): void {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing data.json:", error);
    throw new Error("Failed to write data to file");
  }
}
