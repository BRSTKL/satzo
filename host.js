// Satzo web uygulaması: eklentinin sağladığı şeylerin tarayıcıdaki karşılığı.
// 1) chrome.* yerine: kayıt localStorage'da, katalog + altyazı data.json'dan, çeviri Google'dan.
// 2) SatzoHost: tek, kalıcı YouTube oynatıcısı (resmî IFrame Player API). Akış kodu (feed.js) eklentidekiyle aynıdır.
(() => {
  'use strict';
  const LS = 'satzo:';
  const read = k => { try { const v = localStorage.getItem(LS + k); return v == null ? undefined : JSON.parse(v); } catch (e) { return undefined; } };
  let DATA = null;
  const loadData = () => DATA ? Promise.resolve(DATA) : fetch('data.json', { cache: 'no-cache' }).then(r => r.json()).then(j => (DATA = { clips: j.clips || [], subs: j.subs || {} })).catch(() => (DATA = { clips: [], subs: {} }));
  const trCache = new Map();
  function translate(m) {
    const k = m.sl + '>' + m.tl + ':' + m.text;
    if (trCache.has(k)) return trCache.get(k);
    const p = fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + encodeURIComponent(m.sl) + '&tl=' + encodeURIComponent(m.tl) + '&dt=t&dj=1&q=' + encodeURIComponent(m.text))
      .then(r => r.json()).then(j => (j.sentences || []).map(s => s.trans || '').join(''));
    trCache.set(k, p); p.catch(() => trCache.delete(k)); return p;
  }
  window.chrome = {
    i18n: { getUILanguage: () => navigator.language || 'en' },
    storage: {
      local: {
        get(keys, cb) { const out = {}; [].concat(keys).forEach(k => { const v = read(k); if (v !== undefined) out[k] = v; }); setTimeout(() => cb(out), 0); },
        set(obj) { Object.keys(obj).forEach(k => { try { localStorage.setItem(LS + k, JSON.stringify(obj[k])); } catch (e) {} }); }
      },
      onChanged: { addListener() {} }
    },
    runtime: {
      sendMessage(m, cb) {
        if (!m) return;
        if (m.type === 'catalog') loadData().then(d => cb && cb({ clips: d.clips }));
        else if (m.type === 'translate') translate(m).then(text => cb && cb({ ok: true, text }), () => cb && cb({ ok: false }));
        else cb && setTimeout(() => cb({ ok: false }), 0);
      }
    }
  };

  // ---------- Oynatıcı ----------
  const wrap = () => document.getElementById('ytwrap');
  let player = null, ready = false, pending = null, range = null, rate = 1, lastRaw = -1, lastAt = 0, tapT = null, wantPlay = false;
  const H = window.SatzoHost = {
    onmsg: null,
    load(vid, from) {
      pending = { vid, from }; range = null; wantPlay = false;
      setTimeout(() => { if (pending && pending.vid === vid) wrap().classList.add('on'); }, 460); // kart yerine oturunca görünür
      if (ready) start();
    },
    post(m) {
      if (!ready || !m) return;
      try {
        if (m.satzo === 'fplay') {
          range = m.to != null ? { b: +m.to } : null;
          if (m.rate) { rate = +m.rate; player.setPlaybackRate(rate); }
          if (m.from != null) { player.seekTo(Math.max(0, +m.from), true); lastRaw = -1; }
          player.playVideo(); wantPlay = true;
          clearTimeout(tapT); tapT = setTimeout(() => { const s = player.getPlayerState(); if (wantPlay && s !== 1 && s !== 3) emit({ satzo: 'fneedtap' }); }, 2500);
        } else if (m.satzo === 'fpause') { range = null; wantPlay = false; player.pauseVideo(); }
        else if (m.satzo === 'frate') { rate = +m.rate || 1; player.setPlaybackRate(rate); }
        else if (m.satzo === 'fseek') player.seekTo(Math.max(0, +m.t), true);
      } catch (e) {}
    },
    stop() { pending = null; range = null; wantPlay = false; wrap().classList.remove('on'); try { ready && player.pauseVideo(); } catch (e) {} }
  };
  const emit = d => { try { H.onmsg && H.onmsg(d); } catch (e) {} };
  function start() {
    const p = pending; if (!p) return;
    try { player.loadVideoById({ videoId: p.vid, startSeconds: Math.floor(p.from || 0) }); } catch (e) {}
    loadData().then(d => {
      if (!pending || pending.vid !== p.vid) return;
      const raw = d.subs[p.vid];
      if (!raw || !raw.length) { emit({ satzo: 'fnocap' }); return; }
      emit({ satzo: 'fcues', vid: p.vid, cues: raw.map(c => ({ start: c[0], end: c[1], text: c[2], wt: null })) });
    });
  }
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('yt', {
      width: '100%', height: '100%', host: 'https://www.youtube-nocookie.com',
      playerVars: { playsinline: 1, controls: 0, rel: 0, disablekb: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0 },
      events: { onReady: () => { ready = true; if (pending) start(); } }
    });
  };
  setInterval(() => {
    if (!ready || !pending) return;
    let raw, st; try { raw = player.getCurrentTime() || 0; st = player.getPlayerState(); } catch (e) { return; }
    const now = performance.now();
    if (raw !== lastRaw) { lastRaw = raw; lastAt = now; }
    // API zamanı seyrek günceller: oynarken aradaki süreyi hızla çarpıp ekle (kelime takibi akıcı olsun)
    const t = st === 1 ? raw + Math.min(0.5, (now - lastAt) / 1000) * rate : raw;
    if (range && st === 1 && t >= range.b) { range = null; wantPlay = false; try { player.pauseVideo(); } catch (e) {} emit({ satzo: 'ft', t, paused: true, ad: false }); emit({ satzo: 'fend' }); return; }
    emit({ satzo: 'ft', t, paused: st !== 1 && st !== 3, ad: false });
  }, 80);
  const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s);
})();
