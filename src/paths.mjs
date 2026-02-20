import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";

export function getOpenclawDir() {
  const dir = process.env.OPENCLAW_STATE_DIR || join(homedir(), ".openclaw");
  if (!existsSync(dir)) {
    throw new Error(`OpenClaw directory not found: ${dir}`);
  }
  return resolve(dir);
}

export function getBackupDir() {
  return resolve(
    process.env.OPENCLAW_BACKUP_DIR || join(homedir(), ".openclaw-backups")
  );
}

const SKIP_NAMES = new Set([".DS_Store", ".git", "Thumbs.db"]);
const SKIP_PATTERNS = [/\.bak(\.\d+)?$/];

function shouldSkip(name) {
  if (SKIP_NAMES.has(name)) return true;
  return SKIP_PATTERNS.some((p) => p.test(name));
}

// Top-level dirs/files to always skip (cache/regenerable)
const SKIP_TOPLEVEL = new Set([
  "browser",
  "media",
  "completions",
  "canvas",
  "subagents",
  "telegram",
  "update-check.json",
]);

// Get all backup paths (everything except skipped dirs)
function getAllPaths(openclawDir) {
  const paths = [];
  for (const entry of readdirSync(openclawDir)) {
    if (shouldSkip(entry)) continue;
    if (SKIP_TOPLEVEL.has(entry)) continue;
    paths.push(entry);
  }
  return paths;
}

// Recursively collect all files under a path, applying skip rules
export function collectFiles(baseDir, relativePath) {
  const fullPath = join(baseDir, relativePath);
  if (!existsSync(fullPath)) return [];

  const stat = statSync(fullPath);
  if (stat.isFile()) {
    if (shouldSkip(relativePath.split("/").pop())) return [];
    return [{ relative: relativePath, size: stat.size }];
  }

  if (!stat.isDirectory()) return [];

  const files = [];
  for (const entry of readdirSync(fullPath)) {
    if (shouldSkip(entry)) continue;
    files.push(...collectFiles(baseDir, join(relativePath, entry)));
  }
  return files;
}

// Get all files to backup
export function getFilesToBackup(openclawDir) {
  const paths = getAllPaths(openclawDir);
  const files = [];
  for (const p of paths) {
    files.push(...collectFiles(openclawDir, p));
  }
  return files;
}
