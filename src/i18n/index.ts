import tr, { type TranslationKeys } from "./tr";

type NestedKeyOf<T> = T extends string
  ? ""
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${NestedKeyOf<T[K]>}`;
    }[keyof T & string];

type TranslationKey = NestedKeyOf<TranslationKeys>;

const translations: Record<string, TranslationKeys> = {
  tr,
};

let currentLocale = "tr";

export function setLocale(locale: string) {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

export function t(key: TranslationKey): string {
  const keys = key.split(".");
  let value: unknown = translations[currentLocale];

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}

export function getLocale(): string {
  return currentLocale;
}
