import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { getBackupDir } from "./paths.mjs";
import { formatSize } from "./manifest.mjs";

function parseDateFromFilename(filename) {
  // openclaw-backup-20260220T062036.tar.gz → 2026-02-20T06:20:36
  const m = filename.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  }
  // fallback: older format like openclaw-backup-2026-02-20T0237.tar.gz
  const m2 = filename.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})/);
  if (m2) {
    return `${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:00`;
  }
  return null;
}

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
      date: parseDateFromFilename(file) || stat.mtime.toISOString(),
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
