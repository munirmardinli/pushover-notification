# 🔔 Notification Service API

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.0.1-green.svg)](CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/lang-typescript-3178C6.svg)](https://www.typescriptlang.org/)
[![Docs](https://img.shields.io/badge/docs-typedoc-blueviolet.svg)](https://munirmardinli.github.io/pushover-notification//)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-UI%20Image-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/mardinlimunir/pushover-notification)

Enterprise-grade notification management system with Pushover integration, persistent YAML storage, and REST API for cross-platform alerts.

## ✨ Features

| Feature | Description |
|---------|-------------|
| **📱 Multi-channel Delivery** | Send to iOS, Android & desktop via Pushover API |
| **💾 Persistent Storage** | YAML-backed notification history with read/unread status |
| **🔌 RESTful API** | Fully documented JSON API with Swagger support |
| **⚠️ Priority System** | Emergency (-2) to High (+2) priority levels |
| **🔊 Sound Library** | 20+ built-in sounds with automatic updates |
| **📎 File Attachments** | Send images and documents with notifications |
| **🩺 Health Monitoring** | Built-in system diagnostics endpoint |

## 🚀 Installation

```bash
# Clone and setup
git clone https://github.com/munirmardinli/pushover-notification.git
cd pushover-notification
npm install
```

## ⚙️ Configuration

Edit '.env' file:

```dotenv
# Server Configuration
PORT=9095

# Pushover Integration
PUSHOVER_USER_KEY=your_user_key
PUSHOVER_API_TOKEN=your_api_token

# Storage Settings
DATA_FILE=notifications.yaml
```

## 📡 API Reference

| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| POST   | `/notifications`            | Create new notification |
| GET    | `/notifications/:recipient` | Get all notifications   |
| GET    | `/notifications/single/:id` | Get single notification |
| PATCH  | `/notifications/:id/read`   | Mark as read            |
| DELETE | `/notifications/:id`        | Delete notification     |
| GET    | `/health`                   | System status           |

## 🔌 Pushover Integration Example

```ts
// Initialize service
const pushover = new PushoverService({
  userKey: process.env.PUSHOVER_USER_KEY,
  apiToken: process.env.PUSHOVER_API_TOKEN,
});

// Critical alert example
try {
  const receipt = await pushover.sendNotification({
    message: "Database cluster failure!",
    title: "🚨 PRODUCTION ALERT",
    priority: 2, // High priority
    sound: "siren",
    url: "https://status.example.com",
  });
  console.log(`Notification sent with receipt: ${receipt}`);
} catch (error) {
  console.error("Failed to send notification:", error);
}
```

## 🏗 System Architecture

```text
src/
├── services/            # Service layer
│   ├── pushover.service.ts  # High-level API wrapper
│   └── pushover.ts      # Low-level HTTP client
├── types/               # Type definitions
│   └── globals.d.ts     # Shared interfaces
├── index.ts             # Express application
└── assets/              # Persistent storage
    └── notifications.yaml  # YAML data store
```

## 🛠 Development

```bash
# Run in development mode
npm run dev

# Build production version
npm run build
```

## 📄 License

**MIT License** © [Munir Mardinli](https://linktr.ee/munirmardinli)

<details>
<summary>Full License Text</summary>

```text
MIT License

Copyright (c) 2025 Munir Mardinli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
</details>

## ℹ️ Trademark Notice

[![OSI Approved](https://img.shields.io/badge/OSI-Approved-blue.svg)](https://opensource.org/licenses/MIT)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Trademark Disclaimer:**
ℹ️ **Pushover**® is a registered trademark of Superblock, Inc.
⚠️ This project is an **independent, third-party** implementation:
- Not affiliated with Superblock, Inc.
- Not officially endorsed by Pushover
- Not an official Pushover product

**Proper Usage Guidelines:**
- ✅ May refer to "Pushover API" for technical accuracy
- ✅ May state "compatible with Pushover"
- ❌ Cannot use Pushover logos or branding
- ❌ Cannot imply official partnership

*For official Pushover services, visit: [pushover.net](https://pushover.net)*
