// Satzo — Akış sayfası: katalogdaki videolardan kısa klipler, dikey kart düzeninde art arda.
// Her klip: altyazıyla izle (bilmediğin kelimeye dokun) → bir cümleyi duyduğun gibi yaz → sonraki klip.
// Video, YouTube'un gömülü oynatıcısında kendi kontrolleriyle oynar; altyazıyı ve zamanı oynatıcının içindeki Satzo betiği iletir.
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const store = chrome.storage.local;
  const DAY = 864e5, EARLY = 3 * 3600e3;
  const FEED_MIN = 30, FEED_TARGET = 40, FEED_MAX = 70, FEED_TAIL = 20, QUIZ_EVERY = 5;
  const XP_CLIP = 10, XP_FIRST = 10, XP_WORD = 2;

  // ---------- Dil ----------
  const UI = (() => { let l = 'en'; try { l = chrome.i18n.getUILanguage() || navigator.language; } catch (e) {} l = String(l).slice(0, 2).toLowerCase(); return ['tr', 'en', 'de'].includes(l) ? l : 'en'; })();
  const T = {
    tr: {
      title: 'Kısa klipler, hızlı tekrarlar', lead: 'Her klip yarım dakika ile bir dakika arası. İzle, bilmediğin kelimeye dokun, kaydır. 5 klipte bir işaretlediğin kelimelerden kısa bir sınav gelir.',
      level: 'Seviye', all: 'Tümü', goal: 'Günlük hedef', clips: '{0} klip', start: 'Başla', cont: 'Devam et',
      streak: 'gün seri', today: 'bugün', words: 'kelime', xp: 'puan', loading: 'Klip hazırlanıyor…', ad: 'Reklam bitince klip başlayacak',
      nocap: 'Bu videoda altyazı yok, sonrakine geçiliyor.', empty: 'Bu seviyede yeni klip kalmadı. Seviyeyi değiştirmeyi dene.',
      openYT: "YouTube'da aç", tapHint: 'Bilmediğin kelimeye dokun', replay: 'Cümleyi tekrar dinle', skip: 'Atla',
      write: 'Duyduğunu yaz', writePh: 'Cümleyi yaz, Enter', listen: 'Tekrar dinle', slow: 'Yavaş dinle', hintB: 'İpucu', show: 'Göster',
      right: 'Doğru!', almost: 'Neredeyse. Kırmızılar yanlış, sarılar eksik.', shown: 'Cevap bu. Bir dahakine!', first: 'İlk denemede',
      next: 'Sonraki klip', wait: 'Bekle', swipe: 'kaydır ya da ↓', clipDone: 'Klip tamam', newWords: '{0} yeni kelime',
      sameVid: 'Haberin devamı', quizT: 'Kelime turu', quizL: 'Son kliplerde işaretlediğin kelimeler.', quizGo: 'Başla', quizSkip: 'Sonra',
      qMean: 'Bu cümlede ne demek?', qType: '“{0}” anlamına gelen kelimeyi yaz', dunno: 'Hatırlamıyorum', qDone: '{0} kelime tekrar listende. İlk tekrar yarın.',
      goalT: 'Bugünkü hedef tamam', goalL: '{0} klip, {1} puan. Serin {2} gün oldu.', goalMore: 'Biraz daha', goalStop: 'Bugünlük yeter',
      speedT: 'Hız: {0}', speedH: 'Oynatma hızı (− / + tuşları)', tapped: 'Bu klipte işaretlediklerin', none: 'Bu klipte kelime işaretlemedin.', resumeIn: 'Devam etmek için Boşluk', resumeTap: 'devam için buraya dokun', swipeT: 'yukarı kaydır', quizNow: 'Seans sonu: kelime sınavı',
      prep: 'Telefon için altyazıları hazırla', prepT: 'Altyazılar hazırlanıyor', prepL: '{0}/{1} video hazır · {2} alınamadı', prepDone: 'Hazır. data.json indirildi.', prepDl: 'data.json indir', prepStop: 'Durdur', tapVideo: 'Başlatmak için videoya dokun',
      trBtn: 'Çeviri', back: 'Kelimelerim', ofGoal: '{0}/{1}', reviewDue: '{0} kelimenin tekrar zamanı geldi'
    },
    en: {
      title: 'Short clips, quick reps', lead: 'Each clip is half a minute to a minute. Watch, tap words you don’t know, swipe. Every 5 clips there’s a short quiz on the words you marked.',
      level: 'Level', all: 'All', goal: 'Daily goal', clips: '{0} clips', start: 'Start', cont: 'Continue',
      streak: 'day streak', today: 'today', words: 'words', xp: 'points', loading: 'Getting the clip ready…', ad: 'The clip starts after the ad',
      nocap: 'This video has no subtitles, moving on.', empty: 'No new clips left at this level. Try another level.',
      openYT: 'Open on YouTube', tapHint: 'Tap a word you don’t know', replay: 'Replay the sentence', skip: 'Skip',
      write: 'Write what you hear', writePh: 'Type the sentence, Enter', listen: 'Listen again', slow: 'Listen slowly', hintB: 'Hint', show: 'Show',
      right: 'Correct!', almost: 'Almost. Red is wrong, yellow is missing.', shown: 'Here’s the answer. Next time!', first: 'First try',
      next: 'Next clip', wait: 'Wait', swipe: 'swipe or ↓', clipDone: 'Clip done', newWords: '{0} new words',
      sameVid: 'More of this story', quizT: 'Word round', quizL: 'Words you tapped in the last clips.', quizGo: 'Start', quizSkip: 'Later',
      qMean: 'What does it mean here?', qType: 'Type the word that means “{0}”', dunno: 'I don’t remember', qDone: '{0} words are in your review list. First review tomorrow.',
      goalT: 'Today’s goal reached', goalL: '{0} clips, {1} points. Your streak is {2} days.', goalMore: 'A few more', goalStop: 'Enough for today',
      speedT: 'Speed: {0}', speedH: 'Playback speed (− / + keys)', tapped: 'Words you marked in this clip', none: 'You didn’t mark any words in this clip.', resumeIn: 'Press Space to continue', resumeTap: 'tap here to continue', swipeT: 'swipe up', quizNow: 'End of session: word quiz',
      prep: 'Prepare subtitles for the phone', prepT: 'Preparing subtitles', prepL: '{0}/{1} videos ready · {2} failed', prepDone: 'Done. data.json downloaded.', prepDl: 'Download data.json', prepStop: 'Stop', tapVideo: 'Tap the video to start',
      trBtn: 'Translation', back: 'My words', ofGoal: '{0}/{1}', reviewDue: '{0} words are due for review'
    },
    de: {
      title: 'Kurze Clips, schnelle Wiederholung', lead: 'Jeder Clip dauert eine halbe bis eine Minute. Ansehen, unbekannte Wörter antippen, weiterwischen. Alle 5 Clips gibt es ein kurzes Quiz zu deinen markierten Wörtern.',
      level: 'Niveau', all: 'Alle', goal: 'Tagesziel', clips: '{0} Clips', start: 'Los', cont: 'Weiter',
      streak: 'Tage in Folge', today: 'heute', words: 'Wörter', xp: 'Punkte', loading: 'Clip wird vorbereitet…', ad: 'Der Clip startet nach der Werbung',
      nocap: 'Dieses Video hat keine Untertitel, weiter zum nächsten.', empty: 'Auf diesem Niveau gibt es keine neuen Clips. Versuch ein anderes Niveau.',
      openYT: 'Auf YouTube öffnen', tapHint: 'Tippe unbekannte Wörter an', replay: 'Satz noch einmal', skip: 'Überspringen',
      write: 'Schreib, was du hörst', writePh: 'Satz schreiben, Enter', listen: 'Noch einmal', slow: 'Langsam hören', hintB: 'Tipp', show: 'Zeigen',
      right: 'Richtig!', almost: 'Fast. Rot ist falsch, Gelb fehlt.', shown: 'Das ist die Lösung. Nächstes Mal!', first: 'Beim ersten Versuch',
      next: 'Nächster Clip', wait: 'Warten', swipe: 'wischen oder ↓', clipDone: 'Clip fertig', newWords: '{0} neue Wörter',
      sameVid: 'Weiter mit dieser Meldung', quizT: 'Wörterrunde', quizL: 'Wörter, die du in den letzten Clips angetippt hast.', quizGo: 'Los', quizSkip: 'Später',
      qMean: 'Was bedeutet das hier?', qType: 'Schreib das Wort für „{0}“', dunno: 'Weiß ich nicht', qDone: '{0} Wörter sind in deiner Wiederholung. Erste Wiederholung morgen.',
      goalT: 'Tagesziel geschafft', goalL: '{0} Clips, {1} Punkte. Deine Serie: {2} Tage.', goalMore: 'Noch ein paar', goalStop: 'Genug für heute',
      speedT: 'Tempo: {0}', speedH: 'Wiedergabetempo (Tasten − / +)', tapped: 'In diesem Clip markiert', none: 'In diesem Clip hast du keine Wörter markiert.', resumeIn: 'Leertaste zum Weitermachen', resumeTap: 'zum Weitermachen hier tippen', swipeT: 'nach oben wischen', quizNow: 'Ende der Runde: Wörterquiz',
      prep: 'Untertitel fürs Handy vorbereiten', prepT: 'Untertitel werden vorbereitet', prepL: '{0}/{1} Videos fertig · {2} fehlgeschlagen', prepDone: 'Fertig. data.json heruntergeladen.', prepDl: 'data.json herunterladen', prepStop: 'Stopp', tapVideo: 'Tippe auf das Video, um zu starten',
      trBtn: 'Übersetzung', back: 'Meine Wörter', ofGoal: '{0}/{1}', reviewDue: '{0} Wörter sind zur Wiederholung fällig'
    }
  };
  const t = (k, ...a) => String((T[UI] && T[UI][k]) || T.en[k] || k).replace(/\{(\d)\}/g, (m, i) => a[i] != null ? a[i] : '');
  document.documentElement.lang = UI;

  // ---------- Durum ----------
  const settings = { srcLang: 'de', tgtLang: UI === 'de' ? 'en' : UI };
  let WD = { items: {} }, ST = { days: {} };
  let FD = { on: false, lvl: '', seen: {}, n: 0, sinceQ: 0, day: '', today: 0, xp: 0, xpDay: 0, goal: 10, goalShown: '' };
  let CAT = [];
  const C = { clip: null, cues: [], a: 0, b: 0, phase: 'idle', t: 0, ad: false, frame: null, card: null, marked: new Set(), target: -1, tries: 0, hints: 0, shown: false, trOn: false, timer: null, xpGot: 0, newW: 0 };
  const params = new URLSearchParams(location.search);
  if (params.get('lang')) settings.srcLang = params.get('lang');

  const todayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const saveFeed = () => store.set({ dyFeed: FD });
  function rollDay() { const d = new Date().toDateString(); if (FD.day !== d) { FD.day = d; FD.today = 0; FD.xpDay = 0; } }
  function streak() {
    const has = k => { const d = ST.days[k]; return !!d && ((d.ok || 0) + (d.shown || 0) + (d.rev || 0) + (d.clip || 0)) > 0; };
    const d = new Date(); let n = 0;
    if (!has(todayKey(d))) d.setDate(d.getDate() - 1);
    while (has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function bump(field) {
    store.get('dyStats', r => {
      ST = (r && r.dyStats) || { days: {} }; ST.days = ST.days || {};
      const k = todayKey(), d = ST.days[k] || (ST.days[k] = { ok: 0, shown: 0, rev: 0, revGood: 0 });
      d[field] = (d[field] || 0) + 1; store.set({ dyStats: ST }); hud();
    });
  }
  // Kelimeler: panel ve Kelimelerim sayfasıyla aynı kayıt; yazmadan önce güncel hâli okunur
  function updWords(fn) { store.get('dyWords', r => { WD = (r && r.dyWords) || { items: {} }; WD.items = WD.items || {}; fn(WD.items); store.set({ dyWords: WD }); }); }
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.dyWords) WD = ch.dyWords.newValue || { items: {} };
    if (ch.dyStats) { ST = ch.dyStats.newValue || { days: {} }; hud(); }
  });
  const feedWords = () => Object.values(WD.items || {}).filter(w => w.feed && w.stage < 0 && w.lang === settings.srcLang);
  const dueWords = () => { const now = Date.now(); return Object.values(WD.items || {}).filter(w => w.stage >= 0 && w.due <= now && w.lang === settings.srcLang); };

  // ---------- Üst çubuk ----------
  function hud(popXp) {
    rollDay();
    const g = FD.goal || 10, n = Math.min(FD.today, g);
    $('#goal').innerHTML = Array.from({ length: g }, (_, i) => `<i class="${i < n ? (FD.today >= g ? 'done' : 'on') : ''}"></i>`).join('') + `<b>${t('ofGoal', FD.today, g)}</b>`;
    const s = streak();
    $('#streak').textContent = '🔥 ' + s; $('#streak').title = s + ' ' + t('streak');
    $('#xp').textContent = '⚡ ' + (FD.xpDay || 0); $('#xp').title = (FD.xpDay || 0) + ' ' + t('xp') + ' ' + t('today');
    if (popXp) { const el = $('#xp'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    $('#toWords').title = HOST ? 'Satzo' : t('back');
  }
  let toastT = null;
  function toast(m) { const el = $('#toast'); el.textContent = m; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

  // ---------- Kart geçişi ----------
  function newCard(html, cls) {
    const stage = $('#stage'), old = C.card;
    const card = document.createElement('article'); card.className = 'card below ' + (cls || ''); card.innerHTML = html;
    stage.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.classList.remove('below');
      if (old) { old.classList.add('above'); setTimeout(() => old.remove(), 500); }
    }));
    C.card = card; return card;
  }

  // ---------- Başlangıç ----------
  const levels = () => [...new Set(CAT.filter(c => c.lang === settings.srcLang).map(c => c.lvl).filter(Boolean))].sort();
  const pool = () => CAT.filter(c => c.lang === settings.srcLang && (!FD.lvl || c.lvl === FD.lvl));
  function home() {
    C.phase = 'home'; stopFrame();
    const lv = levels(), dw = dueWords().length;
    const card = newCard(`<div class="hero">
      <h1>${esc(t('title'))}</h1><p>${esc(t('lead'))}</p>
      <div class="stat3"><div><b>${streak()}</b><span>${esc(t('streak'))}</span></div><div><b>${FD.today}</b><span>${esc(t('clips', '').trim())} · ${esc(t('today'))}</span></div><div><b>${Object.values(WD.items || {}).filter(w => w.lang === settings.srcLang && w.stage >= 0).length}</b><span>${esc(t('words'))}</span></div></div>
      ${lv.length > 1 ? `<div><div class="lab">${esc(t('level'))}</div><div class="seg" data-k="lvl">${['', ...lv].map(l => `<button type="button" data-v="${l}" aria-pressed="${(FD.lvl || '') === l}">${esc(l || t('all'))}</button>`).join('')}</div></div>` : ''}
      <div><div class="lab">${esc(t('goal'))}</div><div class="seg" data-k="goal">${[5, 10, 20].map(g => `<button type="button" data-v="${g}" aria-pressed="${(FD.goal || 10) === g}">${esc(t('clips', g))}</button>`).join('')}</div></div>
      <p class="lab">${esc(t('clips', pool().length))}${dw ? ' · ' + esc(t('reviewDue', dw)) : ''}</p>
      <button type="button" class="btn main" data-a="go">${esc(FD.n ? t('cont') : t('start'))}<span class="kbd">Enter</span></button>
      ${!HOST && settings.editor ? `<button type="button" class="btn ghost" data-a="prep">${esc(t('prep'))}</button>` : ''}
    </div>`, 'home');
    const pb = card.querySelector('[data-a="prep"]'); if (pb) pb.addEventListener('click', prepStart);
    card.querySelectorAll('.seg').forEach(sg => sg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (sg.dataset.k === 'lvl') FD.lvl = b.dataset.v; else FD.goal = +b.dataset.v;
      sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      saveFeed(); hud();
      card.querySelector('p.lab').textContent = t('clips', pool().length);
    }));
    card.querySelector('[data-a="go"]').addEventListener('click', nextClip);
    setTimeout(() => card.querySelector('[data-a="go"]').focus(), 450);
  }

  // ---------- Klip seçimi ----------
  function chooseNext() {
    const cur = C.clip && C.clip.vid, at = cur ? FD.seen[cur] : null;
    if (cur && at > 0) return { clip: C.clip, from: at, same: true };
    // Ara karttan (kelime turu, hedef) sonra yarım kalan haberin devamı
    const last = !cur && FD.cur && FD.seen[FD.cur.vid] > 0 && pool().find(c => c.vid === FD.cur.vid);
    if (last) return { clip: last, from: FD.seen[last.vid], same: false };
    const list = pool().filter(c => c.vid !== cur && FD.seen[c.vid] !== -1);
    const c = list.find(x => FD.seen[x.vid] == null) || list[0];
    return c ? { clip: c, from: FD.seen[c.vid] > 0 ? FD.seen[c.vid] : 0, same: false } : null;
  }
  function nextClip() {
    clearTimeout(C.timer);
    rollDay();
    const goalNow = FD.today >= (FD.goal || 10) && FD.goalShown !== FD.day;
    // Seans sonu (5 klip ya da günlük hedef): o ana kadar işaretlenen kelimelerden sınav
    if (C.phase !== 'quiz' && feedWords().length && (FD.sinceQ >= QUIZ_EVERY || goalNow)) { startQuiz(feedWords().slice(0, 8)); return; }
    if (goalNow) { goalCard(); return; }
    const nx = chooseNext();
    if (!nx) { toast(t('empty')); home(); return; }
    if (nx.same && C.live && C.cues.length) { startWindow(nx.from, true); return; }
    loadClip(nx.clip, nx.from);
  }

  // ---------- Oynatıcı ----------
  // Oynatıcı bağlantısı. Eklentide: gömülü YouTube çerçevesi + içindeki Satzo betiği. Telefon (web) sürümünde: window.SatzoHost (tek, kalıcı oynatıcı).
  const HOST = window.SatzoHost || null;
  function stopFrame() { C.frame = null; C.cues = []; C.live = false; if (HOST) HOST.stop(); }
  const post = m => { try { if (HOST) HOST.post(m); else C.frame && C.frame.contentWindow.postMessage(m, 'https://www.youtube-nocookie.com'); } catch (e) {} };
  function loadClip(clip, from) {
    C.clip = clip; C.cues = []; C.phase = 'load'; C.loadAt = Date.now(); FD.cur = { vid: clip.vid, from: from || 0 }; saveFeed();
    const src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(clip.vid) + '?autoplay=1&playsinline=1&rel=0&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&start=' + Math.floor(from || 0) +
      '&hl=' + UI + '&satzo_feed=1';
    const yt = 'https://www.youtube.com/watch?v=' + encodeURIComponent(clip.vid) + (from ? '&t=' + Math.floor(from) + 's' : '');
    const card = newCard(`<div class="player">${HOST ? '' : `<iframe allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="${esc(clip.title || 'YouTube')}" src="${src}"></iframe>`}</div>
      <div class="meta"><span class="src">${esc([clip.src, clip.title].filter(Boolean).join(' · '))}</span><a href="${yt}" target="_blank" rel="noopener">${esc(t('openYT'))}</a></div>
      <div class="prog"><i></i></div>
      <div class="cap"><div class="load"><div><div class="spin"></div>${esc(t('loading'))}</div></div></div>
      <div class="dock"></div>`);
    C.frame = card.querySelector('iframe'); C.live = true;
    C.pendingFrom = from || 0;
    if (HOST) HOST.load(clip.vid, from || 0);
    clearTimeout(C.loadTimer);
    C.loadTimer = setTimeout(() => { if (C.phase === 'load' && !C.cues.length) post({ satzo: 'fcues?' }); }, 5000);
    C.failTimer = setTimeout(() => { if (C.phase === 'load' && !C.cues.length && !C.ad) { toast(t('nocap')); FD.seen[clip.vid] = -1; saveFeed(); nextClip(); } }, 16000);
  }
  window.addEventListener('message', e => {
    if (HOST || !C.frame || e.source !== C.frame.contentWindow) return;
    onFrameMsg(e.data);
  });
  if (HOST) HOST.onmsg = d => onFrameMsg(d);
  function onFrameMsg(d) {
    if (!d || typeof d !== 'object') return;
    if (C.phase === 'prep') { prepMsg(d); return; }
    if (d.satzo === 'fcues' && d.vid === (C.clip && C.clip.vid)) {
      const first = !C.cues.length; C.cues = d.cues || [];
      if (first && C.phase === 'load' && C.cues.length) { clearTimeout(C.failTimer); startWindow(C.pendingFrom, false); }
    } else if (d.satzo === 'ft') { C.t = d.t; C.ad = !!d.ad; C.paused = d.paused; onTime(); }
    else if (d.satzo === 'fend') onEnd();
    else if (d.satzo === 'fnocap' && C.phase === 'load') { clearTimeout(C.failTimer); toast(t('nocap')); FD.seen[C.clip.vid] = -1; saveFeed(); setTimeout(nextClip, 600); }
    else if (d.satzo === 'fneedtap' && C.phase === 'watch') toast(t('tapVideo'));
  }

  // ---------- Telefon sürümü için altyazıları hazırla (editör modu) ----------
  // Katalogdaki videolar sırayla küçük bir oynatıcıda açılır, altyazıları alınır ve katalogla birlikte tek dosya (data.json) olarak indirilir.
  let SUBS = {};
  const compact = cues => cues.map(c => [Math.round(c.start * 100) / 100, Math.round(c.end * 100) / 100, c.text]);
  function prepStart() {
    C.phase = 'prep'; stopFrame();
    const list = CAT.filter(c => !SUBS[c.vid]);
    const P = C.prep = { list, i: 0, fail: [], stop: false, timer: null };
    const card = newCard(`<div class="player"></div><div class="hero"><h1>${esc(t('prepT'))}</h1><p id="prepL"></p><div class="prog"><i></i></div>
      <div class="row"><button type="button" class="btn main" id="prepDl">${esc(t('prepDl'))}</button><button type="button" class="btn ghost" id="prepStop">${esc(t('prepStop'))}</button></div></div>`, 'prep');
    card.querySelector('#prepDl').addEventListener('click', prepDownload);
    card.querySelector('#prepStop').addEventListener('click', () => { P.stop = true; clearTimeout(P.timer); C.frame = null; home(); });
    prepNext();
  }
  function prepUI() {
    const P = C.prep, el = C.card && C.card.querySelector('#prepL'); if (!el) return;
    const have = CAT.filter(c => SUBS[c.vid]).length;
    el.textContent = t('prepL', have, CAT.length, P.fail.length);
    const bar = C.card.querySelector('.prog i'); if (bar) bar.style.width = (CAT.length ? have / CAT.length * 100 : 0) + '%';
  }
  function prepNext() {
    const P = C.prep; if (!P || P.stop || C.phase !== 'prep') return;
    prepUI();
    const clip = P.list[P.i];
    if (!clip) { C.card.querySelector('.player').innerHTML = ''; C.frame = null; C.card.querySelector('h1').textContent = t('prepDone'); prepDownload(); return; }
    C.clip = clip;
    const box = C.card.querySelector('.player');
    box.innerHTML = `<iframe allow="autoplay; encrypted-media" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(clip.vid)}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&satzo_feed=1"></iframe>`;
    C.frame = box.querySelector('iframe');
    clearTimeout(P.timer); P.timer = setTimeout(() => { P.fail.push(clip.vid); P.i++; prepNext(); }, 20000);
  }
  function prepMsg(d) {
    const P = C.prep; if (!P || !C.clip) return;
    if (d.satzo === 'fcues' && d.vid === C.clip.vid && d.cues && d.cues.length) {
      SUBS[d.vid] = compact(d.cues); store.set({ dySubs: SUBS });
      clearTimeout(P.timer); P.i++; setTimeout(prepNext, 300);
    } else if (d.satzo === 'fnocap') { clearTimeout(P.timer); P.fail.push(C.clip.vid); P.i++; setTimeout(prepNext, 300); }
  }
  function prepDownload() {
    const clips = CAT.filter(c => SUBS[c.vid]).map(c => { const o = Object.assign({}, c); delete o.own; return o; });
    const subs = {}; clips.forEach(c => { subs[c.vid] = SUBS[c.vid]; });
    const blob = new Blob([JSON.stringify({ v: 1, updated: new Date().toISOString().slice(0, 10), clips, subs })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data.json'; document.body.appendChild(a); a.click(); a.remove();
  }

  // Klip penceresi: cümle sınırında başlar ve biter, ~40 sn'den sonra ilk duraklamada kesilir, en fazla ~70 sn; sonda kısa artık kalırsa klibe katılır
  function pickWindow(fromSec) {
    const cs = C.cues, n = cs.length; if (!n) return null;
    let a = 0; if (fromSec > 1) { a = cs.findIndex(c => c.start >= fromSec - 0.5); if (a < 0) return null; }
    let b = a;
    for (let j = a; j < n; j++) {
      b = j; const dur = cs[j].end - cs[a].start, gap = j < n - 1 ? cs[j + 1].start - cs[j].end : 99;
      if (dur >= FEED_MAX || (dur >= FEED_TARGET && gap > 0.5) || (dur >= FEED_MIN + 15 && j - a >= 7)) break;
    }
    if (cs[n - 1].end - cs[b].end < FEED_TAIL) b = n - 1;
    return { a, b };
  }
  function startWindow(fromSec, same) {
    const w = pickWindow(fromSec);
    if (!w) { FD.seen[C.clip.vid] = -1; saveFeed(); nextClip(); return; }
    C.a = w.a; C.b = w.b; C.marked = new Set(); C.target = -1; C.tries = 0; C.hints = 0; C.shown = false; C.xpGot = 0; C.newW = 0; C.cur = -1;
    C.phase = 'watch'; FD.on = true; saveFeed();
    if (same) { C.card.classList.remove('flip'); void C.card.offsetWidth; toast(t('sameVid')); }
    renderWatch();
    playWhenFree(C.cues[C.a].start - 0.15, C.cues[C.b].end + 0.45);
  }
  function playWhenFree(from, to) {
    // Reklam sürüyorsa bekle; reklamı atlamak ya da engellemek yok
    if (C.ad) { const el = C.card && C.card.querySelector('.cap'); if (el && C.phase === 'watch') el.dataset.ad = '1'; setTimeout(() => playWhenFree(from, to), 500); return; }
    post({ satzo: 'fplay', from: Math.max(0, from), to, rate: speed() });
  }

  // ---------- İzleme ----------
  const words = text => text.split(/\s+/).filter(Boolean);
  const bare = w => String(w).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  function wordTimes(c) {
    const ws = words(c.text);
    if (c.wt && c.wt.length >= ws.length) return ws.map((_, i) => c.wt[i]);
    const tot = ws.reduce((s, w) => s + w.length + 1, 0); let acc = 0;
    return ws.map(w => { const at = c.start + (c.end - c.start) * acc / tot; acc += w.length + 1; return at; });
  }
  function cueAt(time) { let k = -1; for (let i = C.a; i <= C.b; i++) { if (C.cues[i].start - 0.05 <= time) k = i; else break; } return k; }
  function wordsHTML(ci, upto) {
    const c = C.cues[ci]; const tm = wordTimes(c);
    return words(c.text).map((w, i) => {
      const key = bare(w).toLowerCase(), mk = C.marked.has(key);
      const said = upto != null && tm[i] <= upto, now = said && (i === tm.length - 1 || tm[i + 1] > upto);
      return `<span class="w${mk ? ' mk' : ''}${said ? ' on' : ''}${now ? ' cur' : ''}" data-ci="${ci}" data-wi="${i}">${esc(w)}</span>`;
    }).join(' ');
  }
  function karaoke(el, ci, time) {
    const tm = wordTimes(C.cues[ci]), spans = el.children;
    for (let i = 0; i < spans.length; i++) {
      const said = tm[i] <= time, now = said && (i === tm.length - 1 || tm[i + 1] > time);
      spans[i].classList.toggle('on', said); spans[i].classList.toggle('cur', now);
    }
  }
  function renderWatch() {
    const card = C.card; if (!card) return;
    const cap = card.querySelector('.cap'), dock = card.querySelector('.dock');
    cap.innerHTML = `<p class="prevline" hidden></p><p class="line"></p><p class="gl" hidden></p><p class="tr" hidden></p>`;
    dock.innerHTML = `<div class="words"></div><div class="row"><button type="button" class="btn ico" data-a="pp" aria-label="Play / Pause" title="Play / Pause (Space)"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5.5v13l8.5-6.5z"></path><rect x="14" y="5" width="3" height="14" rx="1"></rect><rect x="19" y="5" width="3" height="14" rx="1"></rect></svg></button><button type="button" class="btn" data-a="speed" title="${esc(t('speedH'))}">${speedLabel()}</button><button type="button" class="btn" data-a="replay">↺ ${esc(t('replay'))}</button><button type="button" class="btn ghost" data-a="tr">${esc(t('trBtn'))}</button><span style="flex:1"></span><button type="button" class="btn ghost" data-a="skip">${esc(t('skip'))} ↓</button></div><div class="lab">${esc(t('tapHint'))}</div>`;
    C.cur = -1; onTime(true); renderChips();
  }
  function onTime(force) {
    if (!C.card) return;
    if (C.phase === 'watch') {
      const capEl = C.card.querySelector('.cap');
      if (C.ad) { if (capEl.dataset.ad !== '1') { capEl.dataset.ad = '1'; capEl.querySelector('.line') && (capEl.querySelector('.line').textContent = t('ad')); } return; }
      if (capEl.dataset.ad) { delete capEl.dataset.ad; force = true; }
      const k = Math.max(C.a, cueAt(C.t));
      const bar = C.card.querySelector('.prog i'), s0 = C.cues[C.a].start, s1 = C.cues[C.b].end;
      if (bar) bar.style.width = Math.max(0, Math.min(100, (C.t - s0) / (s1 - s0) * 100)) + '%';
      const now = C.card.querySelector('.cap .line'), prev = C.card.querySelector('.cap .prevline'); if (!now) return;
      if (k !== C.cur || force) {
        if (C.cur !== -1 && k !== C.cur && !C.paused) { const g = C.card.querySelector('.cap .gl'); if (g) g.hidden = true; }
        C.cur = k; prev.hidden = !(k > C.a); prev.innerHTML = k > C.a ? wordsHTML(k - 1, null) : '';
        const tr = C.card.querySelector('.cap .tr'); tr.hidden = !C.trOn; tr.textContent = '';
        if (C.trOn) translate(C.cues[k].text).then(x => { if (C.cur === k) tr.textContent = x || ''; });
      }
      if (now.dataset.ci !== String(k) || force) { now.dataset.ci = String(k); now.innerHTML = wordsHTML(k, C.t); }
      else karaoke(now, k, C.t); // kelimeler yerinde kalır, sadece sınıflar değişir (tıklama kaybolmasın)
    } else if (C.phase === 'done') {
      const bar = C.card.querySelector('.prog i'); if (bar) bar.style.width = '100%';
    }
  }
  function onEnd() {
    if (C.phase !== 'watch') return;
    const endSec = C.cues[C.b].end, last = C.cues[C.cues.length - 1].end;
    FD.seen[C.clip.vid] = last - endSec < 8 ? -1 : endSec; saveFeed();
    finishClip();
  }
  function renderChips() {
    const box = C.card && C.card.querySelector('.words'); if (!box) return;
    const list = [...C.marked].map(k => WD.items[settings.srcLang + ':' + k]).filter(Boolean);
    box.innerHTML = list.map(w => `<span class="wchip">${esc(w.w)}${w.tr ? `<small>${esc(w.tr)}</small>` : ''}</span>`).join('');
  }
  function toggleWord(ci, wi) {
    const c = C.cues[ci]; if (!c) return;
    const raw = words(c.text)[wi], w = bare(raw); if (!w) return;
    const key = w.toLowerCase(), id = settings.srcLang + ':' + key;
    if (C.marked.has(key)) { C.marked.delete(key); updWords(items => { const x = items[id]; if (x && x.stage < 0 && x.vid === C.clip.vid) delete items[id]; }); onTime(true); renderChips(); return; }
    const old = WD.items[id];
    if (old && old.stage >= 0) { tapPause(c, w, old.tr || ''); return; } // zaten öğrenilmiş: sadece anlamını göster
    C.marked.add(key); C.newW++;
    tapPause(c, w, null);
    const tm = wordTimes(c), ws = c.wt ? c.wt[wi] : tm[wi], we = c.wt && c.wt[wi + 1] != null ? c.wt[wi + 1] : (tm[wi + 1] != null ? tm[wi + 1] : Math.min(c.end, ws + 0.8));
    const it = { id, w, key, lang: settings.srcLang, tr: null, ctx: c.text, wt: c.wt ? c.wt.slice() : null, vid: C.clip.vid,
      url: 'https://www.youtube.com/watch?v=' + C.clip.vid + '&t=' + Math.floor(c.start) + 's', title: C.clip.title || '',
      start: c.start, end: c.end, ws: c.wt ? ws : null, we: c.wt ? we : null, stage: -1, due: 0, added: Date.now(), feed: true };
    updWords(items => { items[id] = Object.assign(items[id] || {}, it); });
    onTime(true); renderChips();
    translate(w, c.text).then(tr => { updWords(items => { if (items[id]) items[id].tr = tr || ''; }); setTimeout(renderChips, 60); showGloss(w, tr); });
    try { chrome.runtime.sendMessage({ type: 'lemma', w, sl: settings.srcLang, tl: settings.tgtLang }, r => { if (chrome.runtime.lastError || !r || !r.ok) return; updWords(items => { const x = items[id]; if (x) Object.assign(x, { base: r.base || x.w, pos: r.pos || '', art: r.art || '', pl: r.pl || '', btr: r.btr || '' }); }); }); } catch (e) {}
  }
  // Kelimeye dokununca video durur, anlam altta görünür; 3,5 sn içinde başka bir şey yapılmazsa video devam eder
  const AUTO_RESUME = 3500;
  // Oynatma hızı: seçim saklanır, her klipte geçerli
  const SPEEDS = [0.75, 0.85, 1, 1.15, 1.25];
  const speed = () => SPEEDS.includes(+FD.rate) ? +FD.rate : 1;
  const speedLabel = () => String(speed()).replace('.', UI === 'en' ? '.' : ',') + '×';
  function setSpeed(dir) {
    const i = SPEEDS.indexOf(speed()), j = dir == null ? (i + 1) % SPEEDS.length : Math.max(0, Math.min(SPEEDS.length - 1, i + dir));
    FD.rate = SPEEDS[j]; saveFeed(); post({ satzo: 'frate', rate: FD.rate });
    const b = C.card && C.card.querySelector('[data-a="speed"]'); if (b) b.textContent = speedLabel();
    toast(t('speedT', speedLabel()));
  }
  function pauseVideo() { post({ satzo: 'fpause' }); C.paused = true; }
  function resumeVideo() { clearTimeout(C.resumeT); C.tapPaused = false; if (C.phase === 'watch') { post({ satzo: 'fplay', to: C.cues[C.b].end + 0.45, rate: speed() }); C.paused = false; setGlossHint(''); } }
  function tapPause(c, w, tr) {
    if (C.phase !== 'watch') return;
    if (!C.paused || C.tapPaused) { pauseVideo(); C.tapPaused = true; }
    if (C.tapPaused) { clearTimeout(C.resumeT); C.resumeT = setTimeout(resumeVideo, AUTO_RESUME); }
    showGloss(w, tr);
  }
  function showGloss(w, tr) {
    const el = C.card && C.card.querySelector('.cap .gl'); if (!el || C.phase !== 'watch') return;
    el.hidden = false; el.innerHTML = `<b>${esc(w)}</b> ${tr === null ? '<span class="dots">…</span>' : '— ' + esc(tr || '?')}<span class="glh"></span>`;
    setGlossHint(C.tapPaused || C.paused ? t(HOST ? 'resumeTap' : 'resumeIn') : '');
  }
  function setGlossHint(m) { const h = C.card && C.card.querySelector('.cap .gl .glh'); if (h) h.textContent = m ? ' · ' + m : ''; }
  const trCache = new Map();
  function translate(text, ctx) {
    const k = settings.tgtLang + ':' + text + '|' + (ctx || '');
    if (trCache.has(k)) return trCache.get(k);
    const p = new Promise(res => { try { chrome.runtime.sendMessage({ type: 'translate', text, ctx, sl: settings.srcLang, tl: settings.tgtLang }, r => res(!chrome.runtime.lastError && r && r.ok ? r.text : '')); } catch (e) { res(''); } });
    trCache.set(k, p); return p;
  }

  // ---------- Klip sonu ----------
  const fold = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function finishClip() {
    C.phase = 'done'; clearTimeout(C.resumeT);
    const xp = XP_CLIP + C.newW * XP_WORD;
    rollDay(); FD.n++; FD.today++; FD.sinceQ++; FD.xp = (FD.xp || 0) + xp; FD.xpDay = (FD.xpDay || 0) + xp; saveFeed();
    bump('clip'); hud(true);
    const cap = C.card.querySelector('.cap'), dock = C.card.querySelector('.dock');
    const list = [...C.marked].map(k => WD.items[settings.srcLang + ':' + k]).filter(Boolean);
    cap.innerHTML = `<p class="lab">${esc(list.length ? t('tapped') : t('none'))}</p><div class="words">${list.map(w => `<span class="wchip">${esc(w.w)}${w.tr ? `<small>${esc(w.tr)}</small>` : ''}</span>`).join('')}</div>`;
    const burst = document.createElement('div'); burst.className = 'burst'; burst.textContent = '+' + xp; C.card.appendChild(burst); setTimeout(() => burst.remove(), 1100);
    const same = C.clip && FD.seen[C.clip.vid] > 0, left = QUIZ_EVERY - FD.sinceQ;
    dock.innerHTML = `<div class="win"><b>+${xp} ⚡</b><span>${esc([C.newW ? t('newWords', C.newW) : '', t('ofGoal', FD.today, FD.goal || 10) + ' ' + t('today')].filter(Boolean).join(' · '))}</span></div>
      <div class="row"><button type="button" class="btn main next count" data-a="next" style="--dur:4s"><span class="fill"></span><span style="position:relative">${esc(left <= 0 && feedWords().length ? t('quizNow') : same ? t('sameVid') : t('next'))} ↓<span class="kbd">Enter</span></span></button><button type="button" class="btn ghost" data-a="wait">${esc(t('wait'))}</button></div>
      <div class="swipe"><i>↑</i> ${esc(t(HOST ? 'swipeT' : 'swipe'))}</div>`;
    C.card.querySelector('[data-a="next"]').focus();
    clearTimeout(C.timer); C.timer = setTimeout(() => { if (C.phase === 'done') nextClip(); }, 4000);
  }

  // ---------- Kelime turu (her 5 klipte bir) ----------
  function quizOffer() {
    C.phase = 'quizOffer'; stopFrame();
    const W = feedWords().slice(0, 6);
    const card = newCard(`<div class="hero"><div class="big">🧠</div><h1>${esc(t('quizT'))}</h1><p>${esc(t('quizL'))}</p>
      <div class="words">${W.map(w => `<span class="wchip">${esc(w.w)}</span>`).join('')}</div>
      <div class="row"><button type="button" class="btn main" data-a="qgo">${esc(t('quizGo'))}<span class="kbd">Enter</span></button><button type="button" class="btn ghost" data-a="qlater">${esc(t('quizSkip'))}</button></div></div>`, 'quiz');
    card.querySelector('[data-a="qgo"]').addEventListener('click', () => startQuiz(W));
    card.querySelector('[data-a="qlater"]').addEventListener('click', () => { FD.sinceQ = 0; saveFeed(); C.phase = 'quiz'; nextClip(); });
    setTimeout(() => card.querySelector('[data-a="qgo"]').focus(), 450);
  }
  function startQuiz(W) {
    FD.sinceQ = 0; saveFeed();
    const others = Object.values(WD.items).filter(w => w.lang === settings.srcLang && w.tr);
    C.quiz = { W, i: 0, wrong: new Set(), others };
    C.phase = 'quiz'; stopFrame(); quizQ();
  }
  function quizQ() {
    const Q = C.quiz, w = Q.W[Q.i];
    if (!w) { quizEnd(); return; }
    const dis = Q.others.filter(x => x.id !== w.id && x.tr && x.tr.toLowerCase() !== String(w.tr || '').toLowerCase()).sort(() => Math.random() - .5).map(x => x.tr).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
    const ctx = esc(w.ctx || '').replace(new RegExp('(^|[^\\p{L}])(' + w.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\p{L}])', 'iu'), '$1<mark>$2</mark>');
    let body;
    if (w.tr && dis.length >= 2) {
      const opts = [w.tr, ...dis].sort(() => Math.random() - .5);
      body = `<p class="qword">${esc(w.art ? w.art + ' ' + (w.base || w.w) : w.w)}</p><p class="qctx">${ctx}</p><p class="lab">${esc(t('qMean'))}</p>
        <div class="opts">${opts.map((o, i) => `<button type="button" class="opt" data-ok="${o === w.tr ? 1 : 0}"><span class="n">${i + 1}</span>${esc(o)}</button>`).join('')}<button type="button" class="opt" data-ok="0"><span class="n">0</span>${esc(t('dunno'))}</button></div>`;
    } else {
      body = `<p class="lab">${esc(t('qType', w.tr || '…'))}</p><p class="qctx">${esc(w.ctx || '').replace(new RegExp(w.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '____')}</p><input class="in" id="qin" autocomplete="off" spellcheck="false" lang="${settings.srcLang}">`;
    }
    const card = newCard(`<div class="hero"><div class="lab">${esc(Q.i === 0 ? t('quizNow') : t('quizT'))} · ${Q.i + 1}/${Q.W.length}</div>${body}</div>`, 'quiz');
    card.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => quizAns(b.dataset.ok === '1', b)));
    const qin = card.querySelector('#qin');
    if (qin) { qin.addEventListener('keydown', e => { if (e.key === 'Enter' && qin.value.trim()) quizAns(fold(bare(qin.value.trim())) === fold(w.w), null); }); setTimeout(() => qin.focus(), 450); }
  }
  function quizAns(ok, btn) {
    const Q = C.quiz, w = Q.W[Q.i]; if (Q.locked) return; Q.locked = true;
    if (!ok) Q.wrong.add(w.id);
    if (btn) { btn.classList.add(ok ? 'ok' : 'bad'); if (!ok) { const r = C.card.querySelector('.opt[data-ok="1"]'); r && r.classList.add('ok'); } }
    else { const q = C.card.querySelector('#qin'); q.style.borderColor = ok ? 'var(--ok)' : 'var(--bad)'; if (!ok) q.value = w.w; }
    if (ok) { FD.xpDay = (FD.xpDay || 0) + 3; FD.xp = (FD.xp || 0) + 3; saveFeed(); hud(true); }
    setTimeout(() => { Q.locked = false; Q.i++; quizQ(); }, ok ? 650 : 1500);
  }
  function quizEnd() {
    const Q = C.quiz, now = Date.now();
    updWords(items => Q.W.forEach(w0 => { const w = items[w0.id]; if (w) { w.stage = 0; w.due = now + DAY - EARLY; } }));
    Q.W.forEach(() => bump('rev'));
    const card = newCard(`<div class="hero"><div class="big">✅</div><h1>${esc(t('quizT'))}</h1><p>${esc(t('qDone', Q.W.length))}</p>
      <button type="button" class="btn main" data-a="qnext">${esc(t('next'))} ↓<span class="kbd">Enter</span></button></div>`, 'quiz');
    C.phase = 'quiz'; C.clip = null;
    card.querySelector('[data-a="qnext"]').addEventListener('click', nextClip);
    setTimeout(() => card.querySelector('[data-a="qnext"]').focus(), 450);
  }

  // ---------- Günlük hedef ----------
  function goalCard() {
    FD.goalShown = FD.day; saveFeed(); C.phase = 'goal'; stopFrame();
    const card = newCard(`<div class="hero"><div class="big">🎉</div><h1>${esc(t('goalT'))}</h1><p>${esc(t('goalL', FD.today, FD.xpDay || 0, streak()))}</p>
      <div class="row"><button type="button" class="btn main" data-a="more">${esc(t('goalMore'))}<span class="kbd">Enter</span></button>${HOST ? `<button type="button" class="btn ghost" data-a="ghome">${esc(t('goalStop'))}</button>` : `<a class="btn ghost" href="words.html" style="text-decoration:none;color:inherit">${esc(t('goalStop'))}</a>`}</div></div>`, 'goal');
    card.querySelector('[data-a="more"]').addEventListener('click', () => { C.phase = 'more'; C.clip = null; nextClip(); });
    const gh = card.querySelector('[data-a="ghome"]'); if (gh) gh.addEventListener('click', home);
    setTimeout(() => card.querySelector('[data-a="more"]').focus(), 450);
  }

  // ---------- Etkileşim ----------
  document.addEventListener('click', e => {
    const w = e.target.closest('.w'); if (w && C.phase === 'watch') { toggleWord(+w.dataset.ci, +w.dataset.wi); return; }
    if (e.target.closest('.cap .gl') && C.phase === 'watch' && C.paused) { resumeVideo(); return; } // anlam kutusuna dokun: devam
    const b = e.target.closest('[data-a]'); if (!b || !C.card || !C.card.contains(b)) return;
    const a = b.dataset.a;
    if (a === 'replay' && C.phase === 'watch') { const k = Math.max(C.a, C.cur); post({ satzo: 'fplay', from: C.cues[k].start - 0.2, to: C.cues[C.b].end + 0.45, rate: speed() }); }
    else if (a === 'pp' && C.phase === 'watch') togglePlay();
    else if (a === 'speed') setSpeed(null);
    else if (a === 'tr') { C.trOn = !C.trOn; onTime(true); }
    else if (a === 'skip') skip();
    else if (a === 'next') nextClip();
    else if (a === 'wait') { clearTimeout(C.timer); const n = C.card.querySelector('.next'); n && n.classList.remove('count'); }
  });
  function togglePlay() {
    if (C.phase !== 'watch') return;
    if (C.paused) resumeVideo();
    else { clearTimeout(C.resumeT); C.tapPaused = false; pauseVideo(); setGlossHint(t(HOST ? 'resumeTap' : 'resumeIn')); }
  }
  function skip() {
    if (C.phase === 'watch' || C.phase === 'load') {
      if (C.clip && C.phase !== 'load' && C.cues.length) { const endSec = C.cues[C.b].end, last = C.cues[C.cues.length - 1].end; FD.seen[C.clip.vid] = last - endSec < 8 ? -1 : endSec; saveFeed(); }
      clearTimeout(C.resumeT); post({ satzo: 'fpause' }); C.phase = 'skip'; nextClip();
    } else if (C.phase === 'done') nextClip();
  }
  const typing = () => { const a = document.activeElement; return a && /INPUT|TEXTAREA/.test(a.tagName); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !typing()) { const b = C.card && C.card.querySelector('.btn.main'); if (b) { e.preventDefault(); b.click(); } return; }
    if ((e.key === 'ArrowDown' || e.key === 'PageDown') && !typing()) { e.preventDefault(); skip(); return; }
    if (e.code === 'Space' && !typing() && C.phase === 'watch') { e.preventDefault(); togglePlay(); return; }
    if ((e.key === '-' || e.key === '+' || e.key === '=') && !typing() && C.phase === 'watch') { e.preventDefault(); setSpeed(e.key === '-' ? -1 : 1); return; }
    if (C.phase === 'quiz' && /^[0-4]$/.test(e.key) && !typing()) { const o = [...C.card.querySelectorAll('.opt')].find(x => x.querySelector('.n').textContent === e.key); o && o.click(); }
    if (e.key === 'Escape' && C.phase === 'done') { clearTimeout(C.timer); }
  });
  let wheelLock = 0;
  document.addEventListener('wheel', e => {
    if (e.deltaY < 40 || Date.now() < wheelLock || e.target.closest('.cap')) return;
    if (!['watch', 'done'].includes(C.phase)) return;
    wheelLock = Date.now() + 900; skip();
  }, { passive: true });
  let ty = null;
  document.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => { if (ty == null) return; const dy = e.changedTouches[0].clientY - ty; ty = null; if (dy < -70 && ['watch', 'done'].includes(C.phase)) skip(); }, { passive: true });

  // ---------- Başlat ----------
  store.get(['dySettings', 'dyWords', 'dyStats', 'dyFeed', 'dySubs'], r => {
    const s = (r && r.dySettings) || {};
    if (s.srcLang && !params.get('lang')) settings.srcLang = s.srcLang;
    if (s.tgtLang) settings.tgtLang = s.tgtLang;
    settings.editor = !!s.editor; SUBS = (r && r.dySubs) || {};
    if (HOST) { const b = $('#toWords'); b.removeAttribute('href'); b.addEventListener('click', home); }
    WD = (r && r.dyWords) || { items: {} }; WD.items = WD.items || {};
    ST = (r && r.dyStats) || { days: {} }; ST.days = ST.days || {};
    FD = Object.assign(FD, (r && r.dyFeed) || {}); FD.seen = FD.seen || {};
    hud();
    chrome.runtime.sendMessage({ type: 'catalog' }, res => { CAT = (res && res.clips) || []; home(); });
  });
})();
