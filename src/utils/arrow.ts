// One shape for Astro components and progressively enhanced service previews.
export const arrowPath = 'M4 12h15M12 5l7 7-7 7';
export const arrowMarkup = (diagonal = false) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="arrow-icon${diagonal ? ' diagonal' : ''}"><path d="${arrowPath}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
