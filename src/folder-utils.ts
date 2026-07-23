import { App, TFile, TFolder } from "obsidian";
import type { BasesEntry } from "obsidian";
import type { BaseConfig } from "./board-config";
import { CONFIG_KEY_TASKS_FOLDER } from "./constants";

export function getBoardFolder(app: App, entries: BasesEntry[]): string {
  if (entries.length > 0) {
    const firstPath = entries[0].file?.path ?? "";
    const parts = firstPath.split("/");

    // Traverse upwards from the folder containing the first note
    let currentFolderParts = parts.slice(0, -1);
    while (currentFolderParts.length > 0) {
      const folderPath = currentFolderParts.join("/");
      const folderFile = app.vault.getAbstractFileByPath(folderPath);
      if (folderFile instanceof TFolder) {
        // Check if this folder contains any .base file
        const hasBaseFile = folderFile.children.some(
          (child) => child instanceof TFile && child.extension === "base",
        );
        if (hasBaseFile) {
          return folderPath;
        }
      }
      currentFolderParts.pop(); // Go up one level
    }

    // Check the root folder as well
    const rootFolder = app.vault.getRoot();
    const hasBaseFileInRoot = rootFolder.children.some(
      (child) => child instanceof TFile && child.extension === "base",
    );
    if (hasBaseFileInRoot) {
      return "";
    }

    // Fallback logic
    if (parts.length > 2) {
      return parts.slice(0, -2).join("/");
    }
  }
  return "";
}

export function detectAndPersistTasksFolder(
  app: App,
  entries: BasesEntry[],
  config: BaseConfig | null | undefined,
  sampleFile?: TFile,
): string {
  const persistTasksFolder = (folder: string) => {
    if (folder && config) {
      config.set(CONFIG_KEY_TASKS_FOLDER, folder);
    }
    return folder;
  };

  if (sampleFile) {
    const parts = sampleFile.path.split("/");
    const tasksIdx = parts.lastIndexOf("Tasks");
    if (tasksIdx !== -1) {
      return persistTasksFolder(parts.slice(0, tasksIdx + 1).join("/"));
    }
    if (parts.length > 2) {
      return persistTasksFolder(parts.slice(0, -2).join("/"));
    }
    if (parts.length > 1) {
      return persistTasksFolder(parts.slice(0, -1).join("/"));
    }
  }

  if (entries.length > 0) {
    const firstPath = entries[0].file?.path ?? "";
    const parts = firstPath.split("/");
    const tasksIdx = parts.lastIndexOf("Tasks");
    if (tasksIdx !== -1) {
      return persistTasksFolder(parts.slice(0, tasksIdx + 1).join("/"));
    }
    if (parts.length > 2) {
      return persistTasksFolder(parts.slice(0, -2).join("/"));
    }
    if (parts.length > 1) {
      return persistTasksFolder(parts.slice(0, -1).join("/"));
    }
  }

  const boardFolder = getBoardFolder(app, entries);
  return persistTasksFolder(boardFolder ? `${boardFolder}/Tasks` : "Tasks");
}

export function getTasksFolder(
  app: App,
  entries: BasesEntry[],
  config: BaseConfig | null | undefined,
  sampleFile?: TFile,
): string {
  const stored = (
    config?.get(CONFIG_KEY_TASKS_FOLDER) as string | undefined
  )?.trim();
  if (stored) return stored;

  return detectAndPersistTasksFolder(app, entries, config, sampleFile);
}

export function isFolderTask(file: TFile): boolean {
  const parent = file.parent;
  if (!parent || parent.isRoot()) return false;

  // Direct match: folder has the same name as the note basename
  if (parent.name === file.basename) return true;

  // Index or task file inside a subfolder
  if (
    (file.basename.toLowerCase() === "index" ||
      file.basename.toLowerCase() === "task") &&
    !parent.isRoot()
  ) {
    return true;
  }

  return false;
}

export function getTaskFolderForFile(file: TFile): TFolder | null {
  if (isFolderTask(file)) {
    return file.parent ?? null;
  }
  return null;
}

