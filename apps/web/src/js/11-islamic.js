/* ---------- Hijri calendar, Sunnah fast days, prayer times: thin wrappers over @oneplate/core (which reads nothing from app state) ---------- */
function hijriOf(dateStr){return core.hijriOf(dateStr,Number((S.settings||{}).hijriOffset||0))}
function sunnahFast(dateStr){return core.sunnahFast(dateStr,(S.settings||{}).tradition||"sunni",Number((S.settings||{}).hijriOffset||0))}
function fastingTimes(dateStr){return core.fastingTimes(dateStr,(S.settings||{}).city||"karachi")}
function ramadanActive(){const mode=(S.settings||{}).ramadan||"auto";if(mode==="on")return true;if(mode==="off")return false;return core.isRamadan(todayStr(),Number((S.settings||{}).hijriOffset||0))}
