import { ContactInfo } from '../../parser/types';
import { escapeHtml } from '../../utils/escapeHtml';
import { getIcon } from './icons';

interface ContactField {
  key: keyof ContactInfo;
  icon: string;
}

// Rendering order for the header contact row.
const CONTACT_FIELDS: ContactField[] = [
  { key: 'phone', icon: 'phone' },
  { key: 'email', icon: 'email' },
  { key: 'linkedin', icon: 'link' },
  { key: 'github', icon: 'link' },
  { key: 'website', icon: 'link' },
  { key: 'location', icon: 'location' },
];

/**
 * Renders every populated contact field as an icon + value pair.
 * Templates that want a plain-text contact line (e.g. the ATS template)
 * simply hide `.contact-icon` via CSS instead of duplicating this markup.
 */
export function renderContactRow(contact: ContactInfo): string {
  const items = CONTACT_FIELDS.map(({ key, icon }) => {
    const value = contact[key];
    if (!value) return '';
    return `<span class="contact-item">
      <span class="contact-icon">${getIcon(icon)}</span>
      <span class="contact-value">${escapeHtml(value)}</span>
    </span>`;
  })
    .filter(Boolean)
    .join('');

  return items ? `<div class="contact-row">${items}</div>` : '';
}
