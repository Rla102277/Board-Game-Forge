// Accessibility utilities and ARIA label generators

export function generateAriaLabel(action: string, target?: string): string {
  if (target) {
    return `${action} ${target}`;
  }
  return action;
}

export function getAriaRole(element: string): string {
  const roles: Record<string, string> = {
    button: "button",
    link: "link",
    dialog: "dialog",
    alert: "alert",
    status: "status",
    tooltip: "tooltip",
    navigation: "navigation",
    main: "main",
    complementary: "complementary",
    contentinfo: "contentinfo",
    search: "search",
    tablist: "tablist",
    tab: "tab",
    tabpanel: "tabpanel",
  };
  return roles[element] || element;
}

export function getKeyboardNavigationHint(shortcut: string): string {
  const hints: Record<string, string> = {
    "⌘K": "Command + K",
    "⌘/": "Command + /",
    "⌘N": "Command + N",
    "⌘E": "Command + E",
    "⌘R": "Command + R",
    "⌘T": "Command + T",
    "Escape": "Escape",
  };
  return hints[shortcut] || shortcut;
}

export function announceToScreenReader(message: string): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

export function focusNextElement(container: HTMLElement): void {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const currentIndex = Array.from(focusableElements).indexOf(
    document.activeElement as HTMLElement
  );
  const nextIndex = (currentIndex + 1) % focusableElements.length;
  (focusableElements[nextIndex] as HTMLElement)?.focus();
}

export function focusPreviousElement(container: HTMLElement): void {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const currentIndex = Array.from(focusableElements).indexOf(
    document.activeElement as HTMLElement
  );
  const previousIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
  (focusableElements[previousIndex] as HTMLElement)?.focus();
}
