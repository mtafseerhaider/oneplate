import { describe, it, expect } from "vitest";
import { mealCalc, handLine, BASE_MEALS, resolveMeals, qtyStr, memberPortions, cookQuantities, stageOf, portionFactor, assertChildUnrestricted, hijriOf, hijriLabel, sunnahFast, fastingTimes, prayerTimes, CITIES, phaseFor, weekNo, strengthUnlocked, sessionFor, maintenance, qIndex, mizanVol, doneCount, streak, wholeSelf, type Member } from "../src/index.js";
const fmt = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });
const fam: Member[] = [
  { id: "tafseer", name: "Tafseer", rel: "me", role: "adult", sex: "male", goal: "fat_loss", dob: "1988-02-05" },
  { id: "uzma", name: "Uzma", rel: "wife", role: "adult", sex: "female", goal: "maintain", dob: "1993-02-03" },
  { id: "abbas", name: "Abbas", rel: "son", role: "child", sex: "male", goal: "growth", dob: "2019-02-09" },
  { id: "eliyya", name: "Eliyya", rel: "daughter", role: "child", sex: "female", goal: "growth", dob: "2022-09-18" }];
const today = new Date("2026-11-04T12:00:00");
describe("meals", () => {
  it("computes the steak plate", () => { const m = BASE_MEALS.find(x => x.id === "steak")!; expect(mealCalc(m)).toEqual({ kcal: 540, p: 74, c: 22, f: 15 }); expect(handLine(m)).toBe("2 palms grilled chicken breast · ½ bowl daal · 1 bowl raita"); });
  it("applies overrides and custom meals", () => { const l = resolveMeals({ karahi: { deleted: true }, c_x: { id: "c_x", n: "Custom", tag: "other", items: [{ f: "egg", q: 2 }] } }); expect(l.find(m => m.id === "karahi")).toBeUndefined(); expect(l.find(m => m.id === "c_x")?.base).toBe(false); });
  it("formats quantities", () => { expect(qtyStr(0.5)).toBe("½"); expect(qtyStr(1.75)).toBe("1 ¾"); expect(qtyStr(2)).toBe("2"); });
});
describe("family", () => {
  it("stages and factors by age", () => { expect(stageOf(fam[2]!, today)).toBe("child"); expect(stageOf(fam[3]!, today)).toBe("child"); expect(portionFactor(fam[2]!, today)).toBe(0.5); expect(portionFactor(fam[0]!, today)).toBe(1); });
  it("portions and cook quantities round up", () => { const m = BASE_MEALS.find(x => x.id === "pulao")!; expect(memberPortions(m, fam[2]!, today)[0]).toBe("1 palm chicken (leg or thigh)"); expect(cookQuantities(m, fam, today)[0]).toBe("6 palms chicken (leg or thigh)"); });
  it("never restricts a child", () => { expect(() => assertChildUnrestricted({ ...fam[2]!, targetWeight: 20 } as any)).toThrow(); expect(() => assertChildUnrestricted(fam[2]!)).not.toThrow(); });
});
describe("islamic", () => {
  it("hijri dates", () => { const h = hijriOf("2026-11-04"); expect(hijriLabel(h)).toBe("24 Jumada al-Ula 1448"); expect(hijriOf("2027-02-08").month).toBe(9); });
  it("sunnah fast days", () => { expect(sunnahFast("2026-11-05")?.k).toBe("monthu"); expect(sunnahFast("2026-11-23")?.k).toBe("bid"); expect(sunnahFast("2027-02-20")).toBeNull(); expect(sunnahFast("2026-11-05", "shia")).toBeNull(); });
  it("prayer times match published Karachi and Lahore timetables to the minute band", () => {
    const k = fastingTimes("2026-11-04", "karachi")!; expect(fmt(k.fajr)).toBe("05:23"); expect(fmt(k.maghrib)).toBe("17:50");
    const l = fastingTimes("2026-11-04", "lahore")!; expect(fmt(l.fajr)).toBe("04:58"); expect(fmt(l.maghrib)).toBe("17:11");
    expect(prayerTimes("2026-06-21", 60, 20)).not.toBeNull(); expect(prayerTimes("2026-06-21", 70, 20)).toBeNull(); expect(Object.keys(CITIES).length).toBe(11); });
});
describe("plan", () => {
  it("phases, weeks and unlock", () => { expect(phaseFor(1).n).toBe("Beginner"); expect(phaseFor(9).n).toBe("Intervals"); expect(weekNo("2026-10-14", "2026-11-04")).toBe(4); expect(strengthUnlocked(84, 79)).toBe(true); expect(strengthUnlocked(84, 80)).toBe(false); expect(sessionFor(1, false).k).toBe("cycle"); expect(sessionFor(1, true).k).toBe("strength"); });
  it("maintenance for the plan's subject", () => { const m = maintenance(84, 175, 38, "male"); expect(m.bmr).toBe(1749); expect(m.sedentary).toBeGreaterThan(2100); });
});
describe("quran", () => {
  it("course index wraps", () => { expect(qIndex("2026-11-04", "2026-11-04", 67)).toBe(0); expect(qIndex("2026-11-04", "2027-01-10", 67)).toBe(0); expect(qIndex("2026-11-04", "2026-11-03", 67)).toBe(66); });
  it("maps every surah to an English al-Mizan volume", async () => { const { MIZAN_EN } = await import("@oneplate/content"); for (let s = 1; s <= 114; s++) expect(mizanVol(MIZAN_EN as any, s, 1)).not.toBeNull(); expect(mizanVol(MIZAN_EN as any, 2, 255)!.vol).toBe(4); expect(mizanVol(MIZAN_EN as any, 33, 33)!.vol).toBe(32); });
});
describe("wellbeing", () => {
  it("scores a day", () => { const d = { date: "2026-11-04", water: 4, palms: 4, starter: true, train: true, walk: true, steps: true, closed: true, mood: 4, grat: "x", learn: { tafseer: true }, circle: true }; expect(doneCount(d)).toBe(7); expect(wholeSelf(d, "tafseer", false).score).toBe(4); });
  it("streaks count consecutive closed kitchens", () => { expect(streak({ "2026-11-03": { date: "2026-11-03", closed: true }, "2026-11-02": { date: "2026-11-02", closed: true } }, "2026-11-04")).toBe(2); });
});
