const { app, BrowserWindow, ipcMain, Menu, nativeImage } = require("electron");
const path = require("path");

let win;

app.setName("Zephyrise");

function createWindow() {
  // Set Dock icon on macOS
  if (process.platform === "darwin") {
    const icon = nativeImage.createFromPath(
      path.join(__dirname, "assets", "icon.png")
    );

    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
    } else {
      console.log("❌ Couldn't load icon:", path.join(__dirname, "assets", "icon.png"));
    }
  }

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    titleBarStyle: "hidden",

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  win.setWindowButtonVisibility(false);
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Dev only
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// IPC
ipcMain.on("win:minimize", () => win.minimize());

ipcMain.on("win:maximize", () => {
  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on("win:close", () => win.close());