import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin.ts";

test("preview discovery includes nested TSX files and skips private/hidden files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-discovery-"));
  try {
    const files = [
      "Card.tsx",
      "nested/Details.tsx",
      "_Private.tsx",
      "_helpers/Hidden.tsx",
      "nested/_Private.tsx",
      ".hidden/Hidden.tsx",
      ".Hidden.tsx",
      "NotAComponent.ts",
    ];
    for (const file of files) {
      const target = path.join(root, "src/components/mockups", file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, "export default function Component() {}");
    }
    const plugin = mockupPreviewPlugin();
    plugin.configResolved({ root });
    await plugin.buildStart();
    const output = await readFile(
      path.join(root, "src/.generated/mockup-components.ts"),
      "utf8",
    );
    assert.match(output, /"\.\/components\/mockups\/Card\.tsx"/);
    assert.match(output, /"\.\/components\/mockups\/nested\/Details\.tsx"/);
    assert.match(output, /import\("\.\.\/components\/mockups\/Card\.tsx"\)/);
    assert.equal((output.match(/\(\) => import\(/g) ?? []).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preview discovery handles a missing mockups directory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-empty-"));
  try {
    const plugin = mockupPreviewPlugin();
    plugin.configResolved({ root });
    await plugin.buildStart();
    const output = await readFile(
      path.join(root, "src/.generated/mockup-components.ts"),
      "utf8",
    );
    assert.doesNotMatch(output, /\(\) => import\(/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
