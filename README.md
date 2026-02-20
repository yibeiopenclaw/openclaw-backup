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
# Create a full backup
openclaw-backup create

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

# Full restore
openclaw-backup restore <backup-file>
```

After restoring, run `openclaw gateway restart` to apply changes.

### Web dashboard

```bash
openclaw-backup web
```

Opens a local web UI at **http://localhost:19886** where you can:

- View all backups with size and date
- Create backups
- Inspect backup contents
- Restore with dry-run preview

Custom port:

```bash
openclaw-backup web --port 8080
```

## What gets backed up

Everything in `~/.openclaw/` except cache/regenerable data:

- `openclaw.json` — core configuration
- `agents/` — model config, OAuth tokens, conversation history
- `credentials/` — channel pairing and allowlists
- `cron/` — scheduled tasks
- `devices/` — paired devices
- `identity/` — device identity
- `workspace/` — agent prompts, memory, skills, work files

**Skipped:** `browser/`, `media/`, `completions/`, `canvas/`, `subagents/`, `telegram/` (cache/regenerable data)

## Backups location

Default: `~/.openclaw-backups/`

Override with `OPENCLAW_BACKUP_DIR` environment variable or `-o` flag.

## Requirements

- Node.js >= 18
- OpenClaw CLI installed

## License

MIT
