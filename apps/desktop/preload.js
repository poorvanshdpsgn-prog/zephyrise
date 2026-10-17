const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("zephyrise", {
  // Window controls
  minimize: () => ipcRenderer.send("win:minimize"),
  maximize: () => ipcRenderer.send("win:maximize"),
  closeWindow: () => ipcRenderer.send("win:close"),

  // Tabs
  getTabs: () => ipcRenderer.invoke("tabs:list"),
  createTab: () => ipcRenderer.invoke("tabs:create"),
  switchTab: (id) => ipcRenderer.invoke("tabs:switch", id),
  closeTab: (id) => ipcRenderer.invoke("tabs:close", id),

  // Browser navigation
  navigate: (url) => ipcRenderer.invoke("browser:navigate", url),
  back: () => ipcRenderer.invoke("browser:back"),
  forward: () => ipcRenderer.invoke("browser:forward"),
  reload: () => ipcRenderer.invoke("browser:reload"),

  // Keyboard shortcuts
  onFocusAddress: (callback) => {
    if (typeof callback !== "function") return () => {};

    const listener = () => callback();

    ipcRenderer.on("shortcut:focus-address", listener);

    return () => {
      ipcRenderer.removeListener("shortcut:focus-address", listener);
    };
  },

  // Tab updates
  onTabsUpdated: (callback) => {
    if (typeof callback !== "function") return () => {};

    const listener = (_event, tabs) => callback(tabs);

    ipcRenderer.on("tabs:updated", listener);

    return () => {
      ipcRenderer.removeListener("tabs:updated", listener);
    };
  }
});