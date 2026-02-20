import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { platform } from "node:os";
import { getBackupDir } from "./paths.mjs";

const CLI_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "cli.mjs");
const IS_WINDOWS = platform() === "win32";

const FREQUENCY_LABELS = {
  hourly: "Every hour",
  daily: "Daily at 03:00",
  weekly: "Weekly (Sunday 03:00)",
};

function validateFrequency(frequency) {
  if (frequency && !FREQUENCY_LABELS[frequency]) {
    throw new Error(`Invalid frequency: ${frequency}. Use: ${Object.keys(FREQUENCY_LABELS).join(", ")}`);
  }
}

// ─── crontab (macOS / Linux) ───

const MARKER = "# openclaw-backup";

const CRON_EXPRESSIONS = {
  hourly: "0 * * * *",
  daily: "0 3 * * *",
  weekly: "0 3 * * 0",
};

function getCurrentCrontab() {
  try {
    return execSync("crontab -l 2>/dev/null", { encoding: "utf8" });
  } catch {
    return "";
  }
}

function findBackupLine(crontab) {
  const lines = crontab.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(MARKER) || lines[i].includes("openclaw-backup")) {
      if (lines[i].startsWith("#")) {
        return { markerIdx: i, jobIdx: i + 1, line: lines[i + 1] || "" };
      }
      return { markerIdx: -1, jobIdx: i, line: lines[i] };
    }
  }
  return null;
}

function detectFrequency(cronLine) {
  for (const [freq, expr] of Object.entries(CRON_EXPRESSIONS)) {
    if (cronLine.startsWith(expr)) return freq;
  }
  return "daily";
}

function getCronSchedule() {
  const crontab = getCurrentCrontab();
  const found = findBackupLine(crontab);

  if (!found || !found.line.trim()) {
    return { enabled: false, frequency: "daily", labels: FREQUENCY_LABELS };
  }

  return {
    enabled: true,
    frequency: detectFrequency(found.line),
    labels: FREQUENCY_LABELS,
  };
}

function setCronSchedule({ enabled, frequency }) {
  const crontab = getCurrentCrontab();
  const lines = crontab.split("\n");

  const filtered = lines.filter((line, i) => {
    if (line.includes(MARKER) || line.includes("openclaw-backup")) return false;
    if (i > 0 && lines[i - 1].includes(MARKER)) return false;
    return true;
  });

  while (filtered.length && filtered[filtered.length - 1].trim() === "") {
    filtered.pop();
  }

  if (enabled) {
    const freq = frequency || "daily";
    const expr = CRON_EXPRESSIONS[freq];
    const nodePath = process.execPath;
    const logFile = join(getBackupDir(), "cron.log");
    const job = `${expr} ${nodePath} ${CLI_PATH} create >> "${logFile}" 2>&1`;

    filtered.push("");
    filtered.push(MARKER);
    filtered.push(job);
  }

  const newCrontab = filtered.join("\n") + "\n";

  try {
    execSync("crontab -", { input: newCrontab, stdio: ["pipe", "pipe", "pipe"] });
  } catch (err) {
    throw new Error("Failed to update crontab: " + err.message);
  }

  return getCronSchedule();
}

// ─── Task Scheduler (Windows) ───

const TASK_NAME = "OpenClawBackup";

const SCHTASKS_SCHEDULES = {
  hourly: "/sc HOURLY /mo 1",
  daily: "/sc DAILY /st 03:00",
  weekly: "/sc WEEKLY /d SUN /st 03:00",
};

function getWindowsSchedule() {
  try {
    const output = execSync(
      `schtasks /query /tn "${TASK_NAME}" /fo CSV /nh 2>nul`,
      { encoding: "utf8" }
    );
    if (!output.trim()) {
      return { enabled: false, frequency: "daily", labels: FREQUENCY_LABELS };
    }

    // Detect frequency by querying verbose info
    let frequency = "daily";
    try {
      const detail = execSync(
        `schtasks /query /tn "${TASK_NAME}" /fo LIST /v 2>nul`,
        { encoding: "utf8" }
      );
      if (/HOURLY/i.test(detail)) frequency = "hourly";
      else if (/WEEKLY/i.test(detail)) frequency = "weekly";
    } catch {
      // ignore
    }

    return { enabled: true, frequency, labels: FREQUENCY_LABELS };
  } catch {
    return { enabled: false, frequency: "daily", labels: FREQUENCY_LABELS };
  }
}

function setWindowsSchedule({ enabled, frequency }) {
  // Remove existing task
  try {
    execSync(`schtasks /delete /tn "${TASK_NAME}" /f 2>nul`, {
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // Task may not exist
  }

  if (enabled) {
    const freq = frequency || "daily";
    const schedule = SCHTASKS_SCHEDULES[freq];
    const nodePath = process.execPath;
    const cmd = `"${nodePath}" "${CLI_PATH}" create`;

    try {
      execSync(
        `schtasks /create /tn "${TASK_NAME}" ${schedule} /tr "${cmd}" /f`,
        { stdio: ["pipe", "pipe", "pipe"] }
      );
    } catch (err) {
      throw new Error("Failed to create scheduled task: " + err.message);
    }
  }

  return getWindowsSchedule();
}

// ─── Public API ───

export function getSchedule() {
  return IS_WINDOWS ? getWindowsSchedule() : getCronSchedule();
}

export function setSchedule({ enabled, frequency }) {
  validateFrequency(frequency);
  return IS_WINDOWS
    ? setWindowsSchedule({ enabled, frequency })
    : setCronSchedule({ enabled, frequency });
}
