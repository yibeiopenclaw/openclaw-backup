import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { validateManifest, formatManifest, formatSize } from "./manifest.mjs";

export function inspectBackup(archivePath) {
  if (!existsSync(archivePath)) {
    throw new Error(`File not found: ${archivePath}`);
  }

  // Extract manifest
  let manifestJson;
  try {
    manifestJson = execSync(
      `tar -xzf "${archivePath}" -O ./manifest.json`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
  } catch {
    throw new Error("Could not read manifest.json from backup archive");
  }

  const manifest = JSON.parse(manifestJson);
  validateManifest(manifest);

  console.log(formatManifest(manifest));
  console.log("");

  // List files in archive
  const fileList = execSync(
    `tar -tzf "${archivePath}"`,
    { encoding: "utf8" }
  )
    .trim()
    .split("\n")
    .filter((f) => f !== "./" && f !== "./manifest.json")
    .map((f) => f.replace(/^\.\//, ""));

  console.log(`Contents (${fileList.length} files):`);
  for (const f of fileList) {
    if (f === "manifest.json") continue;
    console.log(`  ${f}`);
  }
}
