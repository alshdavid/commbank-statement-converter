import { Result } from "../shared";
import { IStatementConverter, StatementRecord } from "./statement-converter";

export class NoopConverter implements IStatementConverter {
  async convert(): Promise<Result<StatementRecord[], Error>> {
    return { value: [] }
  }
}