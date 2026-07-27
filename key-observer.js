(() => {
  if (globalThis.__archeoKeyObserverLoaded) return;
  globalThis.__archeoKeyObserverLoaded = true;

  const CONTROL_RELEASE_EVENT = "__archeo_control_released__";

  function signalControlRelease() {
    window.dispatchEvent(new Event(CONTROL_RELEASE_EVENT));
  }

  window.addEventListener("keyup", (event) => {
    if (event.key === "Control") signalControlRelease();
  }, true);

  window.addEventListener("blur", signalControlRelease, true);
})();
