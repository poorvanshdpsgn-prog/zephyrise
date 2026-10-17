const {
  app,
  BrowserWindow,
  WebContentsView,
  ipcMain,
  Menu,
  nativeImage
} = require("electron");

const path = require("path");

let win;
let activeTabId = null;
let nextTabId = 1;

const tabs = new Map();

app.setName("Zephyrise");

// ==========================================
// WINDOW
// ==========================================

function createWindow() {
  if (process.platform === "darwin") {
    const icon = nativeImage.createFromPath(
      path.join(__dirname, "assets", "icon.png")
    );

    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
    }
  }

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    titleBarStyle: "hidden",

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.setWindowButtonVisibility(false);
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  win.on("resize", updateActiveTabBounds);

  // Shortcuts while the browser UI has focus.
  win.webContents.on("before-input-event", (event, input) => {
    handleMacShortcut(event, input);
  });
}

// ==========================================
// MAC KEYBOARD SHORTCUTS
// ==========================================

function handleMacShortcut(event, input) {
  if (process.platform !== "darwin") return;
  if (!input.meta || input.type !== "keyDown") return;

  const key = input.key.toLowerCase();

  switch (key) {
    case "l":
      event.preventDefault();
      win.webContents.send("shortcut:focus-address");
      break;

    case "t":
      event.preventDefault();
      createTab();
      break;

    case "w":
      event.preventDefault();
      if (activeTabId !== null) {
        closeTab(activeTabId);
      }
      break;

    case "r":
      event.preventDefault();
      getActiveTab()?.view.webContents.reload();
      break;

    case "[":
      event.preventDefault();

      if (getActiveTab()?.view.webContents.navigationHistory.canGoBack()) {
        getActiveTab().view.webContents.navigationHistory.goBack();
      }

      break;

    case "]":
      event.preventDefault();

      if (getActiveTab()?.view.webContents.navigationHistory.canGoForward()) {
        getActiveTab().view.webContents.navigationHistory.goForward();
      }

      break;
  }
}

// ==========================================
// ACTIVE TAB
// ==========================================

function getActiveTab() {
  return tabs.get(activeTabId);
}

// ==========================================
// VIEW POSITION
// ==========================================

function updateActiveTabBounds() {
  const tab = getActiveTab();

  if (!win || !tab || win.isDestroyed()) return;

  const bounds = win.getContentBounds();
  const toolbar = 134;

  tab.view.setBounds({
    x: 0,
    y: toolbar,
    width: bounds.width,
    height: Math.max(0, bounds.height - toolbar)
  });
}

// ==========================================
// CREATE TAB
// ==========================================

function createTab(url = null) {
  if (!win || win.isDestroyed()) return null;

  const id = nextTabId++;

  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const tab = {
    id,
    url: url || "",
    view
  };

  tabs.set(id, tab);

  // Open target=_blank links in a new Zephyrise tab.
  view.webContents.setWindowOpenHandler(({ url }) => {
    createTab(url);
    return { action: "deny" };
  });

  view.webContents.on("page-title-updated", () => {
    sendTabsUpdate();
  });

  view.webContents.on("did-navigate", (_event, navigatedUrl) => {
    tab.url = navigatedUrl.startsWith("file:")
      ? ""
      : navigatedUrl;

    sendTabsUpdate();
  });

  view.webContents.on("did-navigate-in-page", (_event, navigatedUrl) => {
    tab.url = navigatedUrl.startsWith("file:")
      ? ""
      : navigatedUrl;

    sendTabsUpdate();
  });

  // Shortcuts while a webpage has focus.
  view.webContents.on("before-input-event", (event, input) => {
    handleMacShortcut(event, input);
  });

  switchTab(id);

  if (url) {
    tab.url = url;
    view.webContents.loadURL(url);
  } else {
    tab.url = "";

    view.webContents.loadFile(
      path.join(__dirname, "renderer", "newtab.html")
    );
  }

  sendTabsUpdate();

  return id;
}

// ==========================================
// SWITCH TAB
// ==========================================

function switchTab(id) {
  const tab = tabs.get(id);

  if (!tab || !win || win.isDestroyed()) return;

  const previousTab = getActiveTab();

  if (previousTab && previousTab.id !== id) {
    win.contentView.removeChildView(previousTab.view);
  }

  activeTabId = id;

  if (tab.view.webContents.isDestroyed()) return;

  win.contentView.addChildView(tab.view);

  updateActiveTabBounds();
  sendTabsUpdate();
}

// ==========================================
// CLOSE TAB
// ==========================================

function closeTab(id) {
  const tab = tabs.get(id);

  if (!tab) return;

  const wasActive = activeTabId === id;

  if (wasActive && win && !win.isDestroyed()) {
    win.contentView.removeChildView(tab.view);
  }

  tabs.delete(id);

  if (!tab.view.webContents.isDestroyed()) {
    tab.view.webContents.close();
  }

  if (wasActive) {
    activeTabId = null;

    const remaining = [...tabs.keys()];

    if (remaining.length > 0) {
      switchTab(remaining[remaining.length - 1]);
    } else {
      createTab();
    }
  }

  sendTabsUpdate();
}

// ==========================================
// URL NORMALIZATION
// ==========================================

function normalizeUrl(input) {
  const text = String(input ?? "").trim();

  if (!text) return null;

  const search = () =>
    "https://www.google.com/search?q=" +
    encodeURIComponent(text);

  // Explicit HTTP/HTTPS URLs.
  if (/^https?:\/\//i.test(text)) {
    try {
      const parsed = new URL(text);

      if (
        ["http:", "https:"].includes(parsed.protocol) &&
        parsed.hostname
      ) {
        return parsed.href;
      }

      return search();
    } catch {
      return search();
    }
  }

  // Domains, localhost, IPv4, ports, paths and query strings.
  const looksLikeHost =
    /^(localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[\w-]+\.)+[a-z]{2,})(:\d{1,5})?(\/[^\s]*)?([?#][^\s]*)?$/i;

  if (!/\s/.test(text) && looksLikeHost.test(text)) {
    try {
      const parsed = new URL(`https://${text}`);

      if (
        ["http:", "https:"].includes(parsed.protocol) &&
        parsed.hostname
      ) {
        return parsed.href;
      }
    } catch {
      // Invalid address: treat it as a search query.
    }
  }

  return search();
}

// ==========================================
// TAB UPDATES
// ==========================================

function sendTabsUpdate() {
  if (
    !win ||
    win.isDestroyed() ||
    win.webContents.isDestroyed()
  ) {
    return;
  }

  const data = [...tabs.values()].map(tab => ({
    id: tab.id,
    url: tab.url,

    title: tab.view.webContents.isDestroyed()
      ? tab.url
      : tab.view.webContents.getTitle(),

    active: tab.id === activeTabId
  }));

  win.webContents.send("tabs:updated", data);
}

// ==========================================
// IPC SECURITY
// ==========================================

function getSenderTab(event) {
  if (!win || event.sender !== win.webContents) {
    return null;
  }

  return getActiveTab();
}

// ==========================================
// TAB IPC
// ==========================================

ipcMain.handle("tabs:list", event => {
  if (!win || event.sender !== win.webContents) {
    return [];
  }

  return [...tabs.keys()].map(id => {
    const tab = tabs.get(id);

    return {
      id,
      url: tab.url,
      title: tab.view.webContents.getTitle(),
      active: id === activeTabId
    };
  });
});

ipcMain.handle("tabs:create", event => {
  if (!win || event.sender !== win.webContents) return null;

  return createTab();
});

ipcMain.handle("tabs:switch", (event, id) => {
  if (!win || event.sender !== win.webContents) return false;
  if (!Number.isInteger(id)) return false;

  switchTab(id);

  return activeTabId === id;
});

ipcMain.handle("tabs:close", (event, id) => {
  if (!win || event.sender !== win.webContents) return false;
  if (!Number.isInteger(id) || !tabs.has(id)) return false;

  closeTab(id);

  return true;
});

// ==========================================
// BROWSER NAVIGATION IPC
// ==========================================

ipcMain.handle("browser:navigate", (event, input) => {
  const tab = getSenderTab(event);

  if (!tab) return false;

  const url = normalizeUrl(input);

  if (!url) return false;

  tab.url = url;
  tab.view.webContents.loadURL(url);

  sendTabsUpdate();

  return true;
});

ipcMain.handle("browser:back", event => {
  const tab = getSenderTab(event);

  if (!tab) return false;

  if (tab.view.webContents.navigationHistory.canGoBack()) {
    tab.view.webContents.navigationHistory.goBack();
    return true;
  }

  return false;
});

ipcMain.handle("browser:forward", event => {
  const tab = getSenderTab(event);

  if (!tab) return false;

  if (tab.view.webContents.navigationHistory.canGoForward()) {
    tab.view.webContents.navigationHistory.goForward();
    return true;
  }

  return false;
});

ipcMain.handle("browser:reload", event => {
  const tab = getSenderTab(event);

  if (!tab) return false;

  tab.view.webContents.reload();

  return true;
});

// ==========================================
// WINDOW CONTROLS
// ==========================================

ipcMain.on("win:minimize", event => {
  if (win && event.sender === win.webContents) {
    win.minimize();
  }
});

ipcMain.on("win:maximize", event => {
  if (!win || event.sender !== win.webContents) return;

  win.isMaximized()
    ? win.unmaximize()
    : win.maximize();
});

ipcMain.on("win:close", event => {
  if (win && event.sender === win.webContents) {
    win.close();
  }
});

// ==========================================
// APP LIFECYCLE
// ==========================================

app.whenReady().then(() => {
  createWindow();
});

app.on("before-quit", () => {
  for (const tab of tabs.values()) {
    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.close();
    }
  }

  tabs.clear();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});