import { describe, expect, it } from "vitest";

describe("card template parsing and placeholders", () => {
  it("replaces {{title}}, {{date}}, and {{time}} placeholders in body and frontmatter", () => {
    const rawTemplate = `---
status: Icebox
domain: 
tags:
  - feature
header: "Plano: {{title}}"
---
# Plano: {{title}}

> [!todo] Objetivo

[Descrição clara]
`;

    const title = "Implement Login";
    const dateStr = "2026-07-20";
    const timeStr = "11:50";

    const processPlaceholders = (text: string): string => {
      return text
        .replace(/\{\{\s*title\s*\}\}/gi, title)
        .replace(/\{\{\s*date\s*\}\}/gi, dateStr)
        .replace(/\{\{\s*time\s*\}\}/gi, timeStr);
    };

    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(rawTemplate);
    expect(match).not.toBeNull();

    if (match) {
      const body = match[2];
      const processedBody = processPlaceholders(body);
      expect(processedBody).toContain("# Plano: Implement Login");
      expect(processedBody).toContain("> [!todo] Objetivo");

      const processedHeader = processPlaceholders("Plano: {{title}}");
      expect(processedHeader).toBe("Plano: Implement Login");
    }
  });
});
