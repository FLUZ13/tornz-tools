  // UI rendering
  // ---------------------------------------------------------------------------

  function injectStyles() {
    if ($(`#${APP.id}-style`)) return;
    const style = document.createElement('style');
    style.id = `${APP.id}-style`;
