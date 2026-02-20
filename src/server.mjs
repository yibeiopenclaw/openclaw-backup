import { createServer } from "node:http";
import { join } from "node:path";
import { unlinkSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { exec } from "node:child_process";
import { platform } from "node:os";
import { getBackupDir } from "./paths.mjs";
import { getBackupList } from "./list.mjs";
import { getBackupDetails } from "./inspect.mjs";
import { createBackup } from "./backup.mjs";
import { restoreBackup } from "./restore.mjs";
import { getHtml } from "./web.mjs";
import { getSchedule, setSchedule } from "./schedule.mjs";

function openBrowser(url) {
  const cmd = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open";
  exec(`${cmd} ${url}`);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function html(res, content) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(content);
}

export function startServer(port = 19886) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    try {
      // HTML page
      if (method === "GET" && path === "/") {
        return html(res, getHtml());
      }

      // List backups
      if (method === "GET" && path === "/api/backups") {
        return json(res, getBackupList());
      }

      // Inspect backup
      if (method === "GET" && path.startsWith("/api/backups/")) {
        const file = decodeURIComponent(path.slice("/api/backups/".length));
        const fullPath = join(getBackupDir(), file);
        const details = getBackupDetails(fullPath);
        return json(res, details);
      }

      // Create backup
      if (method === "POST" && path === "/api/backups") {
        const archivePath = createBackup();
        if (!archivePath) {
          return json(res, { error: "No files to backup" }, 400);
        }
        const file = archivePath.split("/").pop();
        return json(res, { file, path: archivePath });
      }

      // Restore backup
      if (method === "POST" && path === "/api/restore") {
        const body = await parseBody(req);
        if (!body.file) {
          return json(res, { error: "file is required" }, 400);
        }
        const fullPath = join(getBackupDir(), body.file);
        const result = await restoreBackup(fullPath, {
          dryRun: body.dryRun !== false,
          forceYes: true,
        });
        return json(res, result || { error: "Restore failed" });
      }

      // Import backup (file upload)
      if (method === "POST" && path === "/api/import") {
        const filename = decodeURIComponent(url.searchParams.get("filename") || "");
        if (!filename || !filename.endsWith(".tar.gz")) {
          return json(res, { error: "Invalid filename. Must be .tar.gz" }, 400);
        }
        const backupDir = getBackupDir();
        if (!existsSync(backupDir)) {
          mkdirSync(backupDir, { recursive: true });
        }
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const data = Buffer.concat(chunks);
        const destPath = join(backupDir, filename);
        writeFileSync(destPath, data);
        return json(res, { file: filename, size: data.length });
      }

      // Delete backup
      if (method === "POST" && path === "/api/delete") {
        const body = await parseBody(req);
        if (!body.file) {
          return json(res, { error: "file is required" }, 400);
        }
        const fullPath = join(getBackupDir(), body.file);
        unlinkSync(fullPath);
        return json(res, { deleted: body.file });
      }

      // Get schedule
      if (method === "GET" && path === "/api/schedule") {
        return json(res, getSchedule());
      }

      // Set schedule
      if (method === "POST" && path === "/api/schedule") {
        const body = await parseBody(req);
        const result = setSchedule({
          enabled: body.enabled,
          frequency: body.frequency,
        });
        return json(res, result);
      }

      // 404
      res.writeHead(404);
      res.end("Not Found");
    } catch (err) {
      json(res, { error: err.message }, 500);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://localhost:${port}`;
    console.log(`OpenClaw Backup web UI running at ${url}`);
    console.log("Press Ctrl+C to stop.");
    openBrowser(url);
  });

  return server;
}
