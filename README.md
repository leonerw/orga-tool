# 🗂️ Orga Tool

Ein persönliches Organisations-Tool mit modularer Architektur.  
Das Ziel ist, nach und nach verschiedene Funktionen zu integrieren — z. B. **To-Do-Liste**, **Kalender**, **Einkaufsliste**, **Notizen** und mehr.

Dieses Projekt ist als **Full-Stack-Monorepo** aufgebaut:

- **Backend:** Node.js + Express + MongoDB (REST-API)  
- **Frontend:** React (Vite + TypeScript)  
- **Ziel:** Erweiterbare, saubere Basis für spätere Features oder native Apps

---

## 🚀 Features

| Status ✅,🛠️,❌ | Feature | Beschreibung |
|:------:|----------|---------------|
| 🛠️ | **To-Do-Liste (CRUD)** | Aufgaben anlegen, bearbeiten, löschen, abhaken |
| 🛠️ | **User-Login & Registrierung (JWT)** | Benutzerverwaltung mit Tokens |
| ❌ | **Kalenderintegration** | Todo |
| ❌ | **Einkaufsliste** | Todo |
| ❌ | **Mobile App** | Todo |

---

## 🧱 Architektur
```
orga-tool/
├── backend/ # Express + MongoDB (API)
│ ├── src/
│ │ ├── models/
│ │ ├── controllers/
│ │ ├── routes/
│ │ └── main.js
│ ├── .env
│ └── package.json
│
├── frontend/ # React + TypeScript (Vite)
│ ├── src/
│ │ ├── components/
│ │ ├── services/
│ │ └── App.tsx
│ ├── vite.config.ts
│ └── package.json
│
├── .gitignore
├── package.json # Monorepo-Steuerung (Workspaces)
└── README.md
```
---


- **Monorepo** mit getrenntem Frontend & Backend  
- Beide Projekte können gemeinsam mit `npm run dev` gestartet werden

---

## 🧰 Tech Stack

| Bereich | Technologie |
|----------|-------------|
| **Frontend** | React (Vite + TypeScript), Axios, TailwindCSS |
| **Backend** | Node.js, Express, Mongoose, dotenv, CORS |
| **Datenbank** | MongoDB (lokal oder Atlas) |
| **Dev Tools** | Nodemon, concurrently |
| **Auth (geplant)** | JWT |
| **Deployment (später)** | Render / Railway / Vercel |

---

## ⚙️ Installation & Setup

### 1️⃣ Projekt klonen
```bash
git clone https://github.com/<dein-benutzername>/orga-tool.git
cd orga-tool
```

### 2️⃣ Abhängigkeiten installieren
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 3️⃣ .env-Dateien anlegen

backend/.env
```env
PORT=
MONGO_URI=
```


frontend/.env
```env
VITE_API_URL=
```

### 4️⃣ Entwicklung starten
```bash
npm run dev
```
