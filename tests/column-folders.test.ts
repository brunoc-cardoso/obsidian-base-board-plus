import { describe, expect, it } from "vitest";
import { NO_VALUE_COLUMN, sanitizeFilename } from "../src/constants";

describe("column folders helper functions", () => {
  it("sanitizes column names for folder paths", () => {
    expect(sanitizeFilename("To Do")).toBe("To Do");
    expect(sanitizeFilename("In / Progress")).toBe("In  Progress");
    expect(sanitizeFilename("Done: Completed?")).toBe("Done Completed");
  });

  it("calculates target column folder path correctly", () => {
    const tasksFolder = "MyBoard/Tasks";
    
    function resolveTargetFolder(targetColumn: string): string {
      const sanitizedCol = sanitizeFilename(targetColumn.trim());
      return targetColumn === NO_VALUE_COLUMN || !sanitizedCol
        ? tasksFolder
        : `${tasksFolder}/${sanitizedCol}`;
    }

    expect(resolveTargetFolder("To Do")).toBe("MyBoard/Tasks/To Do");
    expect(resolveTargetFolder("In Progress")).toBe("MyBoard/Tasks/In Progress");
    expect(resolveTargetFolder(NO_VALUE_COLUMN)).toBe("MyBoard/Tasks");
    expect(resolveTargetFolder("   ")).toBe("MyBoard/Tasks");
  });
});
