# Orga Tool

Ein persoenliches Organisations-Tool mit modularer Architektur.  
Das Ziel ist, nach und nach verschiedene Funktionen zu integrieren - z. B. **To-Do-Liste**, **Kalender**, **Einkaufsliste**, **Notizen** und mehr.

Dieses Projekt ist als **Full-Stack-Monorepo** aufgebaut:

- **Backend:** Node.js + Express + MongoDB (REST-API)  
- **Frontend:** React (Vite + TypeScript)  
- **Ziel:** Erweiterbare, saubere Basis fuer spaetere Features oder native Apps

---

## Features

| Status | Feature | Beschreibung |
|:------:|----------|---------------|
| In Arbeit | **To-Do-Liste (CRUD)** | Aufgaben anlegen, bearbeiten, loeschen, abhaken |
| In Arbeit | **User-Login & Registrierung (JWT)** | Benutzerverwaltung mit Tokens |
| Offen | **Kalenderintegration** | Todo |
| Offen | **Einkaufsliste** | Todo |
| Offen | **Mobile App** | Todo |

---

## Architektur

```text
orga-tool/
|-- backend/ # Express + MongoDB (API)
|   |-- src/
|   |   |-- models/
|   |   |-- controllers/
|   |   |-- routes/
|   |   `-- main.js
|   |-- .env
|   `-- package.json
|
|-- frontend/ # React + TypeScript (Vite)
|   |-- src/
|   |   |-- components/
|   |   |-- services/
|   |   `-- App.tsx
|   |-- vite.config.ts
|   `-- package.json
|
|-- .gitignore
|-- package.json # Monorepo-Steuerung (Workspaces)
`-- README.md
```

---

- **Monorepo** mit getrenntem Frontend & Backend  
- Beide Projekte koennen gemeinsam mit `npm run dev` gestartet werden

---

## Tech Stack

| Bereich | Technologie |
|----------|-------------|
| **Frontend** | React (Vite + TypeScript), Axios, TailwindCSS |
| **Backend** | Node.js, Express, Mongoose, dotenv, CORS |
| **Datenbank** | MongoDB (lokal oder Atlas) |
| **Dev Tools** | Nodemon, concurrently |
| **Auth (geplant)** | JWT |
| **Deployment (spaeter)** | Render / Railway / Vercel |

---

## Installation & Setup

### 1. Projekt klonen

```bash
git clone https://github.com/leonerw/orga-tool.git
cd orga-tool
```

### 2. Abhaengigkeiten installieren

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 3. .env-Dateien anlegen

backend/.env

```env
PORT=
MONGO_URI=
```

frontend/.env

```env
VITE_API_URL=
```

### 4. Entwicklung starten

```bash
npm run dev
```

### 5. Backend-Tests ausfuehren

```bash
npm test --prefix backend
```

### 6. Backend-Test-Coverage ausfuehren

```bash
npm run test:coverage --prefix backend
```
