import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { getBackupDir } from "./paths.mjs";
import { formatSize } from "./manifest.mjs";

export function getBackupList() {
  const backupDir = getBackupDir();

  if (!existsSync(backupDir)) return [];

  const files = readdirSync(backupDir)
    .filter((f) => f.startsWith("openclaw-backup-") && f.endsWith(".tar.gz"))
    .sort()
    .reverse();

  return files.map((file) => {
    const fullPath = join(backupDir, file);
    const stat = statSync(fullPath);

    let manifest = null;
    try {
      const manifestJson = execSync(
        `tar -xzf "${fullPath}" -O ./manifest.json`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      );
      manifest = JSON.parse(manifestJson);
    } catch {
      // ignore
    }

    return {
      file,
      path: fullPath,
      size: stat.size,
      sizeFormatted: formatSize(stat.size),
      date: stat.mtime.toISOString(),
      manifest,
    };
  });
}

export function listBackups() {
  const backupDir = getBackupDir();
  const backups = getBackupList();

  if (backups.length === 0) {
    console.log("No backups found.");
    console.log(`Backup directory: ${backupDir}`);
    return;
  }

  console.log(`Backups in ${backupDir}:\n`);

  for (const b of backups) {
    const date = b.date.replace("T", " ").slice(0, 19);
    console.log(
      `  ${b.file}  ${b.sizeFormatted.padStart(10)}  ${date}`
    );
  }

  console.log(`\n${backups.length} backup(s) total`);
}
