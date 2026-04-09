import Dexie, { type Table } from "dexie";
import { appDbStores, type AppDatabaseTables } from "@/db/schema";

export class AppDB extends Dexie {
  charts!: Table<AppDatabaseTables["charts"], string>;
  chart_palaces!: Table<AppDatabaseTables["chart_palaces"], string>;
  chart_stars!: Table<AppDatabaseTables["chart_stars"], string>;
  chart_transforms!: Table<AppDatabaseTables["chart_transforms"], string>;
  case_records!: Table<AppDatabaseTables["case_records"], string>;
  case_notes!: Table<AppDatabaseTables["case_notes"], string>;
  case_events!: Table<AppDatabaseTables["case_events"], string>;
  tags!: Table<AppDatabaseTables["tags"], string>;
  case_tags!: Table<AppDatabaseTables["case_tags"], string>;
  rule_hints!: Table<AppDatabaseTables["rule_hints"], string>;
  case_rule_hint_hits!: Table<AppDatabaseTables["case_rule_hint_hits"], string>;

  constructor() {
    super("ziwei-destiny-desk");
    this.version(1).stores(appDbStores);
  }
}

export const appDb = new AppDB();
