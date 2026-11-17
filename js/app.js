/* =====================================================================
   IPTV TIZEN - telas, navegação pelo controle remoto e fluxo do app
   ===================================================================== */
(function () {
  'use strict';

  var stage = document.getElementById('stage'), screen = document.getElementById('screen'), rail = document.getElementById('rail');
  var overlay = document.getElementById('overlay'), toastEl = document.getElementById('toast');
  var A = { list: null, cat: null, map: {}, scale: 1, hist: [], cur: null, focus: null, lastScreenFocus: null, prevFocus: null, loading: false };
  var SCR = {}, ACT = {}, LZ = {};

  /* ---------------- utilidades ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad2(n) { n = Math.floor(n); return (n < 10 ? '0' : '') + n; }
  function fmtT(ms) { var s = Math.max(0, Math.floor((ms || 0) / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s % 60); }
  function fmtHM(ms) { var m = Math.floor((ms || 0) / 60000); return m >= 60 ? Math.floor(m / 60) + 'h ' + pad2(m % 60) + 'm' : m + ' min'; }
  function clock(d) { d = d || new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function rateStr(v) { v = parseFloat(v); if (!v || isNaN(v)) return ''; if (v > 10) v = v / 10; return v.toFixed(1); }
  function norm(s) { s = String(s || '').toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {} return s; }
  function $(sel, root) { return (root || stage).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || stage).querySelectorAll(sel)); }
  function byAdded(arr, n) { return arr.slice().sort(function (a, b) { return (b.added || 0) - (a.added || 0); }).slice(0, n); }

  var IC = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    live: '<rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8M12 18v3M8 2l4 3 4-3"/>',
    movies: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18"/>',
    series: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M6 5h12M8 2h8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'
  };
  function ic(k) { return '<svg viewBox="0 0 24 24">' + IC[k] + '</svg>'; }
  var PLAY = '<svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21"/></svg>';
  var PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
  var RW = '<svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6zm.5-6 8.5 6V6z"/></svg>';
  var FF = '<svg viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6zm9-12v12l8.5-6z"/></svg>';
  var UP = '<svg viewBox="0 0 24 24"><path d="M12 5l8 10H4z"/></svg>';
  var DOWN = '<svg viewBox="0 0 24 24"><path d="M12 19l8-10H4z"/></svg>';

  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.className = 'on';
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.className = ''; }, ms || 3500);
  }

  /* ---------------- capas ---------------- */
  function fbHTML(name) { return '<div class="fb">' + Art.svg(Art.hash(name), 200, 300) + '<div class="ptitle">' + esc(name) + '</div></div>'; }
  window.imgErr = function (img) {
    var n = img.getAttribute('data-n') || '', d = document.createElement('div');
    d.innerHTML = fbHTML(n); if (img.parentNode) img.parentNode.replaceChild(d.firstChild, img);
  };
  window.logoErr = function (img) {
    var d = img.parentNode, n = img.getAttribute('data-n') || '';
    if (!d) return; d.className = d.className.replace(' img', ''); d.style.background = Art.color(n); d.innerHTML = esc(Art.initials(n));
  };
  function coverImg(url, name) { return '<img src="' + esc(url) + '" data-n="' + esc(name) + '" onerror="imgErr(this)">'; }
  function posterHTML(it, kind, o) {
    o = o || {};
    var r = rateStr(it.rating), sub = o.sub != null ? o.sub : [it.year, it.group].filter(Boolean).join(' · ');
    return '<div class="poster f' + (it.cover ? '' : ' tm') + '" data-a="' + (o.a || 'open') + '" data-p="' + esc(o.p || it.id) + '" data-fk="' + esc(o.fk || kind + ':' + it.id) + '" data-k="' + kind + '" data-id="' + esc(it.id) + '"' + (o.idx != null ? ' data-idx="' + o.idx + '"' : '') + '>' +
      '<div class="pc">' + (it.cover ? coverImg(it.cover, it.name) : fbHTML(it.name)) +
      (o.badge ? '<span class="pbadge">' + o.badge + '</span>' : '') + (r ? '<span class="prate">★ ' + r + '</span>' : '') +
      (o.prog ? '<div class="prog"><i style="width:' + o.prog + '%"></i></div>' : '') + '</div>' +
      '<div class="pcap">' + esc(it.name) + '<small>' + esc(sub) + '</small></div></div>';
  }
  function logoHTML(ch, cls) {
    return ch.logo ? '<div class="clogo img ' + (cls || '') + '"><img src="' + esc(ch.logo) + '" data-n="' + esc(ch.name) + '" onerror="logoErr(this)"></div>'
      : '<div class="clogo ' + (cls || '') + '" style="background:' + Art.color(ch.name) + '">' + esc(Art.initials(ch.name)) + '</div>';
  }
  /* Busca capa no TMDB para títulos sem imagem (se a chave estiver configurada) */
  function tmdbFill(root) {
    if (!Src.tmdbKey()) return;
    $$('.poster.tm', root || screen).forEach(function (el) {
      el.classList.remove('tm');
      var it = A.map[el.getAttribute('data-id')], kind = el.getAttribute('data-k');
      if (!it || (kind !== 'movie' && kind !== 'series')) return;
      Src.tmdb(kind, it).then(function (v) {
        if (!v || !v.cover) return;
        it.cover = v.cover; if (!it.plot && v.plot) it.plot = v.plot; if (!it.rating && v.rating) it.rating = v.rating;
        var fb = el.querySelector('.fb'); if (!fb) return;
        var d = document.createElement('div'); d.innerHTML = coverImg(v.cover, it.name); fb.parentNode.replaceChild(d.firstChild, fb);
      });
    });
  }

  /* ---------------- foco e navegação espacial ---------------- */
  function modalOn() { return overlay.className === 'on'; }
  function focusables() {
    var root = modalOn() ? overlay : stage;
    return $$('.f', root).filter(function (e) { return e.offsetParent !== null && (modalOn() || !overlay.contains(e)); });
  }
  function setFocus(el, noScroll) {
    if (!el) return;
    if (A.focus && A.focus !== el) A.focus.classList.remove('focus');
    A.focus = el; el.classList.add('focus');
    if (screen.contains(el)) A.lastScreenFocus = el;
    if (!noScroll) ensureVisible(el);
    var lzEl = el.parentNode && el.parentNode.getAttribute && el.parentNode.getAttribute('data-lz');
    if (lzEl && LZ[lzEl]) { var lz = LZ[lzEl], i = +el.getAttribute('data-idx'); if (i >= lz.n - lz.ahead && lz.n < lz.items.length) more(lz, lz.n + lz.step); }
    var s = A.cur && SCR[A.cur.name]; if (s && s.onFocus) s.onFocus(el, A.cur.p);
  }
  function ensureVisible(el) {
    var p = el.parentNode;
    while (p && p !== stage && p.classList) {
      if (p.classList.contains('vs') || p.classList.contains('hs')) scrollInto(p, el);
      p = p.parentNode;
    }
  }
  function scrollInto(box, el) {
    var b = box.getBoundingClientRect(), r = el.getBoundingClientRect(), s = A.scale, pad = 50 * s;
    if (box.classList.contains('hs')) {
      if (r.right > b.right - pad) box.scrollLeft += (r.right - b.right + pad) / s;
      else if (r.left < b.left + pad) box.scrollLeft -= (b.left + pad - r.left) / s;
    }
    if (box.classList.contains('vs')) {
      var padv = 30 * s;
      if (r.bottom > b.bottom - padv) box.scrollTop += (r.bottom - b.bottom + padv) / s;
      else if (r.top < b.top + padv) box.scrollTop -= (b.top + padv - r.top) / s;
    }
  }
  function move(dir) {
    var cur = A.focus && A.focus.offsetParent !== null && (!modalOn() || overlay.contains(A.focus)) ? A.focus : null, els = focusables();
    if (!cur) { setFocus(els[0]); return; }
    if (dir === 'right' && rail.contains(cur) && A.lastScreenFocus && screen.contains(A.lastScreenFocus) && A.lastScreenFocus.offsetParent !== null) { setFocus(A.lastScreenFocus); return; }
    var r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, best = null, bd = 1e12, h = dir === 'left' || dir === 'right';
    for (var i = 0; i < els.length; i++) {
      var e = els[i]; if (e === cur) continue;
      var q = e.getBoundingClientRect(), dx, dy;
      if (h) { dx = dir === 'right' ? q.left - r.right : r.left - q.right; if (dx < -8) continue; dy = Math.abs((q.top + q.height / 2) - cy); var ov = Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top); var d = Math.max(dx, 0) + (ov > 0 ? 0 : dy) * 4 + dy * .2; }
      else { dy = dir === 'down' ? q.top - r.bottom : r.top - q.bottom; if (dy < -8) continue; dx = Math.abs((q.left + q.width / 2) - cx); var ovh = Math.min(q.right, r.right) - Math.max(q.left, r.left); var d = Math.max(dy, 0) * 1.2 + (ovh > 0 ? dx * .3 : dx * 2.5); }
      if (d < bd) { bd = d; best = e; }
    }
    if (best && rail.contains(best) && !rail.contains(cur)) best = $('.nav.cur', rail) || best;
    if (best) setFocus(best);
  }
  function findFk(fk) { return fk ? $$('[data-fk]').filter(function (e) { return e.getAttribute('data-fk') === fk; })[0] : null; }
  function curFk() { return A.lastScreenFocus && A.lastScreenFocus.getAttribute('data-fk'); }

  /* listas longas: desenha aos poucos conforme o foco desce */
  function lazy(name, container, items, fn, p, step, ahead) {
    container.setAttribute('data-lz', name); container.innerHTML = '';
    var lz = { el: container, items: items, fn: fn, n: 0, step: step, ahead: ahead || step / 2, p: p, name: name };
    LZ[name] = lz; more(lz, Math.max(step, p['_n_' + name] || 0)); return lz;
  }
  function more(lz, upto) {
    var html = '', end = Math.min(lz.items.length, upto);
    for (var i = lz.n; i < end; i++) html += lz.fn(lz.items[i], i);
    if (html) lz.el.insertAdjacentHTML('beforeend', html);
    lz.n = end; lz.p['_n_' + lz.name] = end; tmdbFill(lz.el);
  }

  /* ---------------- telas / histórico ---------------- */
  var SECTION = { home: 'home', live: 'live', grid: null, movie: 'movies', serie: 'series', search: 'search', settings: 'settings', listform: 'settings', player: '' };
  var NAV = [['home', 'Início'], ['live', 'TV'], ['movies', 'Filmes'], ['series', 'Séries'], ['search', 'Buscar'], ['-'], ['settings', 'Ajustes']];
  function drawRail(name, p) {
    var sec = name === 'grid' ? p.type : SECTION[name];
    rail.innerHTML = '<div class="logo">IPTV<small>TIZEN</small></div>' + NAV.map(function (n) {
      return n[0] === '-' ? '<div class="grow"></div>' : '<div class="nav f' + (sec === n[0] ? ' cur' : '') + '" data-a="nav" data-p="' + n[0] + '">' + ic(n[0]) + n[1] + '</div>';
    }).join('');
  }
  function show(name, p, fk) {
    if (A.cur && SCR[A.cur.name].leave) SCR[A.cur.name].leave(A.cur.p);
    p = p || {}; A.cur = { name: name, p: p }; LZ = {}; A.focus = null; A.lastScreenFocus = null;
    drawRail(name, p);
    screen.innerHTML = SCR[name].render(p);
    if (SCR[name].init) SCR[name].init(p);
    tmdbFill(screen);
    var el = findFk(fk) || $('[data-def]', screen) || $('.f', screen) || $('.nav.cur', rail);
    setFocus(el);
  }
  function go(name, p) { if (A.cur && A.cur.name !== 'player') A.hist.push({ name: A.cur.name, p: A.cur.p, fk: curFk() }); else if (A.cur) A.hist.push({ name: A.cur.name, p: A.cur.p }); show(name, p); }
  function resetTo(name, p) { A.hist = name === 'home' || !A.cat ? [] : [{ name: 'home', p: {} }]; show(name, p); }
  function back() {
    if (A.loading) return;
    if (modalOn()) { closeModal(); return; }
    var s = A.cur && SCR[A.cur.name]; if (s && s.back && s.back(A.cur.p)) return;
    if (A.hist.length) { var h = A.hist.pop(); if (h.name === 'player') { back(); return; } show(h.name, h.p, h.fk); return; }
    if (A.cur && A.cur.name !== 'home' && A.cat) { show('home', {}); return; }
    askExit();
  }
  function refresh(fk) { if (A.cur) show(A.cur.name, A.cur.p, fk || curFk()); }

  /* ---------------- modal / carregamento ---------------- */
  function modal(html) {
    if (!modalOn()) A.prevFocus = A.focus;
    overlay.innerHTML = '<div class="mask">' + html + '</div>'; overlay.className = 'on';
    var el = $('[data-def]', overlay) || $('.f', overlay); if (el) setFocus(el);
  }
  function closeModal() {
    overlay.className = ''; overlay.innerHTML = '';
    if (A.prevFocus && A.prevFocus.offsetParent !== null) setFocus(A.prevFocus, true); else { var el = $('.f', screen); if (el) setFocus(el); }
  }
  function confirmBox(icon, title, text, okLabel, onOk, danger) {
    ACT._ok = onOk;
    modal('<div class="modal"><div class="ico" ' + (danger ? '' : 'style="background:rgba(124,92,255,.15);color:#a78bfa"') + '>' + ic(icon) + '</div><h3>' + esc(title) + '</h3><p>' + text + '</p>' +
      '<div><div class="btn f" data-a="close">Cancelar</div><div class="btn f ' + (danger ? 'danger' : 'pri') + '" data-a="_ok" data-def>' + esc(okLabel) + '</div></div></div>');
  }
  function loading(msg, sub) {
    A.loading = true;
    overlay.innerHTML = '<div class="mask"><div class="loading"><div class="spin big"></div><h3 id="ldm">' + esc(msg) + '</h3><p id="lds">' + esc(sub || '') + '</p></div></div>'; overlay.className = 'on';
  }
  function loadingSub(t) { var e = document.getElementById('lds'); if (e) e.textContent = t; }
  function loaded() { A.loading = false; overlay.className = ''; overlay.innerHTML = ''; }
  function askExit() {
    confirmBox('alert', 'Sair do IPTV TIZEN?', 'Você pode voltar quando quiser.', 'Sair', function () {
      try { tizen.application.getCurrentApplication().exit(); } catch (e) { closeModal(); toast('No navegador do PC não há como fechar o app.'); }
    }, true);
  }

  /* ---------------- carregar lista ativa ---------------- */
  function indexCat(cat) {
    A.map = {};
    cat.live.forEach(function (x, i) { x.n = i + 1; A.map[x.id] = x; });
    cat.movies.forEach(function (x) { A.map[x.id] = x; });
    cat.series.forEach(function (x) { A.map[x.id] = x; });
  }
  function loadActive(force) {
    var l = Store.active(); A.list = l; A.cat = null; A.map = {};
    if (!l) { loaded(); resetTo('listform', { first: true }); return; }
    Store.setActive(l.id);
    loading('Carregando “' + l.name + '”', 'Conectando…');
    (force ? Promise.resolve(null) : Store.cacheGet(l.id)).then(function (c) {
      if (c && Date.now() - c.t < CONFIG.CACHE_HORAS * 3600000) return c;
      return Src.load(l, loadingSub).then(function (cat) {
        Store.cachePut(l.id, cat);
        l.updated = Date.now(); l.counts = [cat.live.length, cat.movies.length, cat.series.length]; Store.upsert(l);
        return cat;
      }).catch(function (e) { if (c) { toast('Não foi possível atualizar (' + e.message + '). Usando a última cópia salva.', 6000); return c; } throw e; });
    }).then(function (cat) {
      A.cat = cat; indexCat(cat); loaded(); resetTo('home');
    }).catch(function (e) {
      loaded(); A.hist = [];
      show('settings', { m: 0 });
      ACT._ok = function () { closeModal(); loadActive(true); };
      modal('<div class="modal"><div class="ico">' + ic('alert') + '</div><h3>Não foi possível abrir a lista</h3><p>' + esc(e.message || e) + '</p>' +
        '<div><div class="btn f" data-a="close">Ver minhas listas</div><div class="btn f pri" data-a="_ok" data-def>Tentar de novo</div></div></div>');
    });
  }

  /* =====================================================================
     TELA: INÍCIO
     ===================================================================== */
  SCR.home = {
    render: function (p) {
      var c = A.cat; if (!c) return '<div class="gwrap"><div class="ttl">Nenhuma lista carregada</div><div class="btn pri f" data-a="nav" data-p="settings">Abrir ajustes</div></div>';
      var hero = p.hero;
      if (!hero) {
        var pool = byAdded(c.movies.filter(function (m) { return m.cover; }), 30);
        if (!pool.length) pool = byAdded(c.series.filter(function (m) { return m.cover; }), 30);
        hero = p.hero = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
      }
      var h = hero && A.map[hero], html = '<div class="home">';
      html += '<div class="topbar"><div class="pill"><span class="dot"></span>' + esc(A.list.name) + '</div><div class="pill" id="clock">' + clock() + '</div></div>';
      if (h) {
        var kind = h.id.charAt(0) === 'z' || h.id.charAt(0) === 's' ? 'series' : 'movie';
        html += '<div class="hero" id="hero">' + (h.cover ? '<img class="bg blur" src="' + esc(h.cover) + '" onerror="this.style.display=\'none\'"><img class="hp" src="' + esc(h.cover) + '" onerror="this.style.display=\'none\'">' : '<div class="bgsvg">' + Art.svg(Art.hash(h.name), 1600, 720) + '</div>') +
          '<div class="info"><div class="kicker">★ DESTAQUE · ' + (kind === 'movie' ? 'FILME' : 'SÉRIE') + '</div><h1>' + esc(h.name) + '</h1>' +
          '<div class="meta">' + (rateStr(h.rating) ? '<span class="star">★ ' + rateStr(h.rating) + '</span>' : '') + (h.year ? '<span>' + esc(h.year) + '</span>' : '') + '<span>' + esc(h.group) + '</span></div>' +
          '<p id="heroplot">' + esc(h.plot || '') + '</p><div>' +
          (kind === 'movie' ? '<div class="btn pri f" data-a="playmovie" data-p="' + h.id + '" data-fk="hero:play" data-def>' + PLAY + 'Assistir</div>' : '') +
          '<div class="btn f" data-a="open" data-k="' + kind + '" data-p="' + h.id + '" data-fk="hero:det"' + (kind === 'movie' ? '' : ' data-def') + '>Detalhes</div>' +
          '<div class="btn f" data-a="fav" data-k="' + kind + '" data-p="' + h.id + '" data-fk="hero:fav">' + (Store.isFav(A.list.id, kind, h.id) ? '✓ Na minha lista' : '+ Minha lista') + '</div></div></div></div>';
      }
      html += '<div class="homevs vs' + (h ? '' : ' nohero') + '">';
      // continuar assistindo
      var pr = Store.progs(A.list.id), pk = Object.keys(pr).sort(function (a, b) { return pr[b].t - pr[a].t; }).slice(0, 15);
      if (pk.length) html += row('Continuar assistindo', '', pk.map(function (k) {
        var v = pr[k], it = { id: k, name: v.title, cover: v.cover, year: '', group: '' };
        return posterHTML(it, 'resume', { a: 'resume', p: k, fk: 'cw:' + k, prog: Math.min(100, Math.round(v.pos / Math.max(1, v.dur) * 100)), sub: v.sub || ('Parou em ' + fmtT(v.pos)) });
      }).join(''));
      // minha lista
      var fv = Store.favs(A.list.id), mine = [];
      Object.keys(fv.movie || {}).forEach(function (id) { if (A.map[id]) mine.push([fv.movie[id], 'movie', A.map[id]]); });
      Object.keys(fv.series || {}).forEach(function (id) { if (A.map[id]) mine.push([fv.series[id], 'series', A.map[id]]); });
      mine.sort(function (a, b) { return b[0] - a[0]; });
      if (mine.length) html += row('Minha lista', '', mine.slice(0, 20).map(function (m) { return posterHTML(m[2], m[1], { fk: 'my:' + m[2].id }); }).join(''));
      // canais
      var fl = c.live.filter(function (x) { return fv.live && fv.live[x.id]; });
      var chs = (fl.length ? fl : c.live).slice(0, 15);
      if (chs.length) html += row(fl.length ? 'Canais favoritos' : 'Canais ao vivo', c.live.length + ' canais', chs.map(chCard).join(''));
      if (c.movies.length) html += row('Filmes adicionados recentemente', c.movies.length + ' filmes', byAdded(c.movies, 20).map(function (m) { return posterHTML(m, 'movie', { badge: 'NOVO', fk: 'rm:' + m.id }); }).join(''));
      if (c.series.length) html += row('Séries atualizadas', c.series.length + ' séries', byAdded(c.series, 20).map(function (m) { return posterHTML(m, 'series', { fk: 'rs:' + m.id }); }).join(''));
      c.movieGroups.slice(0, 4).forEach(function (g) {
        var its = c.movies.filter(function (m) { return m.group === g.name; }).slice(0, 20);
        html += row(g.name, g.count + ' filmes', its.map(function (m) { return posterHTML(m, 'movie', { fk: 'g' + g.name + ':' + m.id }); }).join(''));
      });
      if (!c.live.length && !c.movies.length && !c.series.length) html += '<div class="empty">A lista foi carregada mas está vazia.</div>';
      return html + '<div style="height:60px"></div></div></div>';
    },
    init: function (p) {
      var h = p.hero && A.map[p.hero];
      if (!h) return;
      var kind = h.vid ? 'movie' : (h.xid ? 'series' : null);
      var pr = kind === 'movie' ? Src.vodInfo(A.list, h) : (kind === 'series' ? Src.seriesInfo(A.list, h) : Src.tmdb(h.id.charAt(0) === 's' ? 'series' : 'movie', h));
      pr.then(function (v) {
        if (!v || !A.cur || A.cur.name !== 'home') return;
        var hero = document.getElementById('hero'), pl = document.getElementById('heroplot');
        if (pl && v.plot) pl.textContent = v.plot;
        if (hero && v.backdrop) { var bg = hero.querySelector('.bg'); if (bg) { bg.className = 'bg'; bg.src = v.backdrop; var hp = hero.querySelector('.hp'); if (hp) hp.style.display = 'none'; } }
      }).catch(function () {});
    },
    onFocus: function (el) {
      var vs = $('.homevs', screen), hero = document.getElementById('hero');
      if (!vs || !hero) return;
      var inRows = vs.contains(el);
      if (inRows && !vs.classList.contains('up')) { vs.classList.add('up'); vs.style.top = '110px'; hero.style.opacity = '.0'; }
      else if (!inRows && screen.contains(el) && vs.classList.contains('up')) { vs.classList.remove('up'); vs.style.top = ''; vs.scrollTop = 0; hero.style.opacity = ''; }
      if (inRows) ensureVisible(el);
    }
  };
  function row(title, sub, inner) { return '<div class="h2">' + esc(title) + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div><div class="row hs">' + inner + '</div>'; }
  function chCard(ch) {
    return '<div class="ch f" data-a="playlive" data-p="' + ch.id + '" data-fk="ch:' + ch.id + '"><div class="art">' + Art.svg(Art.hash(ch.group + ch.name), 300, 170) + '</div>' +
      '<div class="top">' + logoHTML(ch) + '<span class="livetag">AO VIVO</span></div><div class="bot"><b>' + esc(ch.name) + '</b><div class="now">' + esc(ch.group) + '</div></div></div>';
  }

  /* =====================================================================
     TELA: TV AO VIVO
     ===================================================================== */
  function liveItems(p) {
    var c = A.cat.live, f;
    if (p.g === -2) { f = Store.favs(A.list.id).live || {}; c = c.filter(function (x) { return f[x.id]; }); }
    else if (p.g >= 0 && A.cat.liveGroups[p.g]) { var gn = A.cat.liveGroups[p.g].name; c = c.filter(function (x) { return x.group === gn; }); }
    if (p.q) { var q = norm(p.q); c = c.filter(function (x) { return norm(x.name).indexOf(q) >= 0 || String(x.n) === p.q; }); }
    return c;
  }
  SCR.live = {
    render: function (p) {
      if (!A.cat) return '';
      if (p.g == null) p.g = -1;
      var favN = Object.keys(Store.favs(A.list.id).live || {}).length;
      var cats = [[-2, '★ Favoritos', favN], [-1, 'Todos', A.cat.live.length]].concat(A.cat.liveGroups.map(function (g, i) { return [i, g.name, g.count]; }));
      return '<div class="col c1"><div class="ttl">TV ao vivo</div><div class="sub">' + A.cat.live.length + ' canais</div>' +
        '<div class="colvs vs" style="top:170px" id="lcats">' + cats.map(function (c) {
          return '<div class="cat f' + (c[0] === p.g ? ' cur' : '') + '" data-a="lgroup" data-p="' + c[0] + '" data-fk="lg:' + c[0] + '"><div class="n">' + esc(c[1]) + '</div><span>' + c[2] + '</span></div>';
        }).join('') + '</div></div>' +
        '<div class="col c2"><div class="search f" data-a="edit" data-commit="lsearch" data-fk="lsearch">' + ic('search') + '<input id="lq" placeholder="Buscar canal por nome ou número…" value="' + esc(p.q || '') + '"></div>' +
        '<div class="colvs vs" style="top:140px;padding:6px 6px 0" id="lchs"></div></div>' +
        '<div class="col c3"><div class="pv" id="lpv"></div><div class="epg" id="lepg"></div>' +
        '<div class="hint">OK: assistir &nbsp; <b>Amarelo</b> ou <b>★</b> no player: favoritar</div></div>';
    },
    init: function (p) { this.fill(p); },
    fill: function (p) {
      var items = liveItems(p), box = document.getElementById('lchs'), favs = Store.favs(A.list.id).live || {};
      p._items = items;
      if (!items.length) { box.innerHTML = '<div class="empty">' + (p.g === -2 ? 'Nenhum favorito ainda. Abra um canal e aperte o botão ★ (ou a tecla amarela).' : 'Nenhum canal encontrado.') + '</div>'; this.preview(null); return; }
      lazy('lch', box, items, function (ch, i) {
        return '<div class="chrow f" data-a="playlist" data-p="' + i + '" data-idx="' + i + '" data-id="' + ch.id + '" data-fk="lc:' + ch.id + '"' + (i ? '' : ' data-def') + '><div class="num">' + ch.n + '</div>' + logoHTML(ch) +
          '<div class="tx"><b>' + esc(ch.name) + '</b><small>' + esc(ch.group) + '</small></div>' + (favs[ch.id] ? '<span class="fav">★</span>' : '') + '</div>';
      }, p, 40, 12);
    },
    onFocus: function (el, p) {
      if (!el.classList.contains('chrow')) return;
      var ch = A.map[el.getAttribute('data-id')], self = this;
      clearTimeout(this.t); this.t = setTimeout(function () { self.preview(ch); }, 350);
    },
    preview: function (ch) {
      var pv = document.getElementById('lpv'), epg = document.getElementById('lepg');
      if (!pv) return;
      if (!ch) { pv.innerHTML = ''; epg.innerHTML = ''; return; }
      pv.innerHTML = '<div class="art">' + Art.svg(Art.hash(ch.group + ch.name), 1280, 720) + '</div><div class="big">' + (ch.logo ? '<img src="' + esc(ch.logo) + '" onerror="this.style.display=\'none\'">' : esc(Art.initials(ch.name))) + '</div>' +
        '<div class="ov"><span class="livetag">AO VIVO</span><b>' + esc(ch.n + ' · ' + ch.name) + '</b></div>';
      epg.innerHTML = '<div class="h2">Programação</div>' + (ch.sid ? '<div class="empty" style="padding:20px 0">Carregando…</div>' : '<div class="empty" style="padding:20px 0">Esta lista não informa a programação.</div>');
      if (!ch.sid) return;
      Src.shortEpg(A.list, ch).then(function (list) {
        var e2 = document.getElementById('lepg'); if (!e2 || !A.focus || A.focus.getAttribute('data-id') !== ch.id) return;
        var now = Date.now();
        e2.innerHTML = '<div class="h2">Programação</div>' + (list.length ? list.slice(0, 4).map(function (x) {
          return '<div class="it' + (x.start <= now && x.end > now ? ' now' : '') + '"><time>' + (x.start ? clock(new Date(x.start)) : '') + '</time><div><b>' + esc(x.title) + '</b><p>' + esc(x.desc) + '</p></div></div>';
        }).join('') : '<div class="empty" style="padding:20px 0">Sem programação disponível.</div>');
      }).catch(function () { var e3 = document.getElementById('lepg'); if (e3) e3.innerHTML = '<div class="h2">Programação</div><div class="empty" style="padding:20px 0">Sem programação disponível.</div>'; });
    }
  };
  ACT.lgroup = function (v, el) {
    var p = A.cur.p; p.g = +v; p._n_lch = 0; p.q = '';
    var q = document.getElementById('lq'); if (q) q.value = '';
    $$('.cat', document.getElementById('lcats')).forEach(function (c) { c.classList.toggle('cur', c === el); });
    var box = document.getElementById('lchs'); box.scrollTop = 0;
    SCR.live.fill(p);
    var first = $('.chrow', box); if (first) setFocus(first);
  };
  ACT.lsearch = function (val) { var p = A.cur.p; p.q = val.trim(); p._n_lch = 0; if (p.q) { p.g = -1; $$('.cat').forEach(function (c) { c.classList.toggle('cur', c.getAttribute('data-p') === '-1'); }); } document.getElementById('lchs').scrollTop = 0; SCR.live.fill(p); var first = $('.chrow', screen); if (first) setFocus(first); };
  ACT.playlist = function (v) { var p = A.cur.p; openPlayer({ kind: 'live', items: p._items, idx: +v }); };
  ACT.playlive = function (id) { var ch = A.map[id]; if (!ch) return; var items = A.cat.live, idx = items.indexOf(ch); openPlayer({ kind: 'live', items: items, idx: idx }); };

  /* =====================================================================
     TELA: GRADE (FILMES / SÉRIES)
     ===================================================================== */
  function gridItems(p) {
    var all = p.type === 'movies' ? A.cat.movies : A.cat.series, gr = p.type === 'movies' ? A.cat.movieGroups : A.cat.seriesGroups, kind = p.type === 'movies' ? 'movie' : 'series';
    var c = all;
    if (p.g === -2) { var f = Store.favs(A.list.id)[kind] || {}; c = c.filter(function (x) { return f[x.id]; }); }
    else if (p.g === -3) c = byAdded(c, 200);
    else if (p.g >= 0 && gr[p.g]) { var gn = gr[p.g].name; c = c.filter(function (x) { return x.group === gn; }); }
    if (p.q) { var q = norm(p.q); c = c.filter(function (x) { return norm(x.name).indexOf(q) >= 0; }); }
    return c;
  }
  SCR.grid = {
    render: function (p) {
      if (!A.cat) return '';
      if (p.g == null) p.g = -1;
      var mv = p.type === 'movies', gr = mv ? A.cat.movieGroups : A.cat.seriesGroups, all = mv ? A.cat.movies : A.cat.series;
      var chips = [[-1, mv ? 'Todos' : 'Todas'], [-3, 'Adicionados recentemente'], [-2, '★ Minha lista']].concat(gr.map(function (g, i) { return [i, g.name]; }));
      return '<div class="gwrap"><div class="ghead"><div><div class="ttl">' + (mv ? 'Filmes' : 'Séries') + '</div><div class="count" id="gcount"></div></div>' +
        '<div class="search f" data-a="edit" data-commit="gsearch" data-fk="gsearch">' + ic('search') + '<input id="gq" placeholder="Buscar ' + (mv ? 'filme' : 'série') + '…" value="' + esc(p.q || '') + '"></div></div>' +
        '<div class="chips hs" id="gchips">' + chips.map(function (c) { return '<div class="chip f' + (c[0] === p.g ? ' cur' : '') + '" data-a="ggroup" data-p="' + c[0] + '" data-fk="gc:' + c[0] + '">' + esc(c[1]) + '</div>'; }).join('') + '</div>' +
        '</div><div class="gridvs vs" style="left:190px" id="gvs"><div class="grid" id="ggrid"></div><div style="height:40px"></div></div>' +
        (all.length ? '' : '<div class="gwrap" style="top:300px"><div class="empty">Esta lista não tem ' + (mv ? 'filmes' : 'séries') + '.</div></div>');
    },
    init: function (p) { this.fill(p); var c = $('.chip.cur', screen); if (c) { var b = document.getElementById('gchips'); b.scrollLeft = Math.max(0, c.offsetLeft - 300); } },
    fill: function (p) {
      var items = gridItems(p), kind = p.type === 'movies' ? 'movie' : 'series', box = document.getElementById('ggrid');
      document.getElementById('gcount').textContent = items.length + (p.type === 'movies' ? ' filmes' : ' séries') + (p.q ? ' para “' + p.q + '”' : '') + ' · ' + A.list.name;
      if (!items.length) { box.innerHTML = '<div class="empty">' + (p.g === -2 ? 'Nada na sua lista ainda. Abra um título e escolha “+ Minha lista”.' : 'Nada encontrado.') + '</div>'; return; }
      lazy('gr', box, items, function (it, i) { return posterHTML(it, kind, { idx: i }); }, p, 42, 14);
      var f0 = box.querySelector('.poster'); if (f0) f0.setAttribute('data-def', '');
    }
  };
  ACT.ggroup = function (v, el) {
    var p = A.cur.p; p.g = +v; p._n_gr = 0;
    $$('.chip', document.getElementById('gchips')).forEach(function (c) { c.classList.toggle('cur', c === el); });
    document.getElementById('gvs').scrollTop = 0; SCR.grid.fill(p);
  };
  ACT.gsearch = function (val) { var p = A.cur.p; p.q = val.trim(); p._n_gr = 0; document.getElementById('gvs').scrollTop = 0; SCR.grid.fill(p); var f = $('.poster', screen); if (f) setFocus(f); };

  /* =====================================================================
     TELA: BUSCA GERAL
     ===================================================================== */
  SCR.search = {
    render: function (p) {
      var html = '<div class="gwrap"><div class="ttl">Buscar</div><div class="sub">Procure em canais, filmes e séries da lista ativa.</div>' +
        '<div class="search f" style="width:900px;height:70px;font-size:24px" data-a="edit" data-commit="ssearch" data-fk="ssearch" data-def>' + ic('search') + '<input id="sq" placeholder="Digite o nome…" value="' + esc(p.q || '') + '"></div></div>';
      html += '<div class="homevs vs" style="top:290px;left:200px">';
      if (p.q && A.cat) {
        var q = norm(p.q), f = function (x) { return norm(x.name).indexOf(q) >= 0; };
        var ch = A.cat.live.filter(f).slice(0, 30), mv = A.cat.movies.filter(f).slice(0, 40), sr = A.cat.series.filter(f).slice(0, 40);
        if (ch.length) html += row('Canais', ch.length + (ch.length === 30 ? '+' : ''), ch.map(chCard).join(''));
        if (mv.length) html += row('Filmes', mv.length + (mv.length === 40 ? '+' : ''), mv.map(function (m) { return posterHTML(m, 'movie'); }).join(''));
        if (sr.length) html += row('Séries', sr.length + (sr.length === 40 ? '+' : ''), sr.map(function (m) { return posterHTML(m, 'series'); }).join(''));
        if (!ch.length && !mv.length && !sr.length) html += '<div class="empty">Nada encontrado para “' + esc(p.q) + '”.</div>';
      } else html += '<div class="empty">Aperte OK no campo acima para digitar.</div>';
      return html + '</div>';
    }
  };
  ACT.ssearch = function (val) { A.cur.p.q = val.trim(); refresh('ssearch'); var f = $('.homevs .f', screen); if (f) setFocus(f); };

  /* =====================================================================
     TELAS: DETALHE DO FILME E DA SÉRIE
     ===================================================================== */
  function detBg(it, seedAdd) {
    return it.cover ? '<img class="bg blur" id="dbg" src="' + esc(it.cover) + '" onerror="this.style.display=\'none\'">' : '<div class="bgsvg">' + Art.svg(Art.hash(it.name) + (seedAdd || 0), 1600, 900) + '</div>';
  }
  function setBackdrop(url) { var bg = document.getElementById('dbg'); if (bg && url) { bg.className = 'bg'; bg.src = url; } }
  function metaHTML(it, extra) {
    var r = rateStr(it.rating);
    return (r ? '<span class="star">★ ' + r + '</span>' : '') + (it.year ? '<span>' + esc(it.year) + '</span>' : '') + (extra || '') + '<span>' + esc(it.genre || it.group) + '</span>';
  }
  SCR.movie = {
    render: function (p) {
      var it = A.map[p.id]; if (!it) return '<div class="gwrap"><div class="empty">Título não encontrado.</div></div>';
      var pr = Store.progs(A.list.id)['m:' + it.id], fav = Store.isFav(A.list.id, 'movie', it.id);
      var similar = A.cat.movies.filter(function (m) { return m.group === it.group && m.id !== it.id; }).slice(0, 20);
      return '<div class="det">' + detBg(it) + '<div class="shade"></div><div class="dbox">' + posterHTML(it, 'movie', { a: 'none', fk: 'dp' }) +
        '<div class="dinfo"><div class="kicker">FILME</div><h1>' + esc(it.name) + '</h1><div class="meta" id="dmeta">' + metaHTML(it) + '</div>' +
        '<p id="dplot">' + esc(it.plot || '') + '</p><div class="cast" id="dcast"></div><div>' +
        (pr ? '<div class="btn pri f" data-a="playmovie" data-p="' + it.id + '" data-fk="dplay" data-def>' + PLAY + 'Continuar de ' + fmtT(pr.pos) + '</div><div class="btn f" data-a="playmovie0" data-p="' + it.id + '" data-fk="dplay0">Do início</div>'
          : '<div class="btn pri f" data-a="playmovie" data-p="' + it.id + '" data-fk="dplay" data-def>' + PLAY + 'Assistir</div>') +
        '<div class="btn f" data-a="fav" data-k="movie" data-p="' + it.id + '" data-fk="dfav">' + (fav ? '✓ Na minha lista' : '+ Minha lista') + '</div></div></div></div>' +
        (similar.length ? '<div class="drow"><div class="h2">Mais em ' + esc(it.group) + '</div><div class="row hs">' + similar.map(function (m) { return posterHTML(m, 'movie', { fk: 'sim:' + m.id }); }).join('') + '</div></div>' : '') + '</div>';
    },
    init: function (p) {
      var it = A.map[p.id]; if (!it) return;
      var pr = it.vid ? Src.vodInfo(A.list, it) : Src.tmdb('movie', it);
      pr.then(function (v) {
        if (!v || !A.cur || A.cur.name !== 'movie' || A.cur.p.id !== p.id) return;
        if (v.plot) document.getElementById('dplot').textContent = v.plot;
        if (v.rating && !it.rating) it.rating = v.rating;
        if (!it.year && v.year) it.year = v.year;
        it.genre = v.genre || it.genre;
        document.getElementById('dmeta').innerHTML = metaHTML(it, v.duration ? '<span>' + esc(v.duration) + '</span>' : '');
        var cast = [];
        if (v.director) cast.push('<b>Direção:</b> ' + esc(v.director));
        if (v.cast) cast.push('<b>Elenco:</b> ' + esc(v.cast));
        document.getElementById('dcast').innerHTML = cast.join(' &nbsp;·&nbsp; ');
        setBackdrop(v.backdrop);
        if (v.cover && !it.cover) { it.cover = v.cover; }
      }).catch(function () {});
    }
  };
  SCR.serie = {
    render: function (p) {
      var it = A.map[p.id]; if (!it) return '<div class="gwrap"><div class="empty">Série não encontrada.</div></div>';
      var fav = Store.isFav(A.list.id, 'series', it.id);
      return '<div class="det">' + detBg(it, 7) + '<div class="shade"></div><div class="dbox" style="top:80px">' + posterHTML(it, 'series', { a: 'none', fk: 'dp' }) +
        '<div class="dinfo"><div class="kicker">SÉRIE</div><h1>' + esc(it.name) + '</h1><div class="meta" id="dmeta">' + metaHTML(it) + '</div>' +
        '<p id="dplot">' + esc(it.plot || '') + '</p><div id="dbtns"><div class="btn pri f" data-a="playnext" data-p="' + it.id + '" data-fk="dplay" id="bnext" data-def>' + PLAY + 'Assistir</div>' +
        '<div class="btn f" data-a="fav" data-k="series" data-p="' + it.id + '" data-fk="dfav">' + (fav ? '✓ Na minha lista' : '+ Minha lista') + '</div></div></div></div>' +
        '<div class="drow" id="deps"><div class="empty">' + (it.xid ? 'Carregando temporadas…' : '') + '</div></div></div>';
    },
    init: function (p) {
      var it = A.map[p.id], self = this; if (!it) return;
      if (it.seasons) { p.info = { seasons: it.seasons }; self.eps(p); return; }
      if (p.info) { self.eps(p); return; }
      if (it.xid) Src.seriesInfo(A.list, it).then(function (v) {
        if (!A.cur || A.cur.name !== 'serie' || A.cur.p.id !== p.id) return;
        p.info = v;
        if (v.plot) document.getElementById('dplot').textContent = v.plot;
        it.genre = v.genre || it.genre; if (!it.year && v.year) it.year = v.year;
        document.getElementById('dmeta').innerHTML = metaHTML(it, '<span>' + Object.keys(v.seasons).length + ' temporada(s)</span>');
        setBackdrop(v.backdrop);
        self.eps(p);
      }).catch(function (e) { var d = document.getElementById('deps'); if (d) d.innerHTML = '<div class="empty">Não foi possível carregar os episódios (' + esc(e.message) + ').</div>'; });
    },
    eps: function (p) {
      var it = A.map[p.id], ss = Object.keys(p.info.seasons).sort(function (a, b) { return a - b; }), d = document.getElementById('deps');
      if (!ss.length) { d.innerHTML = '<div class="empty">Nenhum episódio disponível.</div>'; return; }
      var nx = nextEp(it, p.info);
      if (p.s == null || !p.info.seasons[p.s]) p.s = nx ? nx.s : ss[0];
      var b = document.getElementById('bnext');
      if (b && nx) b.innerHTML = PLAY + (nx.pos ? 'Continuar T' + nx.s + ':E' + nx.ep.n : 'Assistir T' + nx.s + ':E' + nx.ep.n);
      var pr = Store.progs(A.list.id), eps = p.info.seasons[p.s];
      d.innerHTML = '<div class="chips hs" style="margin-bottom:4px">' + ss.map(function (s) {
        return '<div class="chip f' + (String(s) === String(p.s) ? ' cur' : '') + '" data-a="season" data-p="' + s + '" data-fk="ss:' + s + '">Temporada ' + s + '</div>';
      }).join('') + '</div><div class="row hs">' + eps.map(function (e, i) {
        var g = pr['e:' + e.id], pc = g ? Math.min(100, Math.round(g.pos / Math.max(1, g.dur) * 100)) : 0;
        return '<div class="ep f" data-a="playep" data-p="' + i + '" data-fk="ep:' + e.id + '"><div class="th">' + (e.cover ? '<img src="' + esc(e.cover) + '" onerror="this.style.display=\'none\'">' : '') +
          (e.cover ? '' : '<div class="fb">' + Art.svg(Art.hash(it.name + e.id), 380, 214) + '</div>') +
          '<span class="n">EP ' + e.n + '</span>' + (e.dur ? '<span class="d">' + esc(e.dur) + '</span>' : '') + (pc ? '<div class="prog"><i style="width:' + pc + '%"></i></div>' : '') + '</div>' +
          '<b>' + e.n + '. ' + esc(e.title) + '</b><small>' + (g ? (g.done ? 'Assistido' : 'Parou em ' + fmtT(g.pos)) : '') + '</small></div>';
      }).join('') + '</div>';
    }
  };
  function nextEp(it, info) {
    var pr = Store.progs(A.list.id), best = null;
    Object.keys(pr).forEach(function (k) { var v = pr[k]; if (v.ref && v.ref.sid === it.id && (!best || v.t > best.t)) best = v; });
    var ss = Object.keys(info.seasons).sort(function (a, b) { return a - b; });
    if (best) {
      var eps = info.seasons[best.ref.s] || [], i = -1;
      eps.forEach(function (e, k) { if (e.id === best.ref.eid) i = k; });
      if (i >= 0) {
        if (!best.done) return { s: best.ref.s, i: i, ep: eps[i], pos: best.pos };
        if (i + 1 < eps.length) return { s: best.ref.s, i: i + 1, ep: eps[i + 1] };
        var si = ss.indexOf(String(best.ref.s)); if (si >= 0 && si + 1 < ss.length) return { s: ss[si + 1], i: 0, ep: info.seasons[ss[si + 1]][0] };
      }
    }
    var f = info.seasons[ss[0]]; return f && f.length ? { s: ss[0], i: 0, ep: f[0] } : null;
  }
  ACT.season = function (s) { var p = A.cur.p; p.s = s; SCR.serie.eps(p); var c = findFk('ss:' + s); if (c) setFocus(c); };
  ACT.playep = function (i) { var p = A.cur.p; playEpisode(A.map[p.id], p.info, p.s, +i); };
  ACT.playnext = function () { var p = A.cur.p, it = A.map[p.id]; if (!p.info) { toast('Aguarde, carregando episódios…'); return; } var nx = nextEp(it, p.info); if (nx) playEpisode(it, p.info, nx.s, nx.i); };
  function playEpisode(it, info, s, i) {
    var eps = info.seasons[s], e = eps && eps[i]; if (!e) return;
    var g = Store.progs(A.list.id)['e:' + e.id];
    openPlayer({ kind: 'ep', url: e.url, title: it.name, sub: 'T' + s + ':E' + e.n + ' · ' + e.title, key: 'e:' + e.id, cover: it.cover || e.cover,
      resume: g && !g.done ? g.pos : 0, ref: { sid: it.id, s: s, eid: e.id }, series: it, info: info, s: s, i: i });
  }
  ACT.playmovie = function (id, el, fromStart) {
    var it = A.map[id]; if (!it) return;
    var g = Store.progs(A.list.id)['m:' + it.id];
    openPlayer({ kind: 'movie', url: it.url, title: it.name, sub: [it.year, it.group].filter(Boolean).join(' · '), key: 'm:' + it.id, cover: it.cover, resume: fromStart || !g ? 0 : g.pos, ref: { mid: it.id } });
  };
  ACT.playmovie0 = function (id, el) { ACT.playmovie(id, el, true); };
  ACT.resume = function (k) {
    var v = Store.progs(A.list.id)[k]; if (!v) return;
    if (v.ref && v.ref.mid) { ACT.playmovie(v.ref.mid); return; }
    if (v.ref && v.ref.sid) {
      var it = A.map[v.ref.sid]; if (!it) return;
      if (it.seasons) { playEpisode(it, { seasons: it.seasons }, v.ref.s, indexOfEp(it.seasons[v.ref.s], v.ref.eid)); return; }
      loading('Abrindo ' + it.name + '…');
      Src.seriesInfo(A.list, it).then(function (info) { loaded(); playEpisode(it, info, v.ref.s, indexOfEp(info.seasons[v.ref.s], v.ref.eid)); })
        .catch(function (e) { loaded(); toast('Não foi possível abrir: ' + e.message); });
    }
  };
  function indexOfEp(eps, eid) { var r = 0; (eps || []).forEach(function (e, i) { if (e.id === eid) r = i; }); return r; }
  ACT.open = function (id, el) {
    var k = el && el.getAttribute('data-k'); if (!k) k = id.charAt(0) === 'z' || id.charAt(0) === 's' ? 'series' : 'movie';
    if (k === 'movie') go('movie', { id: id }); else if (k === 'series') go('serie', { id: id });
  };
  ACT.fav = function (id, el) {
    var k = el.getAttribute('data-k'), on = Store.toggleFav(A.list.id, k, id);
    el.innerHTML = on ? '✓ Na minha lista' : '+ Minha lista';
    toast(on ? 'Adicionado à Minha lista' : 'Removido da Minha lista');
  };
  ACT.none = function () {};

  /* =====================================================================
     TELA: PLAYER
     ===================================================================== */
  var PL = { hideT: 0, saveT: 0, zapT: 0, zapBuf: '', aud: -1, sub: -1 };
  function openPlayer(o) { go('player', o); }
  SCR.player = {
    render: function (p) {
      var live = p.kind === 'live';
      return '<div class="player" id="pl"><div class="pspin"></div><div class="subs" id="psub"></div><div class="zap" id="pzap"></div>' +
        '<div class="perr"><b>Ops!</b><span id="perrm"></span><div style="margin-top:28px"><div class="btn f" data-a="pretry">Tentar de novo</div><div class="btn f" data-a="back">Voltar</div></div></div>' +
        '<div class="ui"><div class="top" id="ptop"></div><div class="bot">' +
        (live ? '<div class="tl"><span class="livetag">AO VIVO</span><span id="pnow" style="margin-left:20px;color:#c9cdd8"></span></div>'
          : '<div class="tl"><span id="pcur">0:00</span><div class="track"><i id="pbar"></i></div><span id="pdur">--:--</span></div>') +
        '<div class="ctr"><div><div class="btn f" data-a="paudio" id="baud">Áudio</div></div><div class="mid">' +
        (live ? '<div class="rb f" data-a="pzap" data-p="-1">' + UP + '</div><div class="rb big f" data-a="ptoggle" id="bpp" data-def>' + PAUSE + '</div><div class="rb f" data-a="pzap" data-p="1">' + DOWN + '</div>'
          : '<div class="rb f" data-a="pseek" data-p="-10000">' + RW + '</div><div class="rb big f" data-a="ptoggle" id="bpp" data-def>' + PAUSE + '</div><div class="rb f" data-a="pseek" data-p="30000">' + FF + '</div>') +
        '</div><div>' + (live ? '<div class="btn f" data-a="pfav" id="bfav">★ Favoritar</div>' : '<div class="btn f" data-a="psubt" id="bsub">Legenda: Desativada</div>') + '</div></div></div></div></div>';
    },
    init: function (p) { document.body.classList.add('playing'); PL.aud = -1; PL.sub = -1; this.start(p); },
    start: function (p) {
      var live = p.kind === 'live', ch = live ? p.items[p.idx] : null, url = live ? ch.url : p.url;
      var pl = document.getElementById('pl'); pl.className = 'player buffering';
      document.getElementById('psub').textContent = '';
      document.getElementById('ptop').innerHTML = (live ? logoHTML(ch) : '') + '<div><h2>' + esc(live ? ch.n + ' · ' + ch.name : p.title) + '</h2><p>' + esc(live ? ch.group : p.sub || '') + '</p></div>';
      if (live) { var bf = document.getElementById('bfav'); if (bf) bf.innerHTML = Store.isFav(A.list.id, 'live', ch.id) ? '★ Favorito' : '☆ Favoritar'; this.nowNext(ch); }
      showUI();
      Player.open(url, {
        live: live, resume: p.resume || 0,
        listeners: {
          onBuffer: function (b) { var e = document.getElementById('pl'); if (e) e.classList.toggle('buffering', !!b); },
          onReady: function () { var e = document.getElementById('pl'); if (e) e.classList.remove('buffering'); },
          onTime: function (ms, dur) {
            if (live) return; var c = document.getElementById('pcur'); if (!c) return;
            c.textContent = fmtT(ms); if (dur > 0) { document.getElementById('pdur').textContent = fmtT(dur); document.getElementById('pbar').style.width = Math.min(100, ms / dur * 100) + '%'; }
          },
          onSubtitle: function (t) { var s = document.getElementById('psub'); if (s) s.textContent = String(t || '').replace(/<[^>]+>/g, ''); },
          onEnd: function () { saveProg(true); if (p.kind === 'ep' && p.info) { var eps = p.info.seasons[p.s]; if (eps && p.i + 1 < eps.length) { toast('Próximo episódio…'); A.cur.p = p = nextEpParams(p); SCR.player.start(p); return; } } back(); },
          onError: function (m) { var e = document.getElementById('pl'); if (!e) return; e.className = 'player error'; document.getElementById('perrm').textContent = m; var b = $('.perr .f', e); if (b) setFocus(b); }
        }
      });
      clearInterval(PL.saveT); if (!live) PL.saveT = setInterval(function () { saveProg(false); }, 15000);
    },
    nowNext: function (ch) {
      var el = document.getElementById('pnow'); if (!el) return; el.textContent = ch.group;
      if (ch.sid) Src.shortEpg(A.list, ch).then(function (l) {
        var now = Date.now(), cur = l.filter(function (x) { return x.start <= now && x.end > now; })[0];
        var e2 = document.getElementById('pnow'); if (e2 && cur) e2.textContent = 'Agora: ' + cur.title + ' (até ' + clock(new Date(cur.end)) + ')';
      }).catch(function () {});
    },
    leave: function () { saveProg(true); clearInterval(PL.saveT); clearTimeout(PL.hideT); Player.stop(); document.body.classList.remove('playing'); },
    key: function (k) {
      var p = A.cur.p, live = p.kind === 'live', pl = document.getElementById('pl'), hidden = pl && pl.classList.contains('hide'), err = pl && pl.classList.contains('error');
      if (err) return false;
      if (k === 'PlayPause' || k === 'Play' || k === 'Pause') { ACT.ptoggle(); return true; }
      if (k === 'Stop') { back(); return true; }
      if (k === 'FF') { ACT.pseek(30000); return true; }
      if (k === 'RW') { ACT.pseek(-10000); return true; }
      if (live && (k === 'ChUp' || (k === 'up' && hidden))) { ACT.pzap(-1); return true; }
      if (live && (k === 'ChDown' || (k === 'down' && hidden))) { ACT.pzap(1); return true; }
      if (live && k === 'Yellow') { ACT.pfav(); return true; }
      if (live && /^\d$/.test(k)) { zapDigit(k); return true; }
      if (hidden) {
        if (!live && (k === 'left' || k === 'right')) { ACT.pseek(k === 'left' ? -10000 : 10000); return true; }
        showUI(); return true;
      }
      showUI(); return false;
    }
  };
  function nextEpParams(p) {
    var eps = p.info.seasons[p.s], e = eps[p.i + 1];
    return { kind: 'ep', url: e.url, title: p.title, sub: 'T' + p.s + ':E' + e.n + ' · ' + e.title, key: 'e:' + e.id, cover: p.cover, resume: 0,
      ref: { sid: p.ref.sid, s: p.s, eid: e.id }, series: p.series, info: p.info, s: p.s, i: p.i + 1 };
  }
  function showUI() {
    var pl = document.getElementById('pl'); if (!pl) return; pl.classList.remove('hide');
    clearTimeout(PL.hideT); PL.hideT = setTimeout(function () { var e = document.getElementById('pl'); if (e && !e.classList.contains('error')) e.classList.add('hide'); }, 5000);
  }
  function saveProg(final) {
    if (!A.cur || A.cur.name !== 'player') return;
    var p = A.cur.p; if (p.kind === 'live' || !A.list) return;
    var pos = Player.current(), dur = Player.duration();
    if (!dur || pos < 15000) return;
    var done = pos / dur > 0.93;
    if (p.kind === 'movie' && done) { Store.setProg(A.list.id, p.key, null); return; }
    Store.setProg(A.list.id, p.key, { pos: done ? 0 : pos, dur: dur, t: Date.now(), title: p.title, sub: p.kind === 'ep' ? p.sub : '', cover: p.cover, ref: p.ref, done: done });
  }
  function zapDigit(d) {
    PL.zapBuf = (PL.zapBuf + d).slice(-4); var z = document.getElementById('pzap'); if (z) z.textContent = PL.zapBuf;
    clearTimeout(PL.zapT);
    PL.zapT = setTimeout(function () {
      var n = +PL.zapBuf; PL.zapBuf = ''; var z2 = document.getElementById('pzap'); if (z2) z2.textContent = '';
      var ch = A.cat.live[n - 1]; if (!ch) { toast('Canal ' + n + ' não existe'); return; }
      var p = A.cur.p; p.items = A.cat.live; p.idx = n - 1; SCR.player.start(p);
    }, 1500);
  }
  ACT.ptoggle = function () { var on = Player.toggle(); var b = document.getElementById('bpp'); if (b) b.innerHTML = on ? PAUSE : PLAY; showUI(); };
  ACT.pseek = function (ms) { Player.seekBy(+ms); showUI(); toast((+ms > 0 ? '+' : '−') + Math.abs(ms / 1000) + 's', 900); };
  ACT.pzap = function (d) { var p = A.cur.p, n = p.items.length; if (!n) return; p.idx = (p.idx + (+d) + n) % n; SCR.player.start(p); };
  ACT.pretry = function () { var p = A.cur.p; if (p.kind !== 'live') p.resume = Player.current() || p.resume; SCR.player.start(p); setFocus(document.getElementById('bpp')); };
  ACT.pfav = function () { var p = A.cur.p, ch = p.items[p.idx], on = Store.toggleFav(A.list.id, 'live', ch.id); var b = document.getElementById('bfav'); if (b) b.innerHTML = on ? '★ Favorito' : '☆ Favoritar'; toast(on ? '★ ' + ch.name + ' nos favoritos' : ch.name + ' removido dos favoritos'); };
  ACT.paudio = function () {
    var t = Player.tracks('AUDIO'); if (t.length < 2) { toast(t.length ? 'Só existe uma faixa de áudio' : 'Faixas de áudio indisponíveis'); return; }
    PL.aud = (PL.aud + 1) % t.length; Player.selectTrack('AUDIO', t[PL.aud].index); document.getElementById('baud').textContent = 'Áudio: ' + t[PL.aud].label; showUI();
  };
  ACT.psubt = function () {
    var t = Player.tracks('TEXT'); if (!t.length) { toast('Este vídeo não tem legendas embutidas'); return; }
    PL.sub = PL.sub + 1 >= t.length ? -1 : PL.sub + 1;
    Player.selectTrack('TEXT', PL.sub < 0 ? -1 : t[PL.sub].index);
    if (PL.sub < 0) document.getElementById('psub').textContent = '';
    document.getElementById('bsub').textContent = 'Legenda: ' + (PL.sub < 0 ? 'Desativada' : t[PL.sub].label); showUI();
  };

  /* =====================================================================
     TELA: AJUSTES
     ===================================================================== */
  var SMENU = [['list', 'Minhas listas'], ['phone', 'Celular'], ['image', 'Capas'], ['info', 'Sobre']];
  SCR.settings = {
    render: function (p) {
      p.m = p.m || 0;
      var html = '<div class="smenu"><div class="ttl">Ajustes</div><div class="sub">IPTV TIZEN v' + CONFIG.VERSAO + '</div>' + SMENU.map(function (m, i) {
        return '<div class="cat f' + (i === p.m ? ' cur' : '') + '" data-a="smenu" data-p="' + i + '" data-fk="sm:' + i + '"><div class="n">' + ic(m[0]) + m[1] + '</div></div>';
      }).join('') + '</div><div class="sbody">';
      if (p.m === 0) {
        var ls = Store.lists(), act = Store.active();
        html += '<div class="ttl" style="font-size:34px">Minhas listas</div><div class="sub">Escolha qual lista fica ativa. Você pode ter várias listas salvas.</div><div class="vs">';
        ls.forEach(function (l) {
          var on = act && act.id === l.id, xt = l.type === 'xtream', col = xt ? '#22d3ee' : '#7c5cff';
          html += '<div class="lcard' + (on ? ' active' : '') + '"><div class="lic" style="background:' + col + '22;color:' + col + '">' + (xt ? 'XC' : 'M3U') + '</div>' +
            '<div class="tx"><b>' + esc(l.name) + (on ? '<span class="ok">● ATIVA</span>' : '') + '</b><code>' + esc(xt ? 'DNS: ' + l.server + ' · usuário: ' + l.user : l.url) + '</code>' +
            '<div class="stats">' + (l.counts ? '<span><i>Canais</i> ' + l.counts[0] + '</span><span><i>Filmes</i> ' + l.counts[1] + '</span><span><i>Séries</i> ' + l.counts[2] + '</span>' : '') +
            (l.updated ? '<span><i>Atualizada</i> ' + new Date(l.updated).toLocaleDateString('pt-BR') + ' ' + clock(new Date(l.updated)) + '</span>' : '<span><i>Ainda não carregada</i></span>') + '</div></div>' +
            (on ? '' : '<div class="ibtn f" data-a="lactivate" data-p="' + l.id + '" data-fk="la:' + l.id + '">' + ic('check') + '</div>') +
            '<div class="ibtn f" data-a="lrefresh" data-p="' + l.id + '" data-fk="lr:' + l.id + '">' + ic('refresh') + '</div>' +
            '<div class="ibtn f" data-a="ledit" data-p="' + l.id + '" data-fk="le:' + l.id + '">' + ic('edit') + '</div>' +
            '<div class="ibtn del f" data-a="ldel" data-p="' + l.id + '" data-fk="ld:' + l.id + '">' + ic('trash') + '</div></div>';
        });
        html += '<div class="addcard f" data-a="ladd" data-fk="ladd"' + (ls.length ? '' : ' data-def') + '>＋ Adicionar nova lista</div>' +
          '<div class="hint">Ícones: ✓ ativar · ⟳ recarregar do servidor · ✎ editar · 🗑 excluir</div><div style="height:40px"></div></div>';
      } else if (p.m === 1) {
        var relay = relayUrl();
        html += '<div class="ttl" style="font-size:34px">Adicionar lista pelo celular</div><div class="sub">Endereço do seu “relay” (Worker da Cloudflare). Veja o passo a passo no LEIA-ME.</div>' +
          '<div class="fld" style="max-width:1100px"><label>Endereço do relay</label><div class="inp f" data-a="edit" data-commit="setrelay" data-fk="relay" data-def><input id="relay" placeholder="https://iptv-tizen.seu-usuario.workers.dev" value="' + esc(relay) + '"></div></div>' +
          '<div class="para">' + (relay ? 'Configurado ✓ — na tela <b>Adicionar lista</b> vai aparecer o QR Code e o código para enviar a lista pelo celular.' : 'Sem relay configurado, você ainda pode adicionar listas digitando pelo controle remoto.') + '</div>';
      } else if (p.m === 2) {
        var tk = Src.tmdbKey();
        html += '<div class="ttl" style="font-size:34px">Capas e sinopses</div><div class="sub">As capas vêm da sua lista. Quando faltar, o app pode buscar no TMDB (grátis).</div>' +
          '<div class="fld" style="max-width:1100px"><label>Chave de API do TMDB (v3)</label><div class="inp f" data-a="edit" data-commit="settmdb" data-fk="tmdb" data-def><input id="tmdbk" placeholder="cole aqui a chave (opcional)" value="' + esc(tk) + '"></div></div>' +
          '<div class="para">Crie a chave em <b>themoviedb.org</b> → Configurações → API. Sem a chave, títulos sem imagem recebem uma <b>capa automática</b> com o nome do título.</div>' +
          '<div class="btn f" data-a="clrtmdb" data-fk="clrtmdb">Limpar cache de capas</div>';
      } else {
        var c = A.cat, l2 = A.list;
        html += '<div class="ttl" style="font-size:34px">Sobre</div><div class="sub">IPTV TIZEN — player de listas M3U e contas Xtream para TVs Samsung.</div>' +
          '<div class="para">Versão <b>' + CONFIG.VERSAO + '</b> · Player: <b>' + (Player.isTV ? 'Samsung AVPlay' : 'HTML5 (navegador)') + '</b></div>' +
          (l2 ? '<div class="para">Lista ativa: <b>' + esc(l2.name) + '</b>' + (c ? ' — ' + c.live.length + ' canais, ' + c.movies.length + ' filmes, ' + c.series.length + ' séries' : '') +
            (c && c.exp ? '<br>Conta vence em <b>' + new Date(c.exp * 1000).toLocaleDateString('pt-BR') + '</b>' : '') + '</div>' : '') +
          '<div class="para">Este app não fornece nenhum conteúdo: ele apenas reproduz as listas que você adiciona.</div>' +
          '<div class="btn f" data-a="lrefreshall" data-fk="rall" data-def>Recarregar lista ativa</div>';
      }
      return html + '</div>';
    }
  };
  ACT.smenu = function (i) { A.cur.p.m = +i; refresh('sm:' + i); };
  ACT.ladd = function () { go('listform', {}); };
  ACT.ledit = function (id) { go('listform', { id: id }); };
  ACT.lactivate = function (id) { Store.setActive(id); loadActive(false); };
  ACT.lrefresh = function (id) { Store.setActive(id); loadActive(true); };
  ACT.lrefreshall = function () { loadActive(true); };
  ACT.ldel = function (id) {
    var l = Store.lists().filter(function (x) { return x.id === id; })[0]; if (!l) return;
    confirmBox('trash', 'Excluir “' + l.name + '”?', 'A lista, os favoritos e o histórico dela serão removidos desta TV.<br>Essa ação não pode ser desfeita.', 'Excluir', function () {
      var wasActive = A.list && A.list.id === id;
      Store.remove(id); closeModal(); toast('Lista excluída');
      if (wasActive) loadActive(false); else refresh();
    }, true);
  };
  ACT.setrelay = function (v) { Store.set('it.relay', v.trim().replace(/\/+$/, '')); toast(v.trim() ? 'Relay salvo' : 'Relay removido'); refresh('relay'); };
  ACT.settmdb = function (v) { Store.set('it.tmdb', v.trim()); toast(v.trim() ? 'Chave do TMDB salva' : 'Chave removida'); };
  ACT.clrtmdb = function () { try { localStorage.removeItem('it.tmdbc'); } catch (e) {} toast('Cache de capas limpo (vale após reiniciar o app)'); };
  function relayUrl() { return (Store.get('it.relay', '') || CONFIG.RELAY_URL || '').replace(/\/+$/, ''); }

  /* =====================================================================
     TELA: ADICIONAR / EDITAR LISTA (+ celular)
     ===================================================================== */
  var RL = { t: 0, code: '' };
  SCR.listform = {
    render: function (p) {
      var l = p.id ? Store.lists().filter(function (x) { return x.id === p.id; })[0] : null;
      if (!p.tab) p.tab = l ? l.type : 'm3u';
      var xt = p.tab === 'xtream', relay = relayUrl();
      RL.code = String(Math.floor(100000 + Math.random() * 900000));
      var html = '<div class="addl"><div class="ttl">' + (p.first ? 'Bem-vindo ao IPTV TIZEN' : l ? 'Editar lista' : 'Adicionar lista') + '</div>' +
        '<div class="sub">' + (p.first ? 'Para começar, adicione sua lista M3U ou sua conta (DNS, usuário e senha).' : 'Digite pelo controle remoto' + (relay ? ' ou use o celular (ao lado).' : '.')) + '</div>' +
        '<div class="tabs"><div class="tab f' + (xt ? '' : ' cur') + '" data-a="ltab" data-p="m3u" data-fk="t:m3u">Link M3U</div><div class="tab f' + (xt ? ' cur' : '') + '" data-a="ltab" data-p="xtream" data-fk="t:xtream">Conta (DNS · usuário · senha)</div></div>' +
        fld('Nome da lista', 'fname', l ? l.name : '', xt ? 'Ex.: Conta da sala' : 'Ex.: Lista principal');
      if (xt) html += fld('URL / DNS do servidor', 'fserver', l && l.server || '', 'http://dns.servidor.com:8080') +
        '<div class="two">' + fld('Usuário', 'fuser', l && l.user || '', '') + fld('Senha', 'fpass', l && l.pass || '', '') + '</div>';
      else html += fld('Link da lista M3U', 'furl', l && l.url || '', 'http://servidor.com/get.php?username=...&type=m3u_plus');
      html += '<div style="margin-top:14px"><div class="btn pri f" data-a="lsave" data-fk="lsave">Salvar e carregar</div><div class="btn f" data-a="ltest" data-fk="ltest">Testar conexão</div>' +
        (p.first ? '' : '<div class="btn f" data-a="back">Cancelar</div>') + '</div><div class="msg" id="fmsg"></div></div>';
      if (relay) {
        var link = relay + '/?c=' + RL.code;
        html += '<div class="addr"><h3>Adicione pelo celular</h3><p>Aponte a câmera para o QR Code ou acesse<br><b style="color:#fff">' + esc(relay.replace(/^https?:\/\//, '')) + '</b> e digite o código:</p>' +
          '<div class="qr">' + QR.svg(link) + '</div><div class="code">' + RL.code.split('').map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</div>' +
          '<div class="wait"><div class="spin"></div>Aguardando lista do celular…</div></div>';
      } else {
        html += '<div class="addr"><h3>Usar o celular?</h3><p style="margin-top:20px">Para mandar a lista pelo celular, configure o relay em<br><b style="color:#fff">Ajustes → Celular</b>.</p><p style="margin-top:20px">O passo a passo está no arquivo <b style="color:#fff">LEIA-ME</b> do projeto (leva uns 5 minutos e é grátis).</p></div>';
      }
      return html;
    },
    init: function (p) {
      var first = findFk(p.id ? 'lsave' : 'f:' + (p.tab === 'xtream' ? 'fserver' : 'furl'));
      if (p.first) first = findFk('f:fname');
      if (first) first.setAttribute('data-def', '');
      clearInterval(RL.t);
      var relay = relayUrl(); if (!relay) return;
      RL.t = setInterval(function () {
        Src.getJSON(relay + '/api/get?code=' + RL.code, 8000).then(function (r) {
          if (!r || !r.ok || !r.list || !A.cur || A.cur.name !== 'listform') return;
          clearInterval(RL.t);
          var x = r.list;
          var l = { id: p.id || ('L' + Date.now()), name: (x.name || '').trim() || (x.type === 'xtream' ? 'Conta Xtream' : 'Lista M3U'), type: x.type === 'xtream' ? 'xtream' : 'm3u' };
          if (l.type === 'xtream') { l.server = Src.normServer(x.server); l.user = (x.user || '').trim(); l.pass = (x.pass || '').trim(); } else l.url = (x.url || '').trim();
          toast('📱 Lista recebida do celular!', 4000);
          saveList(l);
        }).catch(function () {});
      }, 3000);
    },
    leave: function () { clearInterval(RL.t); }
  };
  function fld(label, id, val, ph) {
    return '<div class="fld"><label>' + esc(label) + '</label><div class="inp f" data-a="edit" data-fk="f:' + id + '"><input id="' + id + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>';
  }
  function formList() {
    var p = A.cur.p, v = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
    var l = { id: p.id || ('L' + Date.now()), name: v('fname'), type: p.tab };
    if (p.tab === 'xtream') {
      l.server = Src.normServer(v('fserver')); l.user = v('fuser'); l.pass = v('fpass');
      if (!l.server || !l.user || !l.pass) return { err: 'Preencha URL/DNS, usuário e senha.' };
      if (!l.name) l.name = 'Conta ' + l.user;
    } else {
      l.url = v('furl');
      if (!/^https?:\/\//i.test(l.url)) return { err: 'O link precisa começar com http:// ou https://' };
      if (!l.name) l.name = 'Lista M3U';
      var x = Src.xtreamFromUrl(l.url);
      if (x) { l.type = 'xtream'; l.server = x.server; l.user = x.user; l.pass = x.pass; l.fromM3U = l.url; delete l.url; }
    }
    return { list: l };
  }
  function saveList(l) {
    var old = Store.lists().filter(function (x) { return x.id === l.id; })[0];
    if (old) { l.counts = old.counts; l.updated = old.updated; }
    Store.upsert(l); Store.setActive(l.id); Store.cacheDel(l.id);
    if (l.fromM3U) toast('Detectamos uma conta Xtream no link: capas, sinopses e temporadas ativadas!', 5000);
    loadActive(true);
  }
  function fmsg(t, cls) { var m = document.getElementById('fmsg'); if (m) { m.textContent = t; m.className = 'msg ' + (cls || ''); } }
  ACT.ltab = function (t) {
    var p = A.cur.p; if (p.tab === t) return;
    var n = document.getElementById('fname'); p.tab = t; var keep = n ? n.value : '';
    refresh('t:' + t); var n2 = document.getElementById('fname'); if (n2 && keep) n2.value = keep;
  };
  ACT.lsave = function () { var r = formList(); if (r.err) { fmsg(r.err, 'err'); return; } saveList(r.list); };
  ACT.ltest = function () {
    var r = formList(); if (r.err) { fmsg(r.err, 'err'); return; }
    fmsg('Testando…');
    Src.test(r.list).then(function (m) { fmsg(m, 'okk'); }).catch(function (e) { fmsg('Falhou: ' + (e.message || e), 'err'); });
  };

  /* ---------------- ações gerais ---------------- */
  ACT.nav = function (s) {
    if (!A.cat && s !== 'settings') { toast('Adicione uma lista primeiro'); return; }
    if (s === 'home') { resetTo('home'); return; }
    if (s === 'live') resetTo('live', {}); else if (s === 'movies') resetTo('grid', { type: 'movies' }); else if (s === 'series') resetTo('grid', { type: 'series' });
    else if (s === 'search') resetTo('search', {}); else if (s === 'settings') resetTo('settings', { m: 0 });
  };
  ACT.close = function () { closeModal(); };
  ACT.back = function () { back(); };
  ACT.edit = function (v, el) { var i = el.querySelector('input'); if (!i) return; el.classList.add('editing'); i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} };
  function finishEdit(input, commit) {
    var box = input.parentNode; input.blur(); if (box && box.classList) box.classList.remove('editing');
    if (commit && box && box.getAttribute('data-commit') && ACT[box.getAttribute('data-commit')]) ACT[box.getAttribute('data-commit')](input.value, box);
  }
  function activate(el) {
    if (!el) return;
    var a = el.getAttribute('data-a'); if (a && ACT[a]) ACT[a](el.getAttribute('data-p'), el);
  }

  /* ---------------- teclado / controle remoto ---------------- */
  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'enter', 10009: 'back', 8: 'back', 27: 'back', 10252: 'PlayPause', 415: 'Play', 19: 'Pause', 413: 'Stop', 417: 'FF', 412: 'RW', 427: 'ChUp', 428: 'ChDown', 33: 'ChUp', 34: 'ChDown', 403: 'Red', 404: 'Green', 405: 'Yellow', 406: 'Blue', 10182: 'exit' };
  (function registerKeys() {
    var names = ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaFastForward', 'MediaRewind', 'ChannelUp', 'ChannelDown', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    var map = { MediaPlayPause: 'PlayPause', MediaPlay: 'Play', MediaPause: 'Pause', MediaStop: 'Stop', MediaFastForward: 'FF', MediaRewind: 'RW', ChannelUp: 'ChUp', ChannelDown: 'ChDown', ColorF0Red: 'Red', ColorF1Green: 'Green', ColorF2Yellow: 'Yellow', ColorF3Blue: 'Blue' };
    try {
      if (!window.tizen || !tizen.tvinputdevice) return;
      try { tizen.tvinputdevice.registerKeyBatch(names); } catch (e) { names.forEach(function (n) { try { tizen.tvinputdevice.registerKey(n); } catch (e2) {} }); }
      names.forEach(function (n) { try { var c = tizen.tvinputdevice.getKey(n).code; if (map[n]) KEYS[c] = map[n]; } catch (e) {} });
    } catch (e) {}
  })();

  document.addEventListener('keydown', function (e) {
    var code = e.keyCode, k = KEYS[code] || (code >= 48 && code <= 57 ? String(code - 48) : null);
    var act = document.activeElement;
    if (act && act.tagName === 'INPUT') {
      if (code === 13 || code === 65376) { e.preventDefault(); finishEdit(act, true); return; }
      if (code === 65385 || code === 10009 || code === 27) { e.preventDefault(); finishEdit(act, false); return; }
      if (code === 38 || code === 40) { e.preventDefault(); finishEdit(act, false); move(code === 38 ? 'up' : 'down'); return; }
      return;
    }
    if (!k) return;
    e.preventDefault();
    if (A.loading) return;
    if (k === 'exit') return;
    var s = A.cur && SCR[A.cur.name];
    if (!modalOn() && s && s.key && s.key(k)) return;
    if (k === 'back') { back(); return; }
    if (k === 'left' || k === 'right' || k === 'up' || k === 'down') { move(k); return; }
    if (k === 'enter') { activate(A.focus); return; }
    if (k === 'Yellow' && A.focus) {
      var el = A.focus, kind = el.getAttribute('data-k'), id = el.getAttribute('data-id');
      if (el.classList.contains('chrow')) { var on = Store.toggleFav(A.list.id, 'live', id); toast(on ? '★ Adicionado aos favoritos' : 'Removido dos favoritos'); var st = el.querySelector('.fav'); if (on && !st) el.insertAdjacentHTML('beforeend', '<span class="fav">★</span>'); if (!on && st) st.parentNode.removeChild(st); }
      else if (kind === 'movie' || kind === 'series') { var on2 = Store.toggleFav(A.list.id, kind, id); toast(on2 ? 'Adicionado à Minha lista' : 'Removido da Minha lista'); }
    }
  });
  stage.addEventListener('click', function (e) { var f = e.target.closest('.f'); if (!f) return; setFocus(f, true); activate(f); });
  stage.addEventListener('mouseover', function (e) { var f = e.target.closest('.f'); if (f && f !== A.focus && document.activeElement.tagName !== 'INPUT') setFocus(f, true); });
  document.addEventListener('focusout', function (e) { if (e.target.tagName === 'INPUT' && e.target.parentNode.classList) e.target.parentNode.classList.remove('editing'); });

  document.addEventListener('visibilitychange', function () {
    if (!A.cur || A.cur.name !== 'player') return;
    if (document.hidden) { saveProg(true); Player.suspend(); } else Player.restore();
  });

  /* ---------------- escala da tela ---------------- */
  function fit() {
    var w = window.innerWidth || 1920, h = window.innerHeight || 1080, s = Math.min(w / 1920, h / 1080);
    A.scale = s; stage.style.transform = 'scale(' + s + ')';
    var vp = document.getElementById('viewport'); vp.style.width = 1920 * s + 'px'; vp.style.height = 1080 * s + 'px';
    vp.style.marginLeft = Math.max(0, (w - 1920 * s) / 2) + 'px'; vp.style.marginTop = Math.max(0, (h - 1080 * s) / 2) + 'px';
  }
  window.addEventListener('resize', fit); fit();
  setInterval(function () { var c = document.getElementById('clock'); if (c) c.textContent = clock(); }, 20000);

  /* modo demonstração para testar no PC: index.html?demo */
  if (/[?&]demo/.test(location.search) && window.DEMO_M3U) {
    A.list = { id: 'demo', name: 'Lista de demonstração', type: 'm3u', url: '' };
    A.cat = Src.parseM3U(window.DEMO_M3U); indexCat(A.cat);
    Store.saveLists([A.list]); Store.setActive('demo');
    var start = (location.hash || '#home').slice(1).split(':');
    if (start[0] === 'movie') { resetTo('home'); go('movie', { id: A.cat.movies[0].id }); }
    else if (start[0] === 'serie') { resetTo('home'); go('serie', { id: A.cat.series[0].id }); }
    else if (start[0] === 'grid') resetTo('grid', { type: start[1] || 'movies' });
    else if (start[0] === 'settings') resetTo('settings', { m: +(start[1] || 0) });
    else if (start[0] === 'listform') resetTo('listform', { tab: start[1] || 'm3u' });
    else if (start[0] === 'live' || start[0] === 'search') resetTo(start[0], start[0] === 'search' ? { q: 'a' } : {});
    else resetTo('home');
    window.__A = A; window.__go = go;
    return;
  }

  loadActive(false);
})();
