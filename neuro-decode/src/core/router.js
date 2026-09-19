const routes = {};
let currentScene = null;

export function registerRoute(name, sceneModule) {
  routes[name] = sceneModule;
}

function getRouteFromHash() {
  const hash = window.location.hash.replace('#/', '');
  return hash || 'acquisition';
}

function updateNavHighlight(routeName) {
  document.querySelectorAll('#station-nav a').forEach((el) => {
    el.classList.toggle('active', el.dataset.route === routeName);
  });
}

async function navigate() {
  const routeName = getRouteFromHash();
  const scene = routes[routeName];
  if (!scene) return;

  if (currentScene && currentScene.dispose) {
    currentScene.dispose();
  }

  updateNavHighlight(routeName);
  currentScene = scene;
  if (scene.init) await scene.init();
  if (scene.animate) scene.animate();
}

export function startRouter() {
  window.addEventListener('hashchange', navigate);
  navigate();
}
