// Builds the two language versions of the site from one source.
//
//   Turkish  -> the pages in the site root (index.html, studio.html, ...)
//   English  -> the same pages under /en/
//
// Texts come from the `translations` table in js/main.js (keys in data-i18n
// attributes). Page titles and descriptions live in PAGE_META below.
//
// Run after changing any text or page:   node tools/build-i18n.mjs
// The script is idempotent: it reads the root pages, rewrites every data-i18n
// element for each language, and writes both versions again.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = 'https://eduxperts.com.tr';
const PAGES = ['index.html', 'studio.html', 'courses.html', 'news.html', 'course-details.html'];

const PAGE_META = {
  'index.html': {
    tr: { title: 'EduXperts — Eğitim Teknolojisi ve Yazılım Şirketi',
          desc: 'Eğitim kurumları ve şirketler için web, mobil ve yapay zekâ yazılımları, LMS ve oyunlaştırma çözümleri. Kendi ürünlerini de yayında tutan bir yazılım şirketi.' },
    en: { title: 'EduXperts — Education Technology and Software Company',
          desc: 'Web, mobile and AI software, LMS and gamification for schools, training providers and companies. A software company that runs its own live products.' },
  },
  'studio.html': {
    tr: { title: 'EduXperts Game Studio · Mobil Oyunlar',
          desc: 'EduXperts Game Studio: 1750 bölümlük tekne bulmacası Marina Rush, Pizza Run ve Pixel Art Club. App Store ve Google Play\'de.' },
    en: { title: 'EduXperts Game Studio · Mobile Games',
          desc: 'EduXperts Game Studio: Marina Rush, a boat-jam puzzle with 1750 levels, plus Pizza Run and Pixel Art Club. On the App Store and Google Play.' },
  },
  'courses.html': {
    tr: { title: 'Eğitimler ve Kurslar — EduXperts',
          desc: 'Kurumlar için iş dünyası eğitimleri ve eğitim sektörü için Erasmus+ KA1 kursları.' },
    en: { title: 'Training & Courses — EduXperts',
          desc: 'Business skills training and Erasmus+ KA1 courses for the education sector, from EduXperts.' },
  },
  'news.html': {
    tr: { title: 'Haberler — EduXperts',
          desc: 'Ürün lansmanları, Erasmus+ proje toplantıları, saha ziyaretleri ve eğitimlerden haberler.' },
    en: { title: 'News & Updates — EduXperts',
          desc: 'Product launches, Erasmus+ project meetings, industrial visits, and training sessions from EduXperts.' },
  },
  'course-details.html': {
    tr: { title: 'Eğitim Detayları — EduXperts',
          desc: 'İş dünyası ve Erasmus+ eğitimlerimizin içerik, süre ve kazanım detayları.' },
    en: { title: 'Course Details — EduXperts',
          desc: 'Business and Erasmus+ training course details from EduXperts.' },
  },
};

// ---------- load the text tables from js/main.js ----------
const mainJs = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
function grabObject(name) {
  const start = mainJs.indexOf(`const ${name} = {`);
  if (start < 0) throw new Error(`${name} not found in main.js`);
  let i = mainJs.indexOf('{', start), depth = 0, inStr = null;
  for (; i < mainJs.length; i++) {
    const c = mainJs[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) break;
  }
  return vm.runInNewContext('(' + mainJs.slice(mainJs.indexOf('{', start), i + 1) + ')');
}
const T = grabObject('translations');
const BOT = grabObject('botAnswers');

// ---------- small HTML helpers (no DOM library needed) ----------
// Replace the inner HTML of every element that carries data-i18n="key".
function fillI18n(html, dict, missing) {
  const re = /<([a-zA-Z0-9]+)\b([^>]*?)\sdata-i18n="([^"]+)"([^>]*)>/g;
  let out = '', last = 0, m;
  while ((m = re.exec(html))) {
    const [open, tag, , key] = m;
    const innerStart = m.index + open.length;
    // find the matching close tag, counting nested tags of the same name
    const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    tagRe.lastIndex = innerStart;
    let depth = 1, t, innerEnd = -1;
    while ((t = tagRe.exec(html))) {
      if (t[0].endsWith('/>')) continue;
      depth += t[1] ? -1 : 1;
      if (depth === 0) { innerEnd = t.index; break; }
    }
    if (innerEnd < 0) continue;
    out += html.slice(last, innerStart);
    if (dict[key] !== undefined) out += dict[key];
    else { missing.add(key); out += html.slice(innerStart, innerEnd); }
    last = innerEnd;
    re.lastIndex = innerEnd;
  }
  return out + html.slice(last);
}

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const strip = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function setMeta(html, page, lang) {
  const meta = PAGE_META[page][lang];
  const url = SITE + (lang === 'en' ? '/en/' : '/') + (page === 'index.html' ? '' : page);
  const trUrl = SITE + '/' + (page === 'index.html' ? '' : page);
  const enUrl = SITE + '/en/' + (page === 'index.html' ? '' : page);
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*/, `$1${esc(meta.desc)}`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(meta.title)}`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(meta.desc)}`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${esc(meta.title)}`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${esc(meta.desc)}`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`);
  // language alternates (one managed block)
  html = html.replace(/\n?<!-- i18n:alternates -->[\s\S]*?<!-- \/i18n:alternates -->/, '');
  const alt = `\n<!-- i18n:alternates -->\n<meta property="og:locale" content="${lang === 'tr' ? 'tr_TR' : 'en_US'}" />\n` +
    `<link rel="alternate" hreflang="tr" href="${trUrl}" />\n<link rel="alternate" hreflang="en" href="${enUrl}" />\n` +
    `<link rel="alternate" hreflang="x-default" href="${trUrl}" />\n<!-- /i18n:alternates -->`;
  html = html.replace(/(<link rel="canonical"[^>]*>)/, `$1${alt}`);
  return html;
}

// TR/EN switch: links to the same page in the other language
function setLangSwitch(html, page, lang) {
  const file = page === 'index.html' ? '' : page;
  const href = { tr: lang === 'tr' ? './' + file : '../' + file, en: lang === 'en' ? './' + file : 'en/' + file };
  if (href.tr === './') href.tr = './';
  return html.replace(/<(?:button|a) class="lang-btn[^"]*" data-lang="(tr|en)"[^>]*>(TR|EN)<\/(?:button|a)>/g,
    (_, l, label) => `<a class="lang-btn${l === lang ? ' active' : ''}" data-lang="${l}" href="${href[l] || './'}" hreflang="${l}" lang="${l}">${label}</a>`);
}

// FAQ structured data on the home page, in the page's language
function setFaq(html, lang) {
  const dict = T[lang], ans = BOT[lang];
  const items = [1, 2, 3, 4, 5].filter(n => dict['bot-q' + n] && ans['q' + n]).map(n => ({
    '@type': 'Question', name: strip(dict['bot-q' + n]),
    acceptedAnswer: { '@type': 'Answer', text: strip(ans['q' + n]) },
  }));
  const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items }, null, 2);
  return html.replace(/<script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "FAQPage"[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${json}\n</script>`);
}

// Pages under /en/ sit one folder deeper: point shared files back to the root
const LOCAL_PAGES = new Set(PAGES);
function rebaseForEn(html) {
  const fix = url => {
    if (/^(https?:|mailto:|tel:|data:|#|\/|\.\.\/|\.\/|javascript:)/.test(url) || url === '') return url;
    const file = url.split(/[?#]/)[0];
    if (LOCAL_PAGES.has(file)) return url;          // translated page: stay inside /en/
    return '../' + url;                              // assets, css, js, other folders
  };
  html = html.replace(/\b(src|href|poster|action)="([^"]*)"/g, (m, attr, url) => `${attr}="${fix(url)}"`);
  html = html.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, url) => `url(${q}${fix(url)}${q})`);
  return html;
}

// ---------- build ----------
const missing = new Set();
fs.mkdirSync(path.join(ROOT, 'en'), { recursive: true });
for (const page of PAGES) {
  const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
  for (const lang of ['tr', 'en']) {
    let html = fillI18n(src, T[lang], missing);
    html = setMeta(html, page, lang);
    html = setLangSwitch(html, page, lang);
    if (page === 'index.html') html = setFaq(html, lang);
    if (lang === 'en') html = rebaseForEn(html);
    fs.writeFileSync(path.join(ROOT, lang === 'en' ? 'en' : '', page), html);
  }
  console.log('built', page, '+ en/' + page);
}
if (missing.size) console.warn('keys missing in translations:', [...missing].join(', '));
