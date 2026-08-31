# Pushover Notification Service

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/lang-typescript-3178C6.svg)](https://www.typescriptlang.org/)

Kleiner **HTTP-Dienst** auf `node:http` (ohne Express): Benachrichtigungen per **REST** speichern, optional über die **Pushover-API** zustellen, Persistenz als **JSON** (Legacy-YAML wird beim ersten Lesen nach JSON migriert).

## Inhalt

- [Funktionen](#funktionen)
- [Konfiguration](#konfiguration)
- [Entwicklung & Build](#entwicklung--build)
- [Nutzung als Paket (Node.js)](#nutzung-als-paket-nodejs)
- [API](#api)
- [Tests mit cURL](#tests-mit-curl)
- [Pushover vom Code aus](#pushover-vom-code-aus)
- [Architektur](#architektur)
- [Docker](#docker)
- [Lizenz & Markenhinweis](#lizenz--markenhinweis)

## Funktionen

| Thema | Beschreibung |
| ----- | ------------ |
| Zustellung | Pushover (iOS / Android / Desktop), wenn `PUSHOVER_*` gesetzt ist |
| Speicher | JSON-Datei (`ASSETS_DIR`); alte YAML-Listen werden erkannt und nach JSON umgeschrieben |
| API | JSON REST, CORS, einfaches **Rate-Limit** (100 Anfragen / 15 min pro IP auf `/notifications` und `/health`) |
| Pushover-Client | `send` / `sendNotification` inkl. Multipart (z. B. Bilder) — über Code, nicht über den schlanken `POST /notifications`-Body |
| Sounds | Feste Namensliste für Anzeige; kein Live-Abruf von Pushover |
| Gesundheit | `GET /health` prüft Schreib-/Leserecht auf die Datendatei |

## Konfiguration

`.env.example` nach `.env` kopieren und anpassen:

```dotenv
PUSHOVER_USER_KEY=
PUSHOVER_API_TOKEN=
ASSETS_DIR=./assets/notifications.json
PORT=4015
```

- **`ASSETS_DIR`**: Pfad zur **Datei** (nicht nur ein Ordner), unter der die Benachrichtigungen als JSON liegen.
- **`PORT`**: HTTP-Port des Dienstes (im Docker-Compose-Beispiel oft `4015`).
- Ohne Pushover-Keys startet der Dienst trotzdem; Zustellung über Pushover ist dann deaktiviert (`isEnabled()` ist `false`).

Die `.env` wird beim Laden der Klasse `App` automatisch eingelesen (einfacher zeilenbasierter Parser, keine `dotenv`-Dependency).

## Entwicklung & Build

Im Verzeichnis `projects/pushover-notification`:

```bash
npm install
npm run dev          # tsx watch src/main.ts
npm run type-check
npm run build        # Ausgabe: dist/src/main.js
npm start            # node dist/src/main.js
```

## Nutzung als Paket (Node.js)

Es wird nur **`App`** exportiert. Die Klasse liest Konfiguration aus **`process.env`** (und optional `.env` vor dem ersten `new App()` durch den `static`-Block).

```typescript
import { App } from "@munirmardinli/pushover-notification";

const app = new App();
app.start();
```

`start()` bindet den HTTP-Server; der Konstruktor initialisiert Pushover, lädt/speichert die JSON-Datei und ist unabhängig vom Serverstart.

## API

| Methode | Pfad | Beschreibung |
| ------- | ---- | -------------- |
| `POST` | `/notifications` | Neue Benachrichtigung (`title`, `message`, `recipient` als JSON) |
| `GET` | `/notifications/:recipient` | Liste für einen Empfänger |
| `GET` | `/notifications/single/:id` | Ein Eintrag |
| `PATCH` | `/notifications/:id/read` | Als gelesen markieren |
| `DELETE` | `/notifications/:id` | Löschen |
| `GET` | `/health` | Speicherpfad lesbar/schreibbar? |

`OPTIONS` liefert CORS-Preflight.

## Tests mit cURL

```bash
export BASE_URL="http://localhost:4015"
```

**Hinweis:** Port an `PORT` in `.env` anpassen (z. B. lokal `4015`, im Beispiel oben `4015`).

Gesundheitscheck:

```bash
curl -sS "${BASE_URL}/health" | jq
```

Benachrichtigung anlegen:

```bash
curl -sS -X POST "${BASE_URL}/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Homelab Alert",
    "message": "Container restarted successfully",
    "recipient": "admin"
  }' | jq
```

Weitere Aufrufe (Empfänger, einzeln, gelesen, löschen) wie in der Tabelle oben — siehe frühere README-Beispiele mit `<NOTIFICATION_ID>`.

## Pushover vom Code aus

`App` stellt `sendNotification` und `send` bereit (multipart/für Bilder siehe `MessagePayload` in `src/main.ts` / `global.d.ts`).

```typescript
import { App } from "@munirmardinli/pushover-notification";

const app = new App();

const receipt = await app.sendNotification({
  message: "Database cluster failure!",
  title: "PRODUCTION ALERT",
  priority: 1,
  sound: "siren",
});
console.log("Receipt:", receipt);
```

## Architektur

Relevante Dateien (Projektwurzel dieses Pakets):

```text
.
├── src/
│   └── main.ts
├── global.d.ts
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

Nach `npm run build` entsteht zusätzlich **`dist/src/`** mit kompilierter `main.js`.

- **`src/main.ts`** — eine Klasse `App`: HTTP-Router, Rate-Limit, Pushover-Client, JSON-Persistenz (optional YAML-Legacy beim Einlesen).
- **`global.d.ts`** — gemeinsame Typen (z. B. `NotificationData`, `MessagePayload`).

Runtime-Dependencies: keine (nur Node.js). Build: `typescript`, `tsx`, `@types/node` als `devDependencies`.

## Docker

Compose-Referenz: [`.github/.compose/pushover.yml`](../../.github/.compose/pushover.yml). Das Image startet z. B. mit `node dist/src/main.js` (siehe `Dockerfile.Pushover`).

## Lizenz & Markenhinweis

**MIT License** © [Munir Mardinli](https://linktr.ee/munirmardinli)

**Pushover**® ist eine eingetragene Marke von Superblock, Inc. Dieses Projekt ist unabhängig und steht in keiner offiziellen Verbindung zu Pushover. Technisch korrekt z. B. „kompatibel mit der Pushover-API“. Offizielle Infos: [pushover.net](https://pushover.net).
