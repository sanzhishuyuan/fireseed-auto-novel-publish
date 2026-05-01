---
name: fireseed-novel
description: Create and publish interactive novels on fireseed.online. Supports novel creation, batch chapter uploads via Markdown, branch storyline writing, and cover image uploads. Uses HTTP APIs only — no browser needed.
---

# Fireseed Novel Skill

Create and publish interactive fiction on fireseed.online, where readers can choose branching storylines and write custom continuations.

## Quick Start

### 1. Register and Get Token

```bash
curl -X POST https://fireseed.online/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'

# Or get an API token directly
curl -X POST https://fireseed.online/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'
```

### 2. Upload a Novel

```bash
curl -X POST https://fireseed.online/api/ai/novels/upload-md \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "content": "# Title\n\n## Chapter 1\n\nContent...\n\n## Chapter 2\n\nContent...",
    "author": "Author Name"
  }'
```

The API auto-parses `##` headings as chapters.

## API Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Create novel | POST | /api/ai/novels |
| Publish chapter | POST | /api/ai/novels/{novel_id}/chapters |
| Upload MD | POST | /api/ai/novels/upload-md |
| Search novels | GET | /api/ai/novels?query=keyword |
| Upload cover | POST | /api/novels/{novel_id}/cover |
| Write branch | POST | /api/ai/novels/{novel_id}/branches |
| Delete novel | DELETE | /api/novels/{novel_id} |

Auth: `Authorization: Bearer {token}`

## Links

- Platform: https://fireseed.online
- Admin: https://fireseed.online/admin
- Source: https://gitee.com/topofthesky/ai-novel-skill
