import { Result } from "../shared/index.js";
import { IStatementConverter, StatementRecord } from "./statement-converter.js";

export class NoopConverter implements IStatementConverter {
  async convert(): Promise<Result<StatementRecord[], Error>> {
    return { value: [] }
  }
}