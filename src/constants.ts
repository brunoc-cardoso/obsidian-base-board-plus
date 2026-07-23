/** Column label used when an entry has no value for the groupBy property. */
export const NO_VALUE_COLUMN = "(No value)";

/** Frontmatter property that controls card ordering within a column. */
export const ORDER_PROPERTY = "kanban_order";

/** Key used by BasesViewConfig.set/get to persist column order in the .base file. */
export const CONFIG_KEY_COLUMNS = "boardColumns";

/** Key used by BasesViewConfig.set/get to persist custom tag colors in the .base file. */
export const CONFIG_KEY_TAG_COLORS = "tagColors";

/** Key used by BasesViewConfig.set/get to persist custom tags list in the .base file. */
export const CONFIG_KEY_CUSTOM_TAGS = "customTags";

/** Key used by BasesViewConfig.set/get to persist card click behavior in the .base file. */
export const CONFIG_KEY_OPEN_BEHAVIOR = "cardOpenBehavior";

/** Key used by BasesViewConfig.set/get to persist column colors in the .base file. */
export const CONFIG_KEY_COLUMN_COLORS = "columnColors";

/** Key used by BasesViewConfig.set/get to persist per-column WIP limits. */
export const CONFIG_KEY_WIP_LIMITS = "wipLimits";

/** Key used by BasesViewConfig.set/get to persist card cover property key in the .base file. */
export const CONFIG_KEY_COVER_PROPERTY = "cardCoverProperty";

/** Key used by BasesViewConfig.set/get to persist if new cards should be added to the top in the .base file. */
export const CONFIG_KEY_ADD_TO_TOP = "newCardsToTop";

/** Key used by BasesViewConfig.set/get to persist if cards are organized in column subfolders in the .base file. */
export const CONFIG_KEY_COLUMN_FOLDERS = "columnFolders";

/** Key used by BasesViewConfig.set/get to persist card template file path in the .base file. */
export const CONFIG_KEY_CARD_TEMPLATE = "cardTemplate";

/** Key used by BasesViewConfig.set/get to persist the resolved tasks folder path in the .base file. */
export const CONFIG_KEY_TASKS_FOLDER = "tasksFolder";

/** Key used by BasesViewConfig.set/get to persist the task storage mode ('file' vs 'folder'). */
export const CONFIG_KEY_TASK_STORAGE_MODE = "taskStorageMode";

/** Key used by BasesViewConfig.set/get to persist attachment subfolder routing rules. */
export const CONFIG_KEY_ATTACHMENT_RULES = "attachmentRules";

/** Default extension mappings to subfolders inside a task folder */
export const DEFAULT_ATTACHMENT_RULES: Record<string, string> = {
  // Images
  png: "images",
  jpg: "images",
  jpeg: "images",
  gif: "images",
  svg: "images",
  webp: "images",
  bmp: "images",
  ico: "images",
  apng: "images",
  avif: "images",
  heic: "images",
  heif: "images",
  // Documents
  pdf: "documents",
  doc: "documents",
  docx: "documents",
  xls: "documents",
  xlsx: "documents",
  ppt: "documents",
  pptx: "documents",
  txt: "documents",
  csv: "documents",
};

/**
 * Regex matching characters that are invalid in file/folder names.
 * Used when sanitizing user input before creating vault items.
 */
export const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/**
 * Sanitize a string for use as a file or folder name by stripping
 * characters that are not allowed on common operating systems.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(UNSAFE_FILENAME_CHARS, "");
}
