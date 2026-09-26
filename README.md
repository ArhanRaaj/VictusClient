# VictusClient ⚡
> **Next-Level, Production-Quality Minecraft Launcher & Client**

VictusClient is a modern, high-performance desktop Minecraft launcher designed from the ground up to deliver a clean, customizable gaming experience inspired by modern desktop clients.

---

## 🌟 Key Features

### 🎨 Visual & UI Design
- **Dark-First Modern Interface:** Crafted with deep charcoal surfaces, glowing neon accents, and subtle gradient backdrops.
- **Glassmorphism Engine (Optional):**
  - Instant **ON / OFF** toggle.
  - Granular sliders for **Background Blur (0–32px)**, **Card Transparency**, **Border Opacity**, and **Accent Glow Intensity**.
  - Flawless opaque mode when disabled without altering layout.
- **Theme Customizer & Presets:**
  - Presets: *Victus Purple*, *Midnight Blue*, *Crimson*, *Emerald*, *Cyan*, *Sunset*, and *Monochrome*.
  - Full RGB color picker for primary, secondary, background, and surface tones.
- **Custom Frameless Title Bar:** Drag-enabled custom header with signature window buttons (Neutral/Gray Minimize, Accent Maximize, Rose Close).
- **Signature Purple Navigation:** Sleek vertical pill sidebar matching the visual reference with expanded & collapsed tooltips.
- **Command Palette (`Ctrl + K`):** Global quick-search for instances, mods, settings, accounts, and navigation.

### 🎮 Genuine Minecraft Launch Pipeline
VictusClient features an actual, non-simulated Minecraft launch architecture:
1. **Dynamic Version Resolution:** Direct integration with Mojang's official `version_manifest_v2.json`.
2. **Multi-Loader Support:**
   - **Vanilla**
   - **Fabric** (dynamic metadata via Fabric Meta API)
   - **NeoForge**
   - **Forge**
   - **Quilt** (dynamic metadata via Quilt Meta API)
3. **Automated Dependency & Asset Downloader:**
   - Evaluates OS & architecture rules for Windows, Linux, and macOS.
   - Downloads official client jars, libraries, and asset indexes.
   - Extracts native `.dll` binaries directly into instance `natives/`.
4. **Intelligent JVM Constructor:**
   - Auto-allocates memory limits (`-Xms`, `-Xmx`).
   - Sets natives paths (`-Djava.library.path`), launcher branding, and platform classpaths.
   - Spawns Java process with real-time stdout/stderr capture and exit code detection.
5. **Real-Time Minecraft Console:**
   - Colored log levels (`[INFO]`, `[WARN]`, `[ERROR]`, `[LAUNCHER]`).
   - Search filtering, auto-scroll toggle, log export, and interactive command terminal (`/help`, `/gc`, `/clear`, `/launch`).

### 📦 Unified Content Manager (Modrinth v2 API)
- **Browse & Search:** Mods, Shaders, Resource Packs, Modpacks, and Datapacks.
- **Compatibility Verification:** Matches Minecraft version and mod loader automatically.
- **1-Click Installation:** Downloads directly into the instance's isolated `mods/`, `shaderpacks/`, or `resourcepacks/` directories.
- **Local Mod Management:** Enable/disable mods (`.disabled` toggle) and delete with one click.
- **Multi-Select Installation:** Install batches of mods simultaneously.

### 👤 Accounts & Wardrobe
- **Microsoft OAuth:** Secure Device Code flow for official Mojang / Microsoft authentication.
- **Offline / Dev Accounts:** Instant creation with custom UUIDs for local testing.
- **3D Live Player Model:** Interactive character model running on `skinview3d` with idle & walking animations, manual drag-to-rotate, and zoom.
- **Skin Wardrobe:** Curated skin library + PNG drag-and-drop file uploader (Classic 4px & Slim 3px models).

---

## 🏗️ Project Architecture

```
VICTUSCLIENT/
├── electron/
│   ├── main.ts                     # Electron main process, frameless window, IPC handlers
│   ├── preload.ts                  # Secure context bridge exposing electronAPI to renderer
│   └── core/
│       ├── MinecraftLauncher.ts    # Complete Minecraft download, native extraction & launch engine
│       ├── InstanceManager.ts      # Directory isolation & instance CRUD
│       ├── VersionManager.ts       # Mojang manifest v2, Fabric, Quilt, and Forge meta
│       ├── ModrinthManager.ts      # Modrinth v2 API client & file installer
│       ├── JavaManager.ts          # Local Java detector and runtime manager
│       └── ConfigManager.ts        # Persistent JSON storage in AppData
├── src/
│   ├── components/
│   │   ├── layout/                 # TitleBar, Sidebar, SplashScreen, CommandPalette, NotificationToast
│   │   ├── home/                   # FeaturedInstanceCard, InstanceMiniCard, QuickActions, NewsFeed
│   │   ├── instances/              # InstancesView, InstanceCard, InstanceWizardModal, InstanceEditModal
│   │   ├── contents/               # ContentsView (Mods, Shaders, Resource Packs directory)
│   │   ├── skins/                  # SkinsView, PlayerModelViewer (3D interactive canvas)
│   │   ├── console/                # ConsoleView (Real-time logs & command terminal)
│   │   ├── accounts/               # AccountsView (Microsoft & offline accounts)
│   │   └── settings/               # SettingsView (Theme presets, glass sliders, Java, Minecraft)
│   ├── context/
│   │   ├── LauncherContext.tsx     # Master reactive launcher state with Electron IPC fallback
│   │   └── ThemeContext.tsx        # Dynamic theme engine & CSS variable compositor
│   ├── types/
│   │   └── launcher.ts             # Complete TypeScript interface definitions
│   ├── index.css                   # Tailwind styling, glassmorphism utilities & glowing effects
│   ├── App.tsx                     # Master layout & routing
│   └── main.tsx                    # React DOM entry point
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Running VictusClient

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Java**: Java 17 or Java 21 for modern Minecraft (1.20+)

### Development Mode
To run the Vite dev server with Hot Module Replacement:
```bash
npm run dev
```

To run the complete native Electron desktop application:
```bash
npm start
```

### Production Build
To compile TypeScript and bundle the frontend and Electron main process:
```bash
npm run build
```

---

## 🛡️ License
VictusClient is open source under the MIT License.
