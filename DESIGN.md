# OpenClaw Backup/Restore - 备份恢复模块

## 项目目标

为 OpenClaw 提供独立的备份恢复工具，保护配置、会话、工作区等核心数据，支持一键备份、恢复和定时自动备份。

---

## 数据分类

| 目录/文件 | 内容 | 备份级别 | 典型大小 |
|-----------|------|---------|---------|
| `openclaw.json` | 核心配置（模型、channel、gateway 等） | config | ~5KB |
| `agents/*/agent/` | 模型配置、OAuth token、auth profiles | config | ~5KB |
| `credentials/` | Telegram 配对、允许列表 | config | <1KB |
| `cron/` | 定时任务配置 | config | ~16KB |
| `devices/` | 设备配对信息 | config | ~8KB |
| `identity/` | 身份标识 | config | ~8KB |
| `workspace/` (不含 .git) | Agent 人格、记忆、skills、工作文件 | full | ~1MB |
| `agents/*/sessions/` | 会话历史 | sessions | ~15MB |
| `browser/` | 浏览器数据 | 跳过 | ~60MB |
| `media/` | 媒体缓存 | 跳过 | ~9MB |
| `completions/` | zsh 补全脚本（可重新生成） | 跳过 | ~416KB |

### 备份级别

- **config** — 最小备份，只含配置文件，几十 KB，秒级完成
- **full** — 配置 + workspace，约 1MB
- **sessions** — 配置 + workspace + 会话历史，约 15MB+

---

## CLI 设计

```bash
# 安装
npm install -g openclaw-backup

# 创建备份
openclaw-backup create                    # 默认 full 级别
openclaw-backup create --config-only      # 只备份配置
openclaw-backup create --include-sessions # 含会话历史
openclaw-backup create -o ~/backups/      # 指定输出目录

# 查看备份内容
openclaw-backup inspect <backup-file>

# 恢复
openclaw-backup restore <backup-file>
openclaw-backup restore <backup-file> --dry-run    # 预览恢复内容，不实际写入
openclaw-backup restore <backup-file> --config-only # 只恢复配置

# 定时自动备份
openclaw-backup schedule --interval daily --keep 7
openclaw-backup schedule --off

# 查看备份历史
openclaw-backup list
```

---

## 备份文件格式

```
openclaw-backup-2026-02-20T120000.tar.gz
├── manifest.json          # 备份清单
├── config/
│   ├── openclaw.json
│   ├── agents/main/agent/models.json
│   ├── agents/main/agent/auth-profiles.json
│   ├── credentials/
│   ├── cron/
│   ├── devices/
│   └── identity/
├── workspace/             # full 级别包含
│   ├── AGENTS.md
│   ├── SOUL.md
│   ├── skills/
│   ├── memory/
│   └── ...
└── sessions/              # sessions 级别包含
    └── agents/main/sessions/*.jsonl
```

### manifest.json

```json
{
  "version": "1.0.0",
  "createdAt": "2026-02-20T12:00:00.000Z",
  "openclawVersion": "2026.2.12",
  "level": "full",
  "platform": "darwin",
  "hostname": "Yibeis-Mac-mini",
  "files": 42,
  "size": 1048576,
  "checksum": "sha256:abc123...",
  "encrypted": false,
  "contents": {
    "config": true,
    "workspace": true,
    "sessions": false
  }
}
```

---

## 安全考虑

### 敏感数据

备份文件中包含敏感信息：
- API keys（NVIDIA、Tavily 等）
- Bot tokens（Telegram）
- OAuth tokens（Qwen、OpenAI Codex）
- Gateway auth token

### 加密策略

```bash
# 默认：创建备份时提示是否加密
openclaw-backup create
# → 备份包含敏感数据，是否加密？(Y/n)

# 强制加密
openclaw-backup create --encrypt

# 指定密码（非交互式）
openclaw-backup create --encrypt --password "xxx"

# 恢复加密备份
openclaw-backup restore backup.tar.gz.enc
# → 请输入密码:
```

加密方式：AES-256-GCM，密钥由用户密码通过 PBKDF2 派生。

---

## 恢复流程

```
openclaw-backup restore <file>
       ↓
  解压 + 校验 checksum
       ↓
  读取 manifest.json，检查版本兼容性
       ↓
  显示恢复预览（将覆盖哪些文件）
       ↓
  用户确认
       ↓
  自动备份当前配置（防止误操作）
       ↓
  写入文件
       ↓
  运行 openclaw doctor 验证
       ↓
  提示用户 openclaw gateway restart
```

---

## 定时自动备份

通过 launchd (macOS) / systemd timer (Linux) 实现：

```bash
openclaw-backup schedule --interval daily --keep 7
```

- 每天自动创建一份 full 级别备份
- 保留最近 7 份，自动清理旧备份
- 备份存放在 `~/.openclaw-backups/`
- 失败时写入日志，不影响 openclaw 运行

---

## 目录结构

```
openclaw-backup/
├── package.json
├── bin/
│   └── cli.mjs              # CLI 入口
├── src/
│   ├── backup.mjs            # 备份逻辑（扫描 + 打包）
│   ├── restore.mjs           # 恢复逻辑（解压 + 验证 + 写入）
│   ├── manifest.mjs          # 备份清单生成和读取
│   ├── encrypt.mjs           # AES-256-GCM 加密/解密
│   ├── schedule.mjs          # 定时任务注册 (launchd/systemd)
│   ├── inspect.mjs           # 查看备份内容
│   └── paths.mjs             # openclaw 路径检测
└── README.md
```

---

## 实现步骤

### Phase 1：核心备份恢复（MVP）
1. 实现路径检测（自动找到 ~/.openclaw）
2. 实现 `create` 命令（config-only + full 两级）
3. 实现 manifest 生成和校验
4. 实现 `inspect` 命令
5. 实现 `restore` 命令（含预览和确认）
6. 实现 `list` 命令

### Phase 2：安全和完善
7. 添加加密功能
8. 恢复前自动备份当前状态
9. 版本兼容性检查
10. 添加 `--include-sessions` 支持

### Phase 3：自动化
11. 实现 `schedule` 命令（launchd/systemd）
12. 自动清理旧备份
13. npm 发布
