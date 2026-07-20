import { App, Notice, parseYaml, TFile } from "obsidian";
import type { BaseConfig } from "./board-config";
import {
  NO_VALUE_COLUMN,
  ORDER_PROPERTY,
  CONFIG_KEY_CARD_TEMPLATE,
  sanitizeFilename,
} from "./constants";
import { OrderValue } from "./order";

export function getTemplateFile(
  app: App,
  config: BaseConfig | null | undefined,
  boardFolder: string,
): TFile | null {
  const vault = app.vault;
  const configuredPath = (
    config?.get(CONFIG_KEY_CARD_TEMPLATE) as string | undefined
  )?.trim();

  if (configuredPath) {
    let file = vault.getAbstractFileByPath(configuredPath);
    if (file instanceof TFile) return file;

    if (!configuredPath.endsWith(".md")) {
      file = vault.getAbstractFileByPath(`${configuredPath}.md`);
      if (file instanceof TFile) return file;
    }

    if (boardFolder) {
      file = vault.getAbstractFileByPath(`${boardFolder}/${configuredPath}`);
      if (file instanceof TFile) return file;
      if (!configuredPath.endsWith(".md")) {
        file = vault.getAbstractFileByPath(
          `${boardFolder}/${configuredPath}.md`,
        );
        if (file instanceof TFile) return file;
      }
    }
  }

  const candidatePaths = boardFolder
    ? [
        `${boardFolder}/Config/Examples/Task Default.md`,
        `${boardFolder}/Config/Task Default.md`,
        `${boardFolder}/Task Default.md`,
        `${boardFolder}/Config/Examples/Task Default`,
        `${boardFolder}/Config/Task Default`,
      ]
    : [
        "Config/Examples/Task Default.md",
        "Config/Task Default.md",
        "Task Default.md",
      ];

  for (const path of candidatePaths) {
    const file = vault.getAbstractFileByPath(path);
    if (file instanceof TFile) return file;
  }

  return null;
}

export async function createCardFile(
  app: App,
  config: BaseConfig | null | undefined,
  title: string,
  columnName: string,
  targetOrder: OrderValue,
  boardFolder: string,
  tasksFolder: string,
  isColumnFoldersEnabled: boolean,
  groupByProp: string | null,
): Promise<TFile | null> {
  if (!groupByProp) {
    new Notice("Cannot create card: no group by property configured.");
    return null;
  }

  // --- Build destination path ---
  const safeTitle = sanitizeFilename(title);

  let destFolder = tasksFolder;
  if (isColumnFoldersEnabled && columnName !== NO_VALUE_COLUMN) {
    const sanitizedCol = sanitizeFilename(columnName.trim());
    if (sanitizedCol) {
      destFolder = `${tasksFolder}/${sanitizedCol}`;
    }
  }

  const vault = app.vault;
  if (!vault.getAbstractFileByPath(destFolder)) {
    await vault.createFolder(destFolder);
  }

  let destPath = `${destFolder}/${safeTitle}.md`;
  let counter = 1;
  while (vault.getAbstractFileByPath(destPath)) {
    destPath = `${destFolder}/${safeTitle} ${counter}.md`;
    counter++;
  }

  // --- Template: read body text and frontmatter keys ---
  const now = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const processPlaceholders = (text: string): string =>
    text
      .replace(/\{\{\s*title\s*\}\}/gi, title)
      .replace(/\{\{\s*date\s*\}\}/gi, dateStr)
      .replace(/\{\{\s*time\s*\}\}/gi, timeStr);

  let templateFm: Record<string, unknown> = {};
  let bodyText = "";

  const templateFile = getTemplateFile(app, config, boardFolder);
  if (templateFile) {
    try {
      const raw = await vault.read(templateFile);
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
      if (match) {
        try {
          const parsed = parseYaml(match[1]) as unknown;
          if (parsed && typeof parsed === "object") {
            templateFm = parsed as Record<string, unknown>;
          }
        } catch {
          // ignore yaml parse error
        }
        bodyText = processPlaceholders(match[2]);
      } else {
        bodyText = processPlaceholders(raw);
      }
    } catch {
      // ignore template read error
    }
  }

  // --- Create file with template body (no manual YAML) ---
  try {
    const file = await vault.create(destPath, bodyText);

    // --- Write all frontmatter safely via Obsidian's API ---
    await app.fileManager.processFrontMatter(
      file,
      (fm: Record<string, unknown>) => {
        // Board-required properties (take precedence over template)
        if (columnName !== NO_VALUE_COLUMN) {
          fm[groupByProp] = columnName;
        }
        fm[ORDER_PROPERTY] = targetOrder;

        // Template properties (skipping board-controlled keys)
        for (const k of Object.keys(templateFm)) {
          if (k === groupByProp || k === ORDER_PROPERTY) continue;
          const v = templateFm[k];
          fm[k] = typeof v === "string" ? processPlaceholders(v) : v;
        }
      },
    );

    return file;
  } catch (err) {
    new Notice(`Failed to create card: ${String(err)}`);
    return null;
  }
}
