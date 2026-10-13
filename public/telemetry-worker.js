// LitroMetrik PRO - Background Telemetry Worker
// Runs precision background clock for active driving mode, preventing
// background tab throttling while user switches to navigation apps (Waze / Google Maps).

let timerId = null;
let lastTickTime = 0;

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.action === 'START') {
    if (timerId) {
      clearInterval(timerId);
    }
    lastTickTime = Date.now();
    timerId = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTickTime;
      lastTickTime = now;
      self.postMessage({
        type: 'TICK',
        timestamp: now,
        deltaMs: deltaMs,
      });
    }, 1000);

    self.postMessage({ type: 'STARTED', timestamp: lastTickTime });
  } else if (data.action === 'STOP' || data.action === 'PAUSE') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    lastTickTime = 0;
    self.postMessage({ type: 'STOPPED' });
  } else if (data.action === 'SYNC') {
    lastTickTime = Date.now();
  }
});
