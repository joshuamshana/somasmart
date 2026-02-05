import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/shared/i18n/locales/en.json";
import sw from "@/shared/i18n/locales/sw.json";

const saved = localStorage.getItem("somasmart.locale");

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, sw: { translation: sw } },
  lng: saved ?? "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

i18n.on("languageChanged", (lng) => localStorage.setItem("somasmart.locale", lng));

export default i18n;

