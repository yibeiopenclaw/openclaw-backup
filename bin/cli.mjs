#!/usr/bin/env node

import { parseArgs } from "node:util";

const HELP = `
openclaw-backup - Backup and restore tool for OpenClaw

Usage:
  openclaw-backup create [options]     Create a backup
  openclaw-backup inspect <file>       Show backup contents
  openclaw-backup restore <file>       Restore from backup
  openclaw-backup list                 List existing backups
  openclaw-backup help                 Show this help

Create options:
  --config-only        Only backup configuration files
  --include-sessions   Include conversation history
  -o, --output <dir>   Output directory (default: ~/.openclaw-backups/)

Restore options:
  --dry-run            Preview restore without writing files
  --config-only        Only restore configuration files
`;

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "help" || command === "--help" || command === "-h") {
  console.log(HELP.trim());
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { join, dirname } = await import("node:path");
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

try {
  if (command === "create") {
    const { values } = parseArgs({
      args: args.slice(1),
      options: {
        "config-only": { type: "boolean", default: false },
        "include-sessions": { type: "boolean", default: false },
        output: { type: "string", short: "o" },
      },
      strict: false,
    });

    const { createBackup } = await import("../src/backup.mjs");
    createBackup({
      configOnly: values["config-only"],
      includeSessions: values["include-sessions"],
      output: values.output || undefined,
    });
  } else if (command === "inspect") {
    const file = args[1];
    if (!file) {
      console.error("Usage: openclaw-backup inspect <file>");
      process.exit(1);
    }
    const { inspectBackup } = await import("../src/inspect.mjs");
    inspectBackup(file);
  } else if (command === "restore") {
    const file = args[1];
    if (!file) {
      console.error("Usage: openclaw-backup restore <file>");
      process.exit(1);
    }
    const { values } = parseArgs({
      args: args.slice(2),
      options: {
        "dry-run": { type: "boolean", default: false },
        "config-only": { type: "boolean", default: false },
      },
      strict: false,
    });

    const { restoreBackup } = await import("../src/restore.mjs");
    await restoreBackup(file, {
      dryRun: values["dry-run"],
      configOnly: values["config-only"],
    });
  } else if (command === "list") {
    const { listBackups } = await import("../src/list.mjs");
    listBackups();
  } else {
    console.error(`Unknown command: ${command}`);
    console.log(HELP.trim());
    process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
