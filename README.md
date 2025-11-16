# 🎮 Frisbee Quest 3D - MVP v0.2a - wie Fu

Ein 3D-Frisbee-Arena-Spiel inspiriert von **Boomerang Fu**, entwickelt mit React und Three.js!

## 🆕 Version 0.2a Features

- 🎮 **Xbox Controller Support** - Spiele mit Gamepad!
- 🏟️ **Arena mit Hindernissen** - Boomerang Fu Stil
- 📋 **Hauptmenü** - Start & Controls
- 💖 **Health System** - 3 Leben
- ⭐ **Score System** - Punkte sammeln
- 🎯 **Game States** - Menü, Spiel, Game Over
- 👾 **3 Gegner** - Besiege alle!

## 🎮 Steuerung

### Tastatur:
- **WASD** oder **Pfeiltasten**: Charakter bewegen
- **LEERTASTE**: Frisbee werfen
- **ENTER**: Spiel starten (im Menü)
- **C**: Controls anzeigen (im Menü)
- **R**: Neustart (bei Game Over)

### Xbox Controller:
- **Linker Stick**: Bewegen
- **A-Button**: Frisbee werfen

## 🚀 So startest du das Spiel auf deinem PC

### Schritt 1: Repository herunterladen

Öffne ein Terminal/CMD und führe aus:

```bash
git clone https://github.com/SomToyer/Version_1.git
cd Version_1
```

### Schritt 2: Node.js installieren (falls noch nicht vorhanden)

Du brauchst **Node.js** (Version 18 oder höher).

- Download: https://nodejs.org/
- Installiere die **LTS-Version** (empfohlen)

### Schritt 3: Abhängigkeiten installieren

Im Projektordner ausführen:

```bash
npm install
```

Das lädt alle benötigten Pakete herunter (React, Three.js, Vite, etc.).

### Schritt 4: Spiel starten

```bash
npm run dev
```

Danach öffne deinen Browser und gehe zu:

```
http://localhost:5173
```

**Das Spiel läuft jetzt! 🎉**

## 📦 Projekt bauen (optional)

Für eine produktionsreife Version:

```bash
npm run build
```

Die fertigen Dateien landen im `dist/` Ordner.

Um die Build-Version zu testen:

```bash
npm run preview
```

## 🛠️ Technologie-Stack

- **React 18** - UI Framework
- **Three.js** - 3D Grafik
- **Vite** - Build Tool & Dev Server
- **Tailwind CSS** - Styling

## 📝 Spielmechanik

1. **Startposition**: Links im grünen Eingangsraum
2. **Truhe**: In der Mitte - wirf die Frisbee darauf!
3. **Skill freischalten**: Nach dem Öffnen der Truhe wird die Frisbee rot
4. **Ziel**: Goldener Zylinder rechts - laufe hin um zu gewinnen!

## 🎨 Features

- ✅ 3D Grafik mit Three.js
- ✅ Frisbee-Wurf-Mechanik mit Rückkehr
- ✅ Kollisionserkennung
- ✅ Skill-System (Farbwechsel)
- ✅ Level-Progression

## 🐛 Probleme?

Falls das Spiel nicht startet:

1. Stelle sicher, dass Node.js installiert ist: `node --version`
2. Lösche `node_modules` und führe `npm install` erneut aus
3. Prüfe ob Port 5173 frei ist

## 📄 Lizenz

Dieses Projekt ist ein MVP (Minimum Viable Product) und dient zu Demonstrationszwecken.

---

**Viel Spaß beim Spielen! 🎮✨**
