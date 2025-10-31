import { 
    JOURNAL_STORAGE_KEY,
    THOUGHT_COURT_STORAGE_KEY,
    RITUALS_STORAGE_KEY,
    VALUES_STORAGE_KEY,
    WEEKLY_REVIEW_STORAGE_KEY,
    GUIDED_JOURNEY_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    CHAT_STORAGE_KEY,
    ASSESSMENT_STORAGE_KEY,
    COMPANION_STORAGE_KEY,
    GOALS_STORAGE_KEY,
    AFFIRMATION_STORAGE_KEY,
    PROACTIVE_COACH_STORAGE_KEY,
    UNSENT_LETTER_STORAGE_KEY,
    FEAR_SETTING_STORAGE_KEY,
    LAST_CHECKIN_DATE_KEY,
    BADGE_STORAGE_KEY,
    RHYTHM_STORAGE_KEY,
    WOUNDS_STORAGE_KEY,
    RELATIONAL_ECOSYSTEM_STORAGE_KEY,
    SYNTHESIS_STORAGE_KEY,
    HERBARIUM_CACHE_KEY,
    CRYSTALS_CACHE_KEY,
    ARBORETUM_CACHE_KEY,
    BESTIARY_CACHE_KEY,
    PROGRESS_ANALYSIS_CACHE_KEY,
    GRATITUDE_STORAGE_KEY,
    CUSTOM_SOUNDS_STORAGE_KEY,
    BODY_MAP_STORAGE_KEY,
    CUSTOM_SOUND_MIXES_STORAGE_KEY,
    PERSONALIZED_PATH_STORAGE_KEY,
    RHYTHM_ADVICE_CACHE_KEY,
    DREAM_JOURNAL_STORAGE_KEY,
    NARRATIVE_ARC_STORAGE_KEY
} from '../types';

const APP_PREFIX = 'HALTE_IA_';

// List of all keys used in the application for the clear all data function
const ALL_APP_KEYS = [
    JOURNAL_STORAGE_KEY,
    THOUGHT_COURT_STORAGE_KEY,
    RITUALS_STORAGE_KEY,
    VALUES_STORAGE_KEY,
    WEEKLY_REVIEW_STORAGE_KEY,
    GUIDED_JOURNEY_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    CHAT_STORAGE_KEY,
    ASSESSMENT_STORAGE_KEY,
    COMPANION_STORAGE_KEY,
    GOALS_STORAGE_KEY,
    AFFIRMATION_STORAGE_KEY,
    PROACTIVE_COACH_STORAGE_KEY,
    UNSENT_LETTER_STORAGE_KEY,
    FEAR_SETTING_STORAGE_KEY,
    LAST_CHECKIN_DATE_KEY,
    BADGE_STORAGE_KEY,
    RHYTHM_STORAGE_KEY,
    WOUNDS_STORAGE_KEY,
    RELATIONAL_ECOSYSTEM_STORAGE_KEY,
    SYNTHESIS_STORAGE_KEY,
    HERBARIUM_CACHE_KEY,
    CRYSTALS_CACHE_KEY,
    ARBORETUM_CACHE_KEY,
    BESTIARY_CACHE_KEY,
    PROGRESS_ANALYSIS_CACHE_KEY,
    GRATITUDE_STORAGE_KEY,
    CUSTOM_SOUNDS_STORAGE_KEY,
    BODY_MAP_STORAGE_KEY,
    CUSTOM_SOUND_MIXES_STORAGE_KEY,
    PERSONALIZED_PATH_STORAGE_KEY,
    RHYTHM_ADVICE_CACHE_KEY,
    DREAM_JOURNAL_STORAGE_KEY,
    NARRATIVE_ARC_STORAGE_KEY,
];

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const value = localStorage.getItem(`${APP_PREFIX}${key}`);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`Error getting data from localStorage for key "${key}"`, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(`${APP_PREFIX}${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting data in localStorage for key "${key}"`, error);
    }
  },

  clearAllAppData: (): void => {
    try {
        ALL_APP_KEYS.forEach(key => {
            // Note: storage.get/set prefixes keys, so we should prefix here too when removing.
            localStorage.removeItem(`${APP_PREFIX}${key}`);
        });
    } catch (error) {
        console.error('Error clearing app data from localStorage', error);
    }
  },

  exportAllAppData: (): string => {
    const data: { [key: string]: any } = {};
    try {
      ALL_APP_KEYS.forEach(key => {
        const value = localStorage.getItem(`${APP_PREFIX}${key}`);
        if (value) {
          data[key] = JSON.parse(value);
        }
      });
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting app data', error);
      throw error;
    }
  },

  importAllAppData: (jsonString: string): void => {
    try {
      const data = JSON.parse(jsonString);
      
      const hasValidKey = ALL_APP_KEYS.some(key => data.hasOwnProperty(key));
      if (!hasValidKey) {
        throw new Error("Le fichier ne semble pas être une sauvegarde valide de HALTE.IA.");
      }

      storage.clearAllAppData();

      ALL_APP_KEYS.forEach(key => {
        if (data[key]) {
          storage.set(key, data[key]);
        }
      });

    } catch (error) {
      console.error('Error importing app data', error);
      throw error;
    }
  }
};