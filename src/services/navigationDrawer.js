export function createNavigationDrawer({ getDialog, getInitialFocus, getActiveElement } = {}) {
  let returnFocus = null;

  return {
    open(trigger = getActiveElement?.()) {
      const dialog = getDialog?.();
      if (!dialog) return false;
      returnFocus = trigger ?? null;
      if (!dialog.open) dialog.showModal();
      getInitialFocus?.()?.focus();
      return true;
    },
    close() {
      const dialog = getDialog?.();
      if (!dialog?.open) return false;
      dialog.close();
      if (returnFocus?.isConnected !== false) returnFocus?.focus?.();
      returnFocus = null;
      return true;
    },
    handleKeydown(event) {
      if (event.key !== 'Escape') return false;
      event.preventDefault();
      return this.close();
    },
  };
}

export function activateDrawerFromLogo(target, drawer) {
  if (!target?.matches?.('[data-open-drawer]')) return false;
  return drawer.open(target);
}