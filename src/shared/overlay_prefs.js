export const OVERLAY_PREFS_KEY = 'fcmd:overlayPrefs';
export const DEFAULT_OVERLAY_OPACITY = 1;
export const MIN_OVERLAY_OPACITY = 0.4;
export const MAX_OVERLAY_OPACITY = 1;
export const OVERLAY_OPACITY_STEP = 0.05;

export function clampOverlayOpacity(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_OVERLAY_OPACITY;
  }
  return Math.min(MAX_OVERLAY_OPACITY, Math.max(MIN_OVERLAY_OPACITY, value));
}

export function normalizeOverlayPreferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { opacity: DEFAULT_OVERLAY_OPACITY };
  }

  return {
    opacity: clampOverlayOpacity(Number(value.opacity))
  };
}
