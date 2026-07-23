import { App, Editor, MarkdownFileInfo, MarkdownView, Plugin } from "obsidian";
import { getTaskFolderForFile } from "./folder-utils";
import { getAttachmentSubfolder } from "./board-config";

export class AttachmentManager {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  public registerEvents(plugin: Plugin): void {
    plugin.registerEvent(
      this.app.workspace.on(
        "editor-paste",
        (
          evt: ClipboardEvent,
          editor: Editor,
          info: MarkdownView | MarkdownFileInfo,
        ) => {
          if (evt.defaultPrevented) return;
          void this.handlePasteOrDrop(evt, editor, info);
        },
      ),
    );

    plugin.registerEvent(
      this.app.workspace.on(
        "editor-drop",
        (
          evt: DragEvent,
          editor: Editor,
          info: MarkdownView | MarkdownFileInfo,
        ) => {
          if (evt.defaultPrevented) return;
          void this.handlePasteOrDrop(evt, editor, info);
        },
      ),
    );
  }

  private async handlePasteOrDrop(
    evt: ClipboardEvent | DragEvent,
    editor: Editor,
    info: MarkdownView | MarkdownFileInfo,
  ): Promise<void> {
    const file = info.file;
    if (!file) return;

    const taskFolder = getTaskFolderForFile(file);
    if (!taskFolder) return;

    let files: File[] = [];
    if ("clipboardData" in evt && evt.clipboardData?.files?.length) {
      files = Array.from(evt.clipboardData.files);
    } else if ("dataTransfer" in evt && evt.dataTransfer?.files?.length) {
      files = Array.from(evt.dataTransfer.files);
    }

    if (files.length === 0) return;

    evt.preventDefault();
    evt.stopPropagation();

    for (const attachmentFile of files) {
      const ext = attachmentFile.name.split(".").pop() ?? "";
      const subfolderName = getAttachmentSubfolder(null, ext);
      const destFolderPath = `${taskFolder.path}/${subfolderName}`;

      if (!this.app.vault.getAbstractFileByPath(destFolderPath)) {
        await this.app.vault.createFolder(destFolderPath);
      }

      const buffer = await attachmentFile.arrayBuffer();
      const sanitizedName = attachmentFile.name.replace(/[\\/:*?"<>|]/g, "");
      let destPath = `${destFolderPath}/${sanitizedName}`;

      let counter = 1;
      const lastDot = sanitizedName.lastIndexOf(".");
      const baseNameWithoutExt =
        lastDot > 0 ? sanitizedName.substring(0, lastDot) : sanitizedName;

      while (this.app.vault.getAbstractFileByPath(destPath)) {
        destPath = `${destFolderPath}/${baseNameWithoutExt}_${counter}.${ext}`;
        counter++;
      }

      const createdFile = await this.app.vault.createBinary(destPath, buffer);

      const isImage = [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "svg",
        "webp",
        "bmp",
        "ico",
        "apng",
        "avif",
      ].includes(ext.toLowerCase());

      const relativePath = createdFile.path.startsWith(taskFolder.path + "/")
        ? createdFile.path.substring(taskFolder.path.length + 1)
        : createdFile.path;

      const linkText = isImage
        ? `![[${relativePath}]]\n`
        : `[[${relativePath}]]\n`;

      editor.replaceSelection(linkText);
    }
  }
}
