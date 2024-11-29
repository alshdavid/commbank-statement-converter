import { Parser } from "@json2csv/plainjs";
import { Result } from "../shared/index.js";

export function toCSV(data: any): Result<string, Error> {
  try {
    return { value: new Parser({}).parse(data) }
  } catch (error: any) {
    return { error }
  }
}
