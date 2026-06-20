# Flow Field Studio â Desktop (Electron)

A thin [Electron](https://www.electronjs.org/) wrapper that runs the Flow Field Studio canvas app as a native desktop window. The web assets in the repo root (`index.html`, `styles.css`, `app.js`, `icon.png`) are the single source of truth â this folder only adds the desktop shell.

## Build a Windows `.exe`

From this `desktop/` folder:

```bash
npm install
npm run dist:win          # single-file portable .exe  -> dist/FlowFieldStudio-portable-1.0.0.exe
# or
npm run dist:win-installer  # NSIS installer .exe
```

`npm run dist:win` first copies the web assets into `./app`, then packages everything into one self-contained portable executable. No installation required on the target machine â just double-click the `.exe`.

> Building Windows targets on Linux/macOS requires [Wine](https://www.winehq.org/). On Windows, no extra tooling is needed.

## Run in development

```bash
npm install
npm start
```

## How it works

`main.js` opens a `BrowserWindow` and loads `app/index.html` from disk. Everything runs locally and offline â there is no network access and no backend. The window starts at 1280Ã820, supports fullscreen (`F11`), and the in-app keyboard shortcuts (`Space`, `R`, `C`, `S`) all work as in the browser.
