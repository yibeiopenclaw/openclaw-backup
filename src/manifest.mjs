import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hostname, platform } from "node:os";
import { execSync } from "node:child_process";

const MANIFEST_VERSION = "1.0.0";

function getOpenclawVersion() {
  try {
    const out = execSync("openclaw --version", { encoding: "utf8" }).trim();
    return out.replace(/^.*?(\d{4}\.\d+\.\d+).*$/, "$1");
  } catch {
    return "unknown";
  }
}

export function computeContentHash(files, baseDir) {
  const hash = createHash("sha256");
  for (const f of files.slice().sort((a, b) => a.relative.localeCompare(b.relative))) {
    hash.update(f.relative);
    hash.update(readFileSync(join(baseDir, f.relative)));
  }
  return hash.digest("hex");
}

export function createManifest(files, archivePath, contentHash) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  let checksum = null;
  if (archivePath) {
    const hash = createHash("sha256");
    hash.update(readFileSync(archivePath));
    checksum = "sha256:" + hash.digest("hex");
  }

  return {
    version: MANIFEST_VERSION,
    createdAt: new Date().toISOString(),
    openclawVersion: getOpenclawVersion(),
    platform: platform(),
    hostname: hostname(),
    files: files.length,
    totalSize,
    checksum,
    contentHash: contentHash || null,
  };
}

export function validateManifest(manifest) {
  if (!manifest || !manifest.version) {
    throw new Error("Invalid manifest: missing version");
  }
  if (!manifest.createdAt) {
    throw new Error("Invalid manifest: missing createdAt");
  }
  return true;
}

export function formatManifest(manifest) {
  const lines = [
    `Created:   ${manifest.createdAt}`,
    `OpenClaw:  ${manifest.openclawVersion}`,
    `Platform:  ${manifest.platform} (${manifest.hostname})`,
    `Files:     ${manifest.files}`,
    `Size:      ${formatSize(manifest.totalSize)}`,
  ];
  if (manifest.checksum) {
    lines.push(`Checksum:  ${manifest.checksum.slice(0, 20)}...`);
  }
  return lines.join("\n");
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
