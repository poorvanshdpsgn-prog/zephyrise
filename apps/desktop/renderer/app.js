window.addEventListener("DOMContentLoaded", async () => {
  const api = window.zephyrise;

  const tabsContainer = document.getElementById("tabs");
  const urlInput = document.getElementById("url");

  const newTabBtn = document.getElementById("newTab");

  const min = document.getElementById("min");
  const max = document.getElementById("max");
  const close = document.getElementById("close");

  const go = document.getElementById("go");
  const back = document.getElementById("back");
  const forward = document.getElementById("forward");
  const reload = document.getElementById("reload");

  let tabs = [];
  let activeTabId = null;

  // Window controls
  min.onclick = () => api.minimize();
  max.onclick = () => api.maximize();
  close.onclick = () => api.closeWindow();

  // Mac keyboard shortcut: Command + L
  api.onFocusAddress(() => {
    urlInput.focus();
    urlInput.select();
  });

  // Render browser tabs
  function renderTabs() {
    tabsContainer.replaceChildren();

    tabs.forEach(tab => {
      const element = document.createElement("div");
      element.className =
        "tab" + (tab.active ? " active" : "");

      const title = document.createElement("span");
      title.textContent = tab.title || tab.url || "New tab";

      const closeButton = document.createElement("button");
      closeButton.textContent = "×";
      closeButton.setAttribute("aria-label", "Close tab");

      element.onclick = () => api.switchTab(tab.id);

      closeButton.onclick = event => {
        event.stopPropagation();
        api.closeTab(tab.id);
      };

      element.append(title, closeButton);
      tabsContainer.appendChild(element);
    });
  }

  // Synchronize UI with the main process
  function updateTabs(updatedTabs) {
    tabs = updatedTabs;

    const activeTab = tabs.find(tab => tab.active);

    activeTabId = activeTab?.id ?? null;

    if (activeTab) {
      urlInput.value = activeTab.url || "";
    }

    renderTabs();
  }

  api.onTabsUpdated(updateTabs);

  // Navigation
  async function navigate() {
    const text = urlInput.value.trim();

    if (!text) return;

    await api.navigate(text);
  }

  go.onclick = navigate;

  urlInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      navigate();
    }
  });

  back.onclick = () => api.back();
  forward.onclick = () => api.forward();
  reload.onclick = () => api.reload();

  // Create tabs
  newTabBtn.onclick = () => api.createTab();

  // Initial synchronization
  updateTabs(await api.getTabs());

  if (activeTabId === null) {
    await api.createTab();
  }
});