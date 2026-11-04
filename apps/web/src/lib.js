/* Bundled by esbuild into the app: exposes @oneplate/core and @oneplate/content as the globals the interface uses. */
import * as core from "@oneplate/core";
import * as content from "@oneplate/content";
Object.assign(globalThis, { core, content,
  UNITS: core.UNITS, FOODS: core.FOODS, BASE_MEALS: core.BASE_MEALS, normItems: core.normItems, mealCalc: core.mealCalc, qtyStr: core.qtyStr, portion: core.portion, hands: core.hands, handLine: core.handLine,
  CYCLE: core.CYCLE, PLAN0: core.PLAN_LOCKED, PLAN1: core.PLAN_FULL, HIJRI_MONTHS: core.HIJRI_MONTHS, CITIES: core.CITIES, prayerTimes: core.prayerTimes, hijriLabel: core.hijriLabel, roundUpQ: core.roundUpQ, ageOf: core.ageOf, doneCount: core.doneCount,
  VERSES: content.VERSES, SURAHS: content.SURAHS, STORIES: content.STORIES, TEACHINGS: content.TEACHINGS, WORDS: content.WORDS, IDEAS: content.IDEAS, BOOKS: content.BOOKS, DUAS: content.DUAS, POEMS: content.POEMS, QPLAN: content.QPLAN, FAST: content.FAST, QUESTIONS: content.QUESTIONS, THEMES: content.THEMES, KID_Q: content.KID_QUESTIONS, MIZAN_EN: content.MIZAN_EN, G: content.GLOSSARY, UR: content.UR });
