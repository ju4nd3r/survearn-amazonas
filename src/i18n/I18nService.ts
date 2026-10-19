import esLocale from '../data/locales/es.json';
import enLocale from '../data/locales/en.json';
import { LanguageCode } from '../core/types/game.types';
import { EventBus } from '../core/events/EventBus';

type LocaleTree = typeof esLocale;

class I18nServiceImpl {
  private currentLang: LanguageCode = 'es';
  private readonly dictionaries: Record<LanguageCode, LocaleTree> = {
    es: esLocale,
    en: enLocale
  };

  public getLanguage(): LanguageCode {
    return this.currentLang;
  }

  public setLanguage(lang: LanguageCode): void {
    this.currentLang = lang;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    EventBus.emit('LANGUAGE_CHANGED', { language: lang });
  }

  public toggleLanguage(): LanguageCode {
    const next: LanguageCode = this.currentLang === 'es' ? 'en' : 'es';
    this.setLanguage(next);
    return next;
  }

  public t(dotKey: string): string {
    const parts = dotKey.split('.');
    let cursor: unknown = this.dictionaries[this.currentLang];
    for (const part of parts) {
      if (cursor !== null && typeof cursor === 'object' && part in cursor) {
        cursor = (cursor as Record<string, unknown>)[part];
      } else {
        return dotKey;
      }
    }
    return typeof cursor === 'string' ? cursor : dotKey;
  }
}

export const i18n = new I18nServiceImpl();
