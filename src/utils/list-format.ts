import type { PaginationResult, RenderableNavItem } from '../types/mcard';

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 250) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(null, args), delay);
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: items.slice(start, end),
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export type PillHelpers = {
  getTypeIconSvg: (ct?: string) => string;
  getTypePillHTML: (ct?: string) => string;
};

export function formatNavItemHTML(item: RenderableNavItem, helpers: PillHelpers): string {
  const icon = helpers.getTypeIconSvg(item.contentType || '');
  const pill = helpers.getTypePillHTML(item.contentType || '');
  const title = item.title || '';
  return `
    <li>
      <button
        class="nav-link w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-80 hover:opacity-100"
        data-hash="${item.hash || ''}"
        data-title="${title}"
        data-content-type="${item.contentType || ''}"
        data-g-time="${item.gTime || ''}"
      >
        ${icon} ${title} ${pill}
      </button>
    </li>
  `;
}
