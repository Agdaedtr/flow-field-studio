const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#070b12',
    title: 'Flow Field Studio',
    icon: path.join(__dirname, 'app', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile(path.join(__dirname, 'app', 'index.html'))

  // Open external links in the system browser; keep in-app navigation internal.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function buildMenu() {
  const template = [
    {
      label: 'Flow Field Studio',
      submenu: [
        { role: 'togglefullscreen' },
        { role: 'reload' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  buildMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
