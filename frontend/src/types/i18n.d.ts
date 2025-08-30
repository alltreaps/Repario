declare module 'i18n' {
  export interface I18nOptions {
    locales?: string[];
    defaultLocale?: string;
    fallbacks?: Record<string, string>;
    objectNotation?: boolean;
    staticCatalog?: Record<string, any>;
    logDebugFn?: (msg: string) => void;
    logWarnFn?: (msg: string) => void;
    logErrorFn?: (msg: string) => void;
  }

  export class I18n {
    constructor();
    configure(options: I18nOptions): void;
    setLocale(locale: string): void;
    getLocale(): string;
    __(key: string, params?: Record<string, any>): string;
  }
}
