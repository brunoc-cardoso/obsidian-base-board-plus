import { KanbanView } from "./kanban-view";
import { CONFIG_KEY_TAG_COLORS, CONFIG_KEY_CUSTOM_TAGS } from "./constants";
import {
  App,
  Modal,
  TFile,
  TFolder,
  setIcon,
  setTooltip,
  Setting,
  Notice,
} from "obsidian";
import { TagEditModal } from "./tag-edit-modal";
import { relativeLuminance } from "./color-utils";

export class Tags {
  public view: KanbanView;
  public activeFilters: Set<string> = new Set();
  private hasSyncedTagsFile = false;

  constructor(view: KanbanView) {
    this.view = view;
  }

  public getColors(): Record<string, string> {
    const raw = this.view.config?.get(CONFIG_KEY_TAG_COLORS);
    return raw && typeof raw === "object"
      ? (raw as Record<string, string>)
      : {};
  }

  public getCustomTags(): string[] {
    const raw = this.view.config?.get(CONFIG_KEY_CUSTOM_TAGS);
    return Array.isArray(raw)
      ? raw.filter((t): t is string => typeof t === "string")
      : [];
  }

  public addCustomTag(tag: string): void {
    const tags = this.getCustomTags();
    if (!tags.includes(tag)) {
      tags.push(tag);
      this.view.config?.set(CONFIG_KEY_CUSTOM_TAGS, tags);
      void this.updateTagsIndexFile();
      this.view.scheduleRender();
    }
  }

  public removeCustomTag(tag: string): void {
    const tags = this.getCustomTags().filter((t) => t !== tag);
    this.view.config?.set(CONFIG_KEY_CUSTOM_TAGS, tags);
    this.setColor(tag, "");
    void this.updateTagsIndexFile();
    this.view.scheduleRender();
  }

  public getBoardFolder(): string {
    const entries = this.view.data?.data ?? [];
    if (entries.length > 0) {
      const firstPath = entries[0].file?.path ?? "";
      const parts = firstPath.split("/");

      // Traverse upwards from the folder containing the first note
      // e.g. if note is "My Board/Tasks/note.md", start with folder "My Board/Tasks"
      let currentFolderParts = parts.slice(0, -1);

      while (currentFolderParts.length > 0) {
        const folderPath = currentFolderParts.join("/");
        const folderFile =
          this.view.app.vault.getAbstractFileByPath(folderPath);
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
      const rootFolder = this.view.app.vault.getRoot();
      const hasBaseFileInRoot = rootFolder.children.some(
        (child) => child instanceof TFile && child.extension === "base",
      );
      if (hasBaseFileInRoot) {
        return "";
      }

      // Fallback to the original logic: parent of parent (parts.slice(0, -2)) if it exists
      if (parts.length > 2) {
        return parts.slice(0, -2).join("/");
      }
    }
    return "";
  }

  private async updateTagsIndexFile(): Promise<void> {
    const customTags = this.getCustomTags();
    const boardFolder = this.getBoardFolder();
    const vault = this.view.app.vault;

    const oldTagsFilePath = boardFolder
      ? `${boardFolder}/base-board-tags.md`
      : "base-board-tags.md";
    const configFolderPath = boardFolder ? `${boardFolder}/Config` : "Config";
    const newTagsFilePath = boardFolder
      ? `${boardFolder}/Config/custom-tags.md`
      : "Config/custom-tags.md";

    // 1. Migration check: if old file exists, move and rename it to Config/custom-tags.md
    const oldFile = vault.getAbstractFileByPath(oldTagsFilePath);
    if (oldFile && oldFile instanceof TFile) {
      try {
        const configFolder = vault.getAbstractFileByPath(configFolderPath);
        if (!configFolder) {
          await vault.createFolder(configFolderPath);
        }
        await vault.rename(oldFile, newTagsFilePath);
      } catch (e) {
        console.error(
          "Base Board Plus: Falha na migração do arquivo de tags",
          e,
        );
      }
    }

    const file = vault.getAbstractFileByPath(newTagsFilePath);

    // 2. If no custom tags, clean up the file
    if (customTags.length === 0) {
      if (file && file instanceof TFile) {
        try {
          await this.view.app.fileManager.trashFile(file);
        } catch {
          // ignore
        }
      }
      return;
    }

    // 3. Generate content and ensure folder structure exists
    const content = [
      "%% Este arquivo é gerado automaticamente pelo Base Board Plus para registrar as tags personalizadas no Obsidian %%",
      "%% Não edite manualmente %%",
      "",
      "# Tags Personalizadas",
      customTags.map((t) => `#${t}`).join(" "),
      "",
    ].join("\n");

    try {
      const configFolder = vault.getAbstractFileByPath(configFolderPath);
      if (!configFolder) {
        await vault.createFolder(configFolderPath);
      }

      if (file && file instanceof TFile) {
        const currentContent = await vault.read(file);
        if (currentContent !== content) {
          await vault.modify(file, content);
        }
      } else {
        await vault.create(newTagsFilePath, content);
      }
    } catch (e) {
      console.error(
        "Base Board Plus: Falha ao escrever arquivo de tags customizadas",
        e,
      );
    }
  }

  public getDeterministicColor(tag: string): string {
    const DEFAULT_COLORS = [
      "#f87168", // Red
      "#fbbc04", // Orange
      "#fcc934", // Yellow
      "#34a853", // Green
      "#4285f4", // Blue
      "#a142f4", // Purple
      "#f442a1", // Pink
      "#20c997", // Teal
      "#fd7e14", // Orange
      "#6f42c1", // Indigo
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (
      DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length] ||
      DEFAULT_COLORS[0]
    );
  }

  public getColorForTag(tag: string): string {
    const customColors = this.getColors();
    return customColors[tag] || this.getDeterministicColor(tag);
  }

  public setColor(tag: string, color: string): void {
    const colors = this.getColors();
    if (color) {
      colors[tag] = color;
    } else {
      delete colors[tag];
    }
    this.view.config?.set(CONFIG_KEY_TAG_COLORS, colors);
    this.view.scheduleRender();
  }

  public extractTagsFromFile(file: TFile): string[] {
    const cache = this.view.app.metadataCache.getFileCache(file);
    const tags = (cache?.frontmatter?.tags ??
      cache?.frontmatter?.tag) as unknown;
    let fileTags: string[] = [];
    if (Array.isArray(tags)) {
      fileTags = tags.filter((t): t is string => typeof t === "string");
    } else if (typeof tags === "string") {
      fileTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
    }
    // Strip '#' prefix — Obsidian's MetadataCache sometimes normalises
    // frontmatter tags with a leading '#' (e.g. "#my-tag" instead of "my-tag").
    return fileTags.map((t) => (t.startsWith("#") ? t.slice(1) : t));
  }

  public promptEditTags(file: TFile): void {
    const currentTags = this.extractTagsFromFile(file);
    new TagEditModal(this.view.app, currentTags, this, (newTags: string[]) => {
      void this.view.app.fileManager.processFrontMatter(
        file,
        (fm: Record<string, unknown>) => {
          if (newTags.length === 0) {
            delete fm.tags;
            delete fm.tag;
          } else {
            fm.tags = newTags;
          }
        },
      );
    }).open();
  }

  public renderFilterBar(container: HTMLElement): void {
    if (!this.hasSyncedTagsFile) {
      this.hasSyncedTagsFile = true;
      void this.updateTagsIndexFile();
    }

    const allTags = new Set<string>();

    for (const group of this.view.currentGroups) {
      for (const entry of group.entries) {
        if (entry.file instanceof TFile) {
          const fileTags = this.extractTagsFromFile(entry.file);
          fileTags.forEach((t) => allTags.add(t));
        }
      }
    }

    const customTags = this.getCustomTags();
    customTags.forEach((t) => allTags.add(t));

    if (allTags.size === 0 && this.activeFilters.size === 0) {
      return;
    }

    // Insert before the board
    const boardEl = container.querySelector(".base-board-board");
    if (!boardEl) return;

    const barEl = container.createDiv({ cls: "base-board-filter-bar" });
    container.insertBefore(barEl, boardEl);

    const titleEl = barEl.createSpan({
      cls: "base-board-filter-title",
      text: "Filters:",
    });
    setIcon(titleEl, "lucide-filter");

    const tagsArray = Array.from(allTags).sort();

    // Also include any active filters that might not be in the current cards
    for (const activeTag of this.activeFilters) {
      if (!allTags.has(activeTag)) tagsArray.push(activeTag);
    }

    for (const tag of tagsArray) {
      const pill = barEl.createSpan({ cls: "base-board-filter-pill" });
      pill.textContent = tag;

      const tagColor = this.getColorForTag(tag);
      if (tagColor) {
        pill.style.setProperty("--tag-color", tagColor);
        if (relativeLuminance(tagColor) === "dark") {
          pill.addClass("base-board-filter-pill-light");
        } else {
          pill.addClass("base-board-filter-pill-dark");
        }
      }

      if (this.activeFilters.has(tag)) {
        pill.addClass("is-active");
      }

      setTooltip(pill, "Click to filter · Right-click to change color");

      pill.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        new ColorPickerModal(
          this.view.app,
          tag,
          tagColor,
          this,
          true,
          (color) => this.setColor(tag, color),
        ).open();
      });

      pill.addEventListener("click", () => {
        if (this.activeFilters.has(tag)) {
          this.activeFilters.delete(tag);
        } else {
          this.activeFilters.add(tag);
        }
        this.view.scheduleRender();
      });
    }

    if (this.activeFilters.size > 0) {
      const clearBtn = barEl.createSpan({
        cls: "base-board-filter-clear",
        text: "Clear",
      });
      clearBtn.addEventListener("click", () => {
        this.activeFilters.clear();
        this.view.scheduleRender();
      });
    }
  }
}

// ---------------------------------------------------------------------------
//  Color picker modal — uses Obsidian Modal for proper focus/Escape handling
// ---------------------------------------------------------------------------

export class ColorPickerModal extends Modal {
  private tag: string;
  private currentColor: string;
  private tagsManager: Tags;
  private isTag: boolean;
  private onChange: (color: string) => void;

  constructor(
    app: App,
    tag: string,
    currentColor: string,
    tagsManager: Tags,
    isTag: boolean,
    onChange: (color: string) => void,
  ) {
    super(app);
    this.tag = tag;
    this.currentColor = currentColor;
    this.tagsManager = tagsManager;
    this.isTag = isTag;
    this.onChange = onChange;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: `Color for "${this.tag}"` });

    new Setting(contentEl).setName("Tag color").addColorPicker((color) => {
      color.setValue(this.currentColor);
      color.onChange((value) => {
        this.currentColor = value;
        this.onChange(value);
      });
    });

    const isCustom =
      this.isTag && this.tagsManager.getCustomTags().includes(this.tag);

    const actionSetting = new Setting(contentEl);
    if (isCustom) {
      actionSetting.addButton((btn) => {
        btn.setButtonText("Delete custom tag").onClick(() => {
          this.tagsManager.removeCustomTag(this.tag);
          this.close();
        });
        btn.buttonEl.classList.add("mod-danger");
      });
    }

    actionSetting
      .addButton((btn) => {
        btn.setButtonText("Reset to default").onClick(() => {
          this.onChange("");
          this.close();
        });
        btn.buttonEl.classList.add("mod-warning");
      })
      .addButton((btn) => {
        btn
          .setButtonText("Done")
          .setCta()
          .onClick(() => this.close());
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ---------------------------------------------------------------------------
//  Create Tag modal
// ---------------------------------------------------------------------------

export class CreateTagModal extends Modal {
  private onSubmit: (name: string, color: string) => void;

  constructor(app: App, onSubmit: (name: string, color: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    this.titleEl.setText("Create custom tag");

    let name = "";
    let color = "#4285f4";

    new Setting(contentEl).setName("Tag name").addText((text) => {
      text.setPlaceholder("E.g. Urgent").onChange((value) => {
        name = value;
      });
    });

    new Setting(contentEl).setName("Tag color").addColorPicker((cp) => {
      cp.setValue(color);
      cp.onChange((value) => {
        color = value;
      });
    });

    new Setting(contentEl)
      .addButton((btn) => {
        btn.setButtonText("Cancel").onClick(() => this.close());
      })
      .addButton((btn) => {
        btn
          .setButtonText("Create")
          .setCta()
          .onClick(() => {
            const cleaned = name.trim();
            if (!cleaned) {
              new Notice("Tag name cannot be empty.");
              return;
            }
            this.close();
            this.onSubmit(cleaned, color);
          });
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
