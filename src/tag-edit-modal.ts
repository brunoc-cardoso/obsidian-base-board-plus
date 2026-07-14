import { App, Modal, Setting, setIcon, TFile } from "obsidian";
import { Tags } from "./tags";
import { relativeLuminance } from "./color-utils";

export class TagEditModal extends Modal {
  private tags: string[];
  private tagsManager: Tags;
  private onSubmit: (tags: string[]) => void;
  private inputContainerEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private suggestionsContainerEl!: HTMLElement;
  private newlyTypedTags: Set<string> = new Set();

  constructor(
    app: App,
    tags: string[],
    tagsManager: Tags,
    onSubmit: (tags: string[]) => void,
  ) {
    super(app);
    this.tags = [...tags]; // Copy
    this.tagsManager = tagsManager;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    this.titleEl.setText("Edit tags");

    this.contentEl.createEl("p", {
      text: "Type a tag and press enter or comma. Press backspace to remove.",
      cls: "setting-item-description",
    });

    // Container acts as the visual "input box"
    this.inputContainerEl = this.contentEl.createDiv({
      cls: "base-board-tag-input-container",
    });

    // The actual text input
    this.inputEl = this.inputContainerEl.createEl("input", {
      type: "text",
      cls: "base-board-tag-input",
      placeholder: "Add tag...",
    });

    // Support focusing input when clicking anywhere inside the faux-input container
    this.inputContainerEl.addEventListener("click", () => {
      this.inputEl.focus();
    });

    this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const val = this.inputEl.value.trim();
        const cleaned = val.startsWith("#") ? val.slice(1) : val;
        if (cleaned && !this.tags.includes(cleaned)) {
          this.tags.push(cleaned);
          this.newlyTypedTags.add(cleaned);
        }
        this.inputEl.value = "";
        this.renderTags();
      } else if (e.key === "Backspace" && this.inputEl.value === "") {
        if (this.tags.length > 0) {
          const removed = this.tags.pop();
          if (removed) {
            this.newlyTypedTags.delete(removed);
          }
          this.renderTags();
        }
      }
    });

    // Suggestions container for clickable tags
    this.suggestionsContainerEl = this.contentEl.createDiv({
      cls: "base-board-tag-suggestions-container",
    });

    this.renderTags();

    const actionsContainer = this.contentEl.createDiv({
      cls: "base-board-modal-actions-right",
    });

    new Setting(actionsContainer).addButton((btn) => {
      btn
        .setButtonText("Save")
        .setCta()
        .onClick(() => {
          // Flush any pending text before save
          const val = this.inputEl.value.trim();
          const cleaned = val.startsWith("#") ? val.slice(1) : val;
          if (cleaned && !this.tags.includes(cleaned)) {
            this.tags.push(cleaned);
            this.newlyTypedTags.add(cleaned);
          }

          // Persist any newly typed custom tags to the board config
          this.newlyTypedTags.forEach((tag) => {
            if (this.tags.includes(tag)) {
              this.tagsManager.addCustomTag(tag);
            }
          });

          this.close();
          this.onSubmit(this.tags);
        });
    });

    window.setTimeout(() => this.inputEl.focus(), 50);
  }

  private renderTags() {
    // Clear all existing tags (but keep the input!)
    const existingTags = this.inputContainerEl.querySelectorAll(
      ".base-board-tag-chip",
    );
    existingTags.forEach((el) => el.remove());

    // Insert new tags BEFORE the input element
    this.tags.forEach((tag) => {
      const chipEl = this.inputContainerEl.createDiv({
        cls: "base-board-tag-chip",
      });
      chipEl.createSpan({ text: tag, cls: "base-board-tag-chip-text" });

      const color = this.tagsManager.getColorForTag(tag);
      if (color) {
        chipEl.style.setProperty("--tag-color", color);
        if (relativeLuminance(color) === "dark") {
          chipEl.addClass("base-board-tag-chip-light");
        } else {
          chipEl.addClass("base-board-tag-chip-dark");
        }
      }

      const removeBtn = chipEl.createSpan({
        cls: "base-board-tag-chip-remove",
      });
      setIcon(removeBtn, "lucide-x");
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.tags = this.tags.filter((t) => t !== tag);
        this.newlyTypedTags.delete(tag);
        this.renderTags();
        this.inputEl.focus();
      });

      this.inputContainerEl.insertBefore(chipEl, this.inputEl);
    });

    if (this.suggestionsContainerEl) {
      this.renderSuggestions();
    }
  }

  private renderSuggestions() {
    this.suggestionsContainerEl.empty();
    this.suggestionsContainerEl.createDiv({
      text: "Available tags:",
      cls: "base-board-tag-suggestions-title",
    });

    const suggestionsListEl = this.suggestionsContainerEl.createDiv({
      cls: "base-board-tag-suggestions-list",
    });

    // Consolidate tags from active board groups and custom tags
    const allBoardTags = new Set<string>();
    const currentGroups = this.tagsManager.view?.currentGroups ?? [];
    for (const group of currentGroups) {
      for (const entry of group.entries) {
        if (entry.file instanceof TFile) {
          const fileTags = this.tagsManager.extractTagsFromFile(entry.file);
          fileTags.forEach((t) => allBoardTags.add(t));
        }
      }
    }
    const customTags = this.tagsManager.getCustomTags();
    customTags.forEach((t) => allBoardTags.add(t));

    const sortedTags = Array.from(allBoardTags).sort();

    if (sortedTags.length === 0) {
      suggestionsListEl.createDiv({
        cls: "base-board-tag-suggestions-empty",
        text: "No tags available. Use the + button on the filter bar or type a new tag to create one.",
      });
      return;
    }

    sortedTags.forEach((tag) => {
      const isActive = this.tags.includes(tag);
      const chipEl = suggestionsListEl.createSpan({
        cls: `base-board-tag-suggestion-chip${isActive ? " is-active" : ""}`,
        text: tag,
      });

      const color = this.tagsManager.getColorForTag(tag);
      if (color) {
        chipEl.style.setProperty("--tag-color", color);
        if (relativeLuminance(color) === "dark") {
          chipEl.addClass("base-board-tag-suggestion-chip-light");
        } else {
          chipEl.addClass("base-board-tag-suggestion-chip-dark");
        }
      }

      chipEl.addEventListener("click", () => {
        if (isActive) {
          this.tags = this.tags.filter((t) => t !== tag);
        } else {
          this.tags.push(tag);
        }
        this.renderTags();
        this.inputEl.focus();
      });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
