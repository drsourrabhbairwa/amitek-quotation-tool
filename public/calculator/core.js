/* Amitek Waterproofing Budget Calculator — shared defaults and maths.
   Used by index.html (the public calculator) and admin.html (rate editor).
   Every number and text here is only a starting value: the live values come
   from the calculator_config row in Supabase, edited from admin.html.
   Rates are per sq.ft, supply + application (material + labour), GST extra. */
(function (root) {
  'use strict';

  var DEFAULTS = {
    version: 1,
    company: 'Amitek Waterproofing Solutions',
    whatsapp: '919352850707',
    phone: '+91 93528 50707',
    email: 'sales@amitekinfra.com',
    gstPercent: 18,
    minArea: 50,
    minJobCharge: 15000,
    showRange: true, // false = show only the maximum figure
    footnote: 'Indicative budget for supply + application by Amitek. GST extra. Final price is confirmed after a free site inspection, as it depends on the surface condition, access, height and location.',
    surfaces: [
      {
        key: 'terrace', label: 'Terrace / Roof', icon: 'roof', helper: 'terrace',
        blurb: 'Open roof exposed to sun and rain',
        system: 'AMITEK Waterproofing System-1 (Sun-exposed, no tile)',
        rates: { fresh: [55, 75], repair: [70, 95] },
        problems: ['Leakage into the room below', 'Cracks on the roof', 'Water stands after rain', 'Damp patches on ceiling'],
        steps: ['Clean the roof, remove loose plaster and old coatings', 'Open and fill cracks with polymer repair mortar', 'Make coving at the parapet joints', 'Prime the surface', 'Two coats of elastomeric waterproof membrane with fibre mesh at joints', 'UV-resistant top coat'],
        notes: 'Removing old tiles, brick bat coba or screed is not included.',
      },
      {
        key: 'bathroom', label: 'Bathroom / Toilet', icon: 'bath', helper: 'bathroom',
        blurb: 'Floor and lower walls, under the tiles',
        system: 'AMITEK Waterproofing System-2 (Under-tile)',
        rates: { fresh: [60, 80], repair: [85, 120] },
        problems: ['Leakage into the room below', 'Dampness on the wall outside', 'Seepage near the floor trap', 'Tile joints leaking'],
        steps: ['Clean the base and seal pipe joints and floor traps', 'Coving at floor–wall corners', 'Prime the surface', 'Two coats of flexible cementitious waterproofing up the walls', 'Ponding test for 24 hours before tiling'],
        notes: 'Breaking old tiles, new tiles and plumbing are not included.',
      },
      {
        key: 'exterior', label: 'Exterior Walls', icon: 'wall', helper: 'wall',
        blurb: 'Outside walls facing rain',
        system: 'AMITEK HWR-22 + CMP-78 (Nano-pore water repellent)',
        rates: { fresh: [28, 40], repair: [38, 55] },
        problems: ['Damp patches inside after rain', 'Hairline cracks on the wall', 'Paint peeling or fungus', 'Water marks on the wall'],
        steps: ['Clean the wall and remove fungus and loose paint', 'Fill cracks with flexible crack filler', 'Apply CMP-78 bonding primer and porosity filler', 'Two coats of HWR-22 nano-pore water repellent'],
        notes: 'Scaffolding above two floors is quoted separately.',
      },
      {
        key: 'interior', label: 'Damp Interior Walls', icon: 'damp', helper: 'wall',
        blurb: 'Dampness, salt or peeling paint inside',
        system: 'AMITEK Smart Duo Shield Dampproof',
        rates: { fresh: [30, 45], repair: [45, 65] },
        problems: ['Rising damp at the bottom of walls', 'White salt marks', 'Paint bubbling or peeling', 'Musty smell'],
        steps: ['Scrape off loose paint and putty down to sound plaster', 'Treat salt and fungus', 'Two coats of fibre-reinforced Dampproof barrier', 'Ready for putty and paint'],
        notes: 'Repainting after treatment is not included.',
      },
      {
        key: 'tank', label: 'Water Tank', icon: 'tank', helper: 'box',
        blurb: 'Overhead or underground concrete tank',
        system: 'AMITEK Waterproofing System-2 (Water tank)',
        rates: { fresh: [65, 85], repair: [85, 115] },
        problems: ['Tank is leaking', 'Wet patches outside the tank', 'Cracks inside the tank', 'Water level drops'],
        steps: ['Empty and clean the tank', 'Seal pipe inlets and cracks', 'Coving at all inner corners', 'Two coats of potable-water-safe cementitious waterproofing', 'Cure and fill test before use'],
        notes: 'Tank must be emptied and dry before work starts.',
      },
      {
        key: 'basement', label: 'Basement', icon: 'basement', helper: 'box',
        blurb: 'Below-ground walls and floor',
        system: 'AMITEK Waterproofing System-2 (Basement, negative side)',
        rates: { fresh: [70, 95], repair: [95, 130] },
        problems: ['Water seeping through walls', 'Damp floor', 'Leaking construction joints', 'Water collects after rain'],
        steps: ['Clean and open active leaks and joints', 'Plug active leaks and fill joints', 'Coving at floor–wall joints', 'Crystalline / cementitious waterproofing coats', 'Protection screed where needed'],
        notes: 'Heavy active water ingress may need injection grouting, quoted after inspection.',
      },
      {
        key: 'pool', label: 'Swimming Pool', icon: 'pool', helper: 'box',
        blurb: 'Pool shell before tiles or as finish',
        system: 'AMITEK Waterproofing System-3 (Swimming pool / PU)',
        rates: { fresh: [140, 190], repair: [170, 230] },
        problems: ['Water level keeps dropping', 'Cracks or hollow tiles', 'Damp areas around the pool', 'New pool construction'],
        steps: ['Drain, clean and grind the pool shell', 'Repair cracks and honeycombing', 'Prime', 'PU / hybrid waterproof membrane in two coats', 'Fill test before tiling'],
        notes: 'Pool tiles, plant room and plumbing are not included.',
      },
    ],
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /** Live config = defaults, overlaid with whatever admin saved (surface by key). */
  function mergeConfig(saved) {
    var cfg = clone(DEFAULTS);
    if (!saved || typeof saved !== 'object') return cfg;
    Object.keys(saved).forEach(function (k) { if (k !== 'surfaces' && saved[k] !== undefined && saved[k] !== null) cfg[k] = saved[k]; });
    if (Array.isArray(saved.surfaces)) {
      cfg.surfaces = cfg.surfaces.map(function (s) {
        var o = saved.surfaces.filter(function (x) { return x && x.key === s.key; })[0];
        return o ? Object.assign({}, s, o, { rates: Object.assign({}, s.rates, o.rates || {}) }) : s;
      });
      saved.surfaces.forEach(function (o) { // surfaces added in admin
        if (o && o.key && !cfg.surfaces.some(function (s) { return s.key === o.key; })) cfg.surfaces.push(o);
      });
    }
    cfg.surfaces = cfg.surfaces.filter(function (s) { return !s.hidden; });
    return cfg;
  }

  var n = function (v) { var x = parseFloat(v); return isFinite(x) && x > 0 ? x : 0; };

  /** Area to treat, in sq.ft, from what the visitor typed. */
  function areaFrom(helper, d) {
    d = d || {};
    if (d.mode !== 'size') return n(d.sqft);
    var L = n(d.l), B = n(d.b), H = n(d.h);
    if (helper === 'terrace') return L * B + 2 * (L + B) * (H || 1);          // roof + parapet upturn (default 1 ft)
    if (helper === 'bathroom') return L * B + 2 * (L + B) * (H || 1.5);       // floor + walls up to height (default 1.5 ft)
    if (helper === 'box') return L * B + 2 * (L + B) * H;                     // floor + four walls (tank, basement, pool)
    if (helper === 'wall') return L * H;                                      // wall length × height
    return L * B;
  }

  /** { area, min, max, rateMin, rateMax, minCharged } — rupees, rounded to the next ₹500. */
  function estimate(cfg, surfaceKey, project, area) {
    var s = cfg.surfaces.filter(function (x) { return x.key === surfaceKey; })[0];
    if (!s || !(area > 0)) return null;
    var r = (s.rates && s.rates[project]) || s.rates.fresh;
    var lo = n(r[0]), hi = Math.max(n(r[1]), lo);
    var floor = n(cfg.minJobCharge);
    var up = function (v) { return Math.ceil(v / 500) * 500; };
    var min = Math.max(up(area * lo), floor), max = Math.max(up(area * hi), floor);
    return { area: Math.round(area), min: min, max: max, rateMin: lo, rateMax: hi, minCharged: area * hi < floor, surface: s };
  }

  function inr(v) { return '₹' + Math.round(v).toLocaleString('en-IN'); }

  var api = { DEFAULTS: DEFAULTS, mergeConfig: mergeConfig, areaFrom: areaFrom, estimate: estimate, inr: inr };
  root.AmkCalc = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
