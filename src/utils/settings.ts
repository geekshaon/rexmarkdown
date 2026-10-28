import type { AppSettings } from '../types';

const SETTINGS_KEY = 'rexmd_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 14,
  scrollSync: true,
  zenMode: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
