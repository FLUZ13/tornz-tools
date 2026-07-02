    `;
    const styleHost = document.head || document.documentElement || document.body;
    if (!styleHost) {
      setTimeout(injectStyles, 50);
      return;
    }
    styleHost.appendChild(style);
  }

  function ensurePanel() {
    injectStyles();
    let panel = $(`#${APP.id}`);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = APP.id;
      const host = document.body || document.documentElement;
      if (!host) return;
      host.appendChild(panel);
    }
    state.elements.panel = panel;
    applyPanelSize(panel);
    applyPanelPosition(panel);
    renderPanel();
  }

  function clampWindowHeight(value, fallback, minHeight = 160, maxHeightOverride = 0) {
    const viewportMax = Math.max(minHeight, window.innerHeight - 8);
    const maxHeight = Math.max(minHeight, Math.min(viewportMax, parseNumber(maxHeightOverride) || viewportMax));
    const raw = parseNumber(value) || fallback || 0;
    return clamp(Math.round(raw), minHeight, maxHeight);
  }

  function panelContentMaxHeight(panel) {
    if (!panel) return window.innerHeight - 8;
    const header = $('.fluz-header', panel);
    const tabs = $('.fluz-tabs', panel);
    const content = $('.fluz-content', panel);
    const footer = $('.fluz-footer', panel);
    const grip = $('.fluz-vertical-resize', panel);
    const borderPad = 4;
    const natural = (header ? header.offsetHeight : 0)
      + (tabs ? tabs.offsetHeight : 0)
      + naturalContentHeight(content)
      + (footer ? footer.offsetHeight : 0)
      + (grip ? grip.offsetHeight : 0)
      + borderPad;
    return Math.max(160, Math.min(window.innerHeight - 8, Math.ceil(natural)));
  }

  function naturalContentHeight(content) {
    if (!content) return 0;
    const children = Array.from(content.children || []);
    if (!children.length) return content.scrollHeight || 0;
    return children.reduce((total, child) => {
      const style = window.getComputedStyle ? window.getComputedStyle(child) : null;
      const marginTop = style ? parseNumber(style.marginTop) : 0;
      const marginBottom = style ? parseNumber(style.marginBottom) : 0;
      return total + child.scrollHeight + marginTop + marginBottom;
    }, 0);
  }

  function modalContentMaxHeight(box) {
    if (!box) return window.innerHeight - 8;
    const head = $('.fluz-window-head, .fluz-section-title', box);
    const body = $('.fluz-window-body', box);
    const grip = $('.fluz-vertical-resize', box);
    if (body) {
      const natural = (head ? head.offsetHeight : 0) + body.scrollHeight + (grip ? grip.offsetHeight : 0) + 4;
      return Math.max(150, Math.min(window.innerHeight - 8, Math.ceil(natural)));
    }
    return Math.max(150, Math.min(window.innerHeight - 8, Math.ceil(box.scrollHeight + 4)));
  }

  function applyPanelSize(panel) {
    if (!panel) return;
    if (state.panel.collapsed) {
      panel.classList.remove('is-height-managed');
      panel.style.height = '';
      return;
    }
    const stored = parseNumber(state.panel.height);
    if (!stored) {
      panel.classList.remove('is-height-managed');
      panel.style.height = '';
      return;
    }
    const naturalHeight = panelContentMaxHeight(panel);
    const targetHeight = Math.max(stored, naturalHeight);
    panel.classList.add('is-height-managed');
    panel.style.height = `${clampWindowHeight(targetHeight, panel.offsetHeight || 420, 160, naturalHeight)}px`;
  }

  function applyPanelPosition(panel) {
    const x = parseNumber(state.panel.x);
    const y = parseNumber(state.panel.y);
    if (x > 0 || y > 0) {
      const width = panel.offsetWidth || 490;
      const height = panel.offsetHeight || 120;
      panel.style.left = `${clamp(x, 4, Math.max(4, window.innerWidth - width - 4))}px`;
      panel.style.top = `${clamp(y, 4, Math.max(4, window.innerHeight - Math.min(height, window.innerHeight - 8) - 4))}px`;
      panel.style.right = 'auto';
    } else {
      panel.style.left = '';
      panel.style.top = '';
      panel.style.right = '';
    }
  }

  async function resetPanelPosition() {
    state.panel.x = null;
    state.panel.y = null;
    state.panel.collapsed = false;
    await savePanelState();
    if (state.elements.panel) applyPanelPosition(state.elements.panel);
    renderPanel();
    showFlash('Panel position reset.');
  }

