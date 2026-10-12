const routes = new Set(['dashboard', 'chats', 'learn', 'research', 'profile', 'login', 'signup', 'splash']);

export function resolveNavigationView(target) {
  const view = target?.dataset?.view;
  return routes.has(view) ? view : null;
}

export function listNavigationViews() {
  return [...routes];
}