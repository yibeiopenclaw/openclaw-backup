import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { getOpenclawDir, getBackupDir, getFilesToBackup } from "./paths.mjs";
import { createManifest, formatManifest, formatSize } from "./manifest.mjs";

export function createBackup(options = {}) {
  const level = options.configOnly
    ? "config"
    : options.includeSessions
      ? "sessions"
      : "full";

  const openclawDir = getOpenclawDir();
  const backupDir = options.output || getBackupDir();

  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Scanning ${openclawDir} (level: ${level})...`);
  const files = getFilesToBackup(level, openclawDir);

  if (files.length === 0) {
    console.log("No files to backup.");
    return null;
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`Found ${files.length} files (${formatSize(totalSize)})`);

  // Create temp dir for staging
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "T")
    .slice(0, 15);
  const archiveName = `openclaw-backup-${timestamp}.tar.gz`;
  const archivePath = join(backupDir, archiveName);

  // Write manifest to a temp location inside openclaw dir won't work,
  // so we stage files in a temp dir
  const tmpDir = join(backupDir, `.tmp-${timestamp}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    // Copy files to staging dir preserving structure
    for (const f of files) {
      const src = join(openclawDir, f.relative);
      const dst = join(tmpDir, "data", f.relative);
      mkdirSync(dirname(dst), { recursive: true });
      writeFileSync(dst, readFileSync(src));
    }

    // Generate manifest (without checksum first)
    const manifest = createManifest(level, files, null);
    writeFileSync(
      join(tmpDir, "data", "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );

    // Create tar.gz using system tar
    execSync(
      `tar -czf "${archivePath}" -C "${join(tmpDir, "data")}" .`,
      { stdio: "pipe" }
    );

    // Update manifest with checksum
    const finalManifest = createManifest(level, files, archivePath);
    // Rewrite manifest into archive is complex, store it alongside
    writeFileSync(
      join(tmpDir, "data", "manifest.json"),
      JSON.stringify(finalManifest, null, 2)
    );
    // Recreate archive with updated manifest
    execSync(
      `tar -czf "${archivePath}" -C "${join(tmpDir, "data")}" .`,
      { stdio: "pipe" }
    );

    console.log(`\nBackup created: ${archivePath}`);
    console.log("");
    console.log(formatManifest(finalManifest));

    return archivePath;
  } finally {
    // Cleanup staging dir
    execSync(`rm -rf "${tmpDir}"`, { stdio: "pipe" });
  }
}
