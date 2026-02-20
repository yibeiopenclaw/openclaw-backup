import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { getBackupDir } from "./paths.mjs";
import { formatSize } from "./manifest.mjs";

export function listBackups() {
  const backupDir = getBackupDir();

  if (!existsSync(backupDir)) {
    console.log("No backups found.");
    console.log(`Backup directory: ${backupDir}`);
    return;
  }

  const files = readdirSync(backupDir)
    .filter((f) => f.startsWith("openclaw-backup-") && f.endsWith(".tar.gz"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log("No backups found.");
    console.log(`Backup directory: ${backupDir}`);
    return;
  }

  console.log(`Backups in ${backupDir}:\n`);

  for (const file of files) {
    const fullPath = join(backupDir, file);
    const stat = statSync(fullPath);

    // Try to read manifest for level info
    let level = "?";
    try {
      const manifestJson = execSync(
        `tar -xzf "${fullPath}" -O ./manifest.json`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      );
      const manifest = JSON.parse(manifestJson);
      level = manifest.level || "?";
    } catch {
      // ignore
    }

    const date = stat.mtime.toISOString().replace("T", " ").slice(0, 19);
    console.log(
      `  ${file}  ${formatSize(stat.size).padStart(10)}  ${level.padEnd(10)}  ${date}`
    );
  }

  console.log(`\n${files.length} backup(s) total`);
}
