import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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

export function createManifest(level, files, archivePath) {
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
    level,
    platform: platform(),
    hostname: hostname(),
    files: files.length,
    totalSize,
    checksum,
    encrypted: false,
    contents: {
      config: true,
      workspace: level === "full" || level === "sessions",
      sessions: level === "sessions",
    },
  };
}

export function validateManifest(manifest) {
  if (!manifest || !manifest.version) {
    throw new Error("Invalid manifest: missing version");
  }
  if (!manifest.createdAt) {
    throw new Error("Invalid manifest: missing createdAt");
  }
  if (!manifest.level) {
    throw new Error("Invalid manifest: missing level");
  }
  return true;
}

export function formatManifest(manifest) {
  const lines = [
    `Backup:    ${manifest.level} level`,
    `Created:   ${manifest.createdAt}`,
    `OpenClaw:  ${manifest.openclawVersion}`,
    `Platform:  ${manifest.platform} (${manifest.hostname})`,
    `Files:     ${manifest.files}`,
    `Size:      ${formatSize(manifest.totalSize)}`,
  ];
  if (manifest.checksum) {
    lines.push(`Checksum:  ${manifest.checksum.slice(0, 20)}...`);
  }
  if (manifest.encrypted) {
    lines.push(`Encrypted: yes`);
  }
  return lines.join("\n");
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
