/* ---------- icons ---------- */
const ICONS={
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
plate:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/>',
bike:'<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-8h5l3 8M10 8h-3M13 8l2.5 4H9"/>',
trend:'<path d="M3 17l5-6 4 3 5-7 4 4"/><path d="M17 7h4v4"/>',
book:'<path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
flame:'<path d="M12 3s5 4 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 1-5.5 1-8.5z"/>',
lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
chev:'<path d="M9 6l6 6-6 6"/>',
walk:'<circle cx="13" cy="4" r="1.5"/><path d="M10 21l2-6 3 2v4M8 13l2-5 4 1 2 3 3 1M10 8l-3 5"/>',
moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
egg:'<path d="M12 3c4 0 7 5.5 7 10a7 7 0 0 1-14 0c0-4.5 3-10 7-10z"/>',
bed:'<path d="M3 18V8M3 12h18v6M3 15h18M7 12V9h5v3"/>',
foot:'<path d="M4 20l16-16M9 11l4 4"/>',
scale:'<path d="M12 3v3M5 7h14M7 7l-3 7a3 3 0 0 0 6 0L7 7zM17 7l-3 7a3 3 0 0 0 6 0l-3-7zM9 21h6M12 6v15"/>',
dumbbell:'<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
bolt:'<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
home:'<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
coffee:'<path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2M7 5v2M10 4v3M13 5v2"/>',
rest:'<path d="M4 12h16M12 4v16"/>',
family:'<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3 19a6 6 0 0 1 12 0M14.5 19a4.5 4.5 0 0 1 6.5-4"/>'
};
function ic(n,cls){return `<svg class="ic ${cls||""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||""}</svg>`}
const KIND_ICON={cycle:"bike",strength:"dumbbell",easy:"walk",rest:"moon"};

