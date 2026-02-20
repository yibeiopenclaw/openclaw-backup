import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { getOpenclawDir } from "./paths.mjs";
import { validateManifest, formatManifest } from "./manifest.mjs";

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function listFilesRecursive(dir, prefix = "") {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      results.push(...listFilesRecursive(full, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

export async function restoreBackup(archivePath, options = {}) {
  if (!existsSync(archivePath)) {
    throw new Error(`File not found: ${archivePath}`);
  }

  const openclawDir = getOpenclawDir();

  // Extract to temp dir
  const tmpDir = join(dirname(archivePath), `.tmp-restore-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { stdio: "pipe" });

    // Read and validate manifest
    const manifestPath = join(tmpDir, "manifest.json");
    if (!existsSync(manifestPath)) {
      throw new Error("Backup archive does not contain manifest.json");
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    validateManifest(manifest);

    console.log("Backup info:");
    console.log(formatManifest(manifest));
    console.log("");

    // Get file list (exclude manifest.json)
    const files = listFilesRecursive(tmpDir).filter(
      (f) => f !== "manifest.json"
    );

    if (options.configOnly) {
      // Filter to config-level files only
      const configPrefixes = [
        "openclaw.json",
        "credentials/",
        "cron/",
        "devices/",
        "identity/",
        "agents/",
      ];
      const filtered = files.filter((f) =>
        configPrefixes.some(
          (p) => f === p || f.startsWith(p)
        ) && !f.includes("/sessions/")
      );
      files.length = 0;
      files.push(...filtered);
    }

    console.log(`Will restore ${files.length} files to ${openclawDir}:\n`);
    for (const f of files.slice(0, 20)) {
      console.log(`  ${f}`);
    }
    if (files.length > 20) {
      console.log(`  ... and ${files.length - 20} more`);
    }
    console.log("");

    if (options.dryRun) {
      console.log("(dry run - no files were modified)");
      return { manifest, files, dryRun: true };
    }

    if (!options.forceYes) {
      const answer = await ask("Proceed with restore? (y/N) ");
      if (answer.toLowerCase() !== "y") {
        console.log("Restore cancelled.");
        return { manifest, files, cancelled: true };
      }
    }

    // Copy files to openclaw dir
    let restored = 0;
    for (const f of files) {
      const src = join(tmpDir, f);
      const dst = join(openclawDir, f);
      mkdirSync(dirname(dst), { recursive: true });
      writeFileSync(dst, readFileSync(src));
      restored++;
    }

    console.log(`\nRestored ${restored} files to ${openclawDir}`);
    console.log("\nRun 'openclaw gateway restart' to apply changes.");
    return { manifest, files, restored };
  } finally {
    execSync(`rm -rf "${tmpDir}"`, { stdio: "pipe" });
  }
}
