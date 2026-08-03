const ICON_ATTRS = 'viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const ICONS: Record<string, string> = {
  phone: `<svg ${ICON_ATTRS}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>`,
  email: `<svg ${ICON_ATTRS}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
  link: `<svg ${ICON_ATTRS}><path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1"/><path d="M13 18l-1 1a4 4 0 0 1-6-6l1-1"/></svg>`,
  location: `<svg ${ICON_ATTRS}><path d="M12 21s7-7.2 7-12a7 7 0 0 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
};

/** Returns a small inline SVG icon by name, or an empty string if unknown. */
export function getIcon(name: string): string {
  return ICONS[name] ?? '';
}
