import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { validateManifest, formatManifest } from "./manifest.mjs";

export function getBackupDetails(archivePath) {
  if (!existsSync(archivePath)) {
    throw new Error(`File not found: ${archivePath}`);
  }

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

  const fileList = execSync(`tar -tzf "${archivePath}"`, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((f) => f !== "./" && f !== "./manifest.json")
    .map((f) => f.replace(/^\.\//, ""))
    .filter((f) => f !== "manifest.json");

  return { manifest, files: fileList };
}

export function inspectBackup(archivePath) {
  const { manifest, files } = getBackupDetails(archivePath);

  console.log(formatManifest(manifest));
  console.log("");
  console.log(`Contents (${files.length} files):`);
  for (const f of files) {
    console.log(`  ${f}`);
  }
}
