const { ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {

const tabsContainer = document.getElementById("tabs");
const webview = document.getElementById("webview");
const urlInput = document.getElementById("url");

const newTabBtn = document.getElementById("newTab");

const min = document.getElementById("min");
const max = document.getElementById("max");
const close = document.getElementById("close");

let tabs = [];
let activeTab = null;

/* TRAFFIC */
min.onclick = () => ipcRenderer.send("win:minimize");
max.onclick = () => ipcRenderer.send("win:maximize");
close.onclick = () => ipcRenderer.send("win:close");

/* CREATE TAB (JUST URL STATE) */
function createTab(url="https://google.com") {
  const tab = { id: Date.now(), url };
  tabs.push(tab);
  switchTab(tab.id);
  renderTabs();
}

/* SWITCH TAB (ONLY CHANGE URL) */
function switchTab(id) {
  activeTab = id;
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  webview.src = tab.url;
  urlInput.value = tab.url;

  renderTabs();
}

/* RENDER TABS */
function renderTabs() {
  tabsContainer.innerHTML = "";

  tabs.forEach(tab => {
    const div = document.createElement("div");
    div.className = "tab" + (tab.id === activeTab ? " active" : "");

    div.innerHTML = `
      <span>${new URL(tab.url).hostname}</span>
      <button>x</button>
    `;

    div.onclick = () => switchTab(tab.id);

    div.querySelector("button").onclick = (e) => {
      e.stopPropagation();

      tabs = tabs.filter(t => t.id !== tab.id);

      if (tabs.length === 0) {
        createTab();
      } else {
        switchTab(tabs[0].id);
      }

      renderTabs();
    };

    tabsContainer.appendChild(div);
  });
}

/* NAVIGATION */
function navigate() {
  let text = urlInput.value.trim();
  if (!text) return;

  if (text.includes(".") && !text.includes(" ")) {
    if (!text.startsWith("http")) text = "https://" + text;
  } else {
    text = "https://google.com/search?q=" + encodeURIComponent(text);
  }

  const tab = tabs.find(t => t.id === activeTab);
  tab.url = text;

  webview.src = text;
  renderTabs();
}

/* EVENTS */
newTabBtn.onclick = () => createTab();
document.getElementById("go").onclick = navigate;

document.getElementById("back").onclick = () => webview.goBack();
document.getElementById("forward").onclick = () => webview.goForward();
document.getElementById("reload").onclick = () => webview.reload();

/* INIT */
createTab();

});