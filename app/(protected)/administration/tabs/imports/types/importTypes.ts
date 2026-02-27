export type WizardStep = 1 | 2 | 3 | 4;

export type DuplicateStrategy = "update" | "skip" | "update_only";

export type ColumnCategory = "system" | "kobo_meta" | "data";

export type MappingStatus = "matched" | "unmatched" | "auto_filled";

export interface ColumnMappingEntry {
  csv_header: string | null;
  stage_column: string | null;
  status: MappingStatus;
  category: ColumnCategory | null;
}

export interface DatasetColumnInfo {
  name: string;
  data_type: string;
  udt_name: string;
  is_nullable: boolean;
  category: ColumnCategory;
}

export interface DatasetColumnsResponse {
  dataset_code: string;
  stage_table: string;
  columns: DatasetColumnInfo[];
}
