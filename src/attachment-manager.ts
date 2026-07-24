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

      const prefix = isImage ? "img" : "doc";
      const timestamp = Date.now();
      let destPath = `${destFolderPath}/${prefix}_${timestamp}.${ext}`;

      let counter = 1;
      while (this.app.vault.getAbstractFileByPath(destPath)) {
        destPath = `${destFolderPath}/${prefix}_${timestamp}_${counter}.${ext}`;
        counter++;
      }

      const createdFile = await this.app.vault.createBinary(destPath, buffer);

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
