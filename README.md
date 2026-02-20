# openclaw-backup

Backup and restore tool for [OpenClaw](https://openclaw.ai). Zero external dependencies.

## Install

```bash
npm install -g openclaw-backup
```

Or run directly from the project:

```bash
node bin/cli.mjs <command>
```

## Usage

### Create a backup

```bash
# Full backup (config + workspace)
openclaw-backup create

# Config only (~20KB, instant)
openclaw-backup create --config-only

# Full + conversation history
openclaw-backup create --include-sessions

# Custom output directory
openclaw-backup create -o ~/my-backups/
```

### List backups

```bash
openclaw-backup list
```

### Inspect a backup

```bash
openclaw-backup inspect ~/.openclaw-backups/openclaw-backup-20260220T023740.tar.gz
```

### Restore from backup

```bash
# Preview what will be restored (no files changed)
openclaw-backup restore <backup-file> --dry-run

# Restore config only
openclaw-backup restore <backup-file> --config-only

# Full restore
openclaw-backup restore <backup-file>
```

After restoring, run `openclaw gateway restart` to apply changes.

### Web dashboard

```bash
openclaw-backup web
```

Opens a local web UI at **http://localhost:19886** where you can:

- View all backups with level, size, and date
- Create backups (config / full / sessions)
- Inspect backup contents
- Restore with dry-run preview

Custom port:

```bash
openclaw-backup web --port 8080
```

## Backup levels

| Level | Contents | Typical size |
|-------|----------|-------------|
| `config` | openclaw.json, model config, credentials, cron, devices, identity | ~20 KB |
| `full` | Config + workspace (agent personality, memory, skills) | ~1 MB |
| `sessions` | Full + conversation history | ~15 MB+ |

## What gets backed up

- `openclaw.json` — core configuration
- `agents/*/agent/` — model config, OAuth tokens
- `credentials/` — channel pairing and allowlists
- `cron/` — scheduled tasks
- `devices/` — paired devices
- `identity/` — device identity
- `workspace/` — agent prompts, memory, skills, work files (full/sessions)
- `agents/*/sessions/` — conversation history (sessions only)

**Skipped:** `browser/`, `media/`, `completions/` (cache/regenerable data)

## Backups location

Default: `~/.openclaw-backups/`

Override with `OPENCLAW_BACKUP_DIR` environment variable or `-o` flag.

## Requirements

- Node.js >= 18
- OpenClaw CLI installed

## License

MIT
