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

// Config level: core configuration files only
const CONFIG_PATHS = [
  "openclaw.json",
  "credentials",
  "cron",
  "devices",
  "identity",
];

// Agents config (under agents/*/agent/, not sessions)
function getAgentConfigPaths(openclawDir) {
  const agentsDir = join(openclawDir, "agents");
  if (!existsSync(agentsDir)) return [];
  const paths = [];
  for (const name of readdirSync(agentsDir)) {
    const agentDir = join(agentsDir, name, "agent");
    if (existsSync(agentDir) && statSync(agentDir).isDirectory()) {
      paths.push(join("agents", name, "agent"));
    }
  }
  return paths;
}

// Session paths (under agents/*/sessions/)
function getSessionPaths(openclawDir) {
  const agentsDir = join(openclawDir, "agents");
  if (!existsSync(agentsDir)) return [];
  const paths = [];
  for (const name of readdirSync(agentsDir)) {
    const sessDir = join(agentsDir, name, "sessions");
    if (existsSync(sessDir) && statSync(sessDir).isDirectory()) {
      paths.push(join("agents", name, "sessions"));
    }
  }
  return paths;
}

// Top-level dirs/files to always skip
const SKIP_TOPLEVEL = new Set([
  "browser",
  "media",
  "completions",
  "canvas",
  "subagents",
  "telegram",
  "update-check.json",
]);

export function getPathsForLevel(level, openclawDir) {
  const paths = [...CONFIG_PATHS, ...getAgentConfigPaths(openclawDir)];

  if (level === "full" || level === "sessions") {
    paths.push("workspace");
  }

  if (level === "sessions") {
    paths.push(...getSessionPaths(openclawDir));
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

// Get all files to backup for a given level
export function getFilesToBackup(level, openclawDir) {
  const paths = getPathsForLevel(level, openclawDir);
  const files = [];
  for (const p of paths) {
    files.push(...collectFiles(openclawDir, p));
  }
  return files;
}
