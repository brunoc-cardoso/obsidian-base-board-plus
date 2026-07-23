export interface BaseConfig {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

import {
  NO_VALUE_COLUMN,
  CONFIG_KEY_COLUMNS,
  CONFIG_KEY_WIP_LIMITS,
  CONFIG_KEY_TASK_STORAGE_MODE,
  CONFIG_KEY_ATTACHMENT_RULES,
  DEFAULT_ATTACHMENT_RULES,
} from "./constants";
import { NullValue } from "obsidian";
import type { BasesEntryGroup } from "obsidian"; // Adjust as needed if types differ

export function getColumnName(key: unknown): string {
  if (key === undefined || key === null || key instanceof NullValue) {
    return NO_VALUE_COLUMN;
  }
  if (typeof key === "object" && key !== null) {
    if ("value" in key) {
      const val = (key as Record<string, unknown>).value;
      return String(val);
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- Bases-controlled object with custom toString
    return String(key);
  }
  if (typeof key === "string") return key;
  if (typeof key === "number" || typeof key === "boolean") return String(key);
  return "";
}

export function getWipLimits(
  config: BaseConfig | null | undefined,
): Record<string, number> {
  const raw = config?.get(CONFIG_KEY_WIP_LIMITS);
  return raw && typeof raw === "object" ? (raw as Record<string, number>) : {};
}

export function getWipLimit(
  config: BaseConfig | null | undefined,
  columnName: string,
): number | null {
  const limits = getWipLimits(config);
  const val = limits[columnName];
  return typeof val === "number" && val > 0 ? val : null;
}

export function setWipLimit(
  config: BaseConfig | null | undefined,
  columnName: string,
  limit: number | null,
): void {
  if (!config) return;
  const limits = getWipLimits(config);
  if (limit !== null && limit > 0) {
    limits[columnName] = limit;
  } else {
    delete limits[columnName];
  }
  config.set(CONFIG_KEY_WIP_LIMITS, limits);
}

export function getColumns(
  config: BaseConfig | null | undefined,
  currentGroups: BasesEntryGroup[],
): string[] {
  // 1. Try .base file config first (new preferred storage)
  const fromConfig = config?.get(CONFIG_KEY_COLUMNS) as string[] | undefined;

  const stored = fromConfig
    ? fromConfig.map((col) => (col === "" ? NO_VALUE_COLUMN : col))
    : null;

  const dataColumns = currentGroups.map((g) => getColumnName(g.key));

  if (stored && stored.length > 0) {
    const result = [...stored];
    for (const col of dataColumns) {
      if (!result.includes(col)) {
        result.push(col);
      }
    }
    return result;
  }

  return dataColumns;
}

export function saveColumns(
  config: BaseConfig | null | undefined,
  columns: string[],
): void {
  const toSave = columns.map((col) => (col === NO_VALUE_COLUMN ? "" : col));
  config?.set(CONFIG_KEY_COLUMNS, toSave);
}

export function getTaskStorageMode(
  config: BaseConfig | null | undefined,
): "file" | "folder" {
  const mode = config?.get(CONFIG_KEY_TASK_STORAGE_MODE);
  if (mode === "file") return "file";

  const directMode = (config as { taskStorageMode?: unknown } | null | undefined)
    ?.taskStorageMode;
  if (directMode === "file") return "file";

  return "folder";
}

export function getAttachmentSubfolder(
  config: BaseConfig | null | undefined,
  extension: string,
): string {
  const ext = extension.toLowerCase().replace(/^\./, "");
  const customRules = config?.get(CONFIG_KEY_ATTACHMENT_RULES) as
    | Record<string, string>
    | undefined;

  if (customRules && customRules[ext]) {
    return customRules[ext];
  }
  if (DEFAULT_ATTACHMENT_RULES[ext]) {
    return DEFAULT_ATTACHMENT_RULES[ext];
  }
  return "attachments";
}

