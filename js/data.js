/* =====================================================================
   Dados: armazenamento local, cache, leitura de M3U e API Xtream, TMDB
   ===================================================================== */
var Store = (function () {
  'use strict';
  function get(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var db = null;
  function idb() {
    if (db) return Promise.resolve(db);
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('sem IndexedDB'));
      var r = indexedDB.open('iptvtizen', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('cat'); };
      r.onsuccess = function () { db = r.result; res(db); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function cacheGet(id) {
    return idb().then(function (d) { return new Promise(function (res) {
      var q = d.transaction('cat', 'readonly').objectStore('cat').get(id);
      q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); };
    }); }).catch(function () { return null; });
  }
  function cachePut(id, v) {
    return idb().then(function (d) { return new Promise(function (res) {
      var tx = d.transaction('cat', 'readwrite'); tx.objectStore('cat').put(v, id);
      tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); };
    }); }).catch(function () { return false; });
  }
  function cacheDel(id) {
    return idb().then(function (d) { return new Promise(function (res) {
      var tx = d.transaction('cat', 'readwrite'); tx.objectStore('cat').delete(id);
      tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); };
    }); }).catch(function () { return false; });
  }

  var S = {
    get: get, set: set, cacheGet: cacheGet, cachePut: cachePut, cacheDel: cacheDel,
    lists: function () { return get('it.lists', []); },
    saveLists: function (l) { set('it.lists', l); },
    active: function () {
      var id = get('it.active', null), l = S.lists();
      return l.filter(function (x) { return x.id === id; })[0] || l[0] || null;
    },
    setActive: function (id) { set('it.active', id); },
    upsert: function (list) {
      var l = S.lists(), found = false;
      l = l.map(function (x) { if (x.id === list.id) { found = true; return list; } return x; });
      if (!found) l.push(list);
      S.saveLists(l);
    },
    remove: function (id) {
      S.saveLists(S.lists().filter(function (x) { return x.id !== id; }));
      try { localStorage.removeItem('it.fav.' + id); localStorage.removeItem('it.prog.' + id); } catch (e) {}
      cacheDel(id);
      if (get('it.active', null) === id) { var r = S.lists()[0]; set('it.active', r ? r.id : null); }
    },
    favs: function (lid) { return get('it.fav.' + lid, { live: {}, movie: {}, series: {} }); },
    isFav: function (lid, kind, id) { var f = S.favs(lid); return !!(f[kind] && f[kind][id]); },
    toggleFav: function (lid, kind, id) {
      var f = S.favs(lid); f[kind] = f[kind] || {};
      if (f[kind][id]) delete f[kind][id]; else f[kind][id] = Date.now();
      set('it.fav.' + lid, f); return !!f[kind][id];
    },
    progs: function (lid) { return get('it.prog.' + lid, {}); },
    setProg: function (lid, key, val) {
      var p = S.progs(lid);
      if (val) p[key] = val; else delete p[key];
      var keys = Object.keys(p).sort(function (a, b) { return p[b].t - p[a].t; });
      if (keys.length > 40) keys.slice(40).forEach(function (k) { delete p[k]; });
      set('it.prog.' + lid, p);
    }
  };
  return S;
})();

var Src = (function () {
  'use strict';

  function normServer(s) {
    s = String(s || '').trim();
    if (!s) return s;
    if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    return s.replace(/\/(player_api|get|xmltv|panel_api)\.php.*$/i, '').replace(/\/+$/, '');
  }
  /* Link get.php?username=..&password=.. vira conta Xtream (traz capas, sinopse, temporadas) */
  function xtreamFromUrl(u) {
    var m = /^(https?:\/\/[^\/?#]+)(?:\/[^?#]*)?\/get\.php\?(.*)$/i.exec(String(u || '').trim());
    if (!m) return null;
    var q = {}; m[2].split('&').forEach(function (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p.slice(1).join('=') || ''); });
    return q.username && q.password ? { server: m[1], user: q.username, pass: q.password } : null;
  }

  function timeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('O servidor demorou para responder')); }, ms); })]);
  }
  function getText(url) {
    return timeout(fetch(url), 90000).then(function (r) { if (!r.ok) throw new Error('Servidor respondeu ' + r.status); return r.text(); });
  }
  function getJSON(url, ms) {
    return timeout(fetch(url), ms || 45000).then(function (r) { if (!r.ok) throw new Error('Servidor respondeu ' + r.status); return r.json(); });
  }
  function api(l, action, extra) {
    return getJSON(l.server + '/player_api.php?username=' + encodeURIComponent(l.user) + '&password=' + encodeURIComponent(l.pass) +
      (action ? '&action=' + action : '') + (extra || ''));
  }
  function b64(s) { try { return decodeURIComponent(escape(atob(s || ''))); } catch (e) { return s || ''; } }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function arr(v) { return Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.keys(v).map(function (k) { return v[k]; }) : []); }

  function splitYear(n) {
    n = String(n || '').trim();
    var m = /[\s\-–(\[]*\(?((?:19|20)\d{2})\)?\]?\s*$/.exec(n);
    if (m && m.index > 0) return { name: n.slice(0, m.index).replace(/[\s\-–|:]+$/, '').trim(), year: m[1] };
    return { name: n, year: '' };
  }
  function groupsOf(list, order) {
    var c = {}, seen = [];
    list.forEach(function (x) { if (!(x.group in c)) { c[x.group] = 0; seen.push(x.group); } c[x.group]++; });
    var names = order ? order.filter(function (g) { return g in c; }).concat(seen.filter(function (g) { return order.indexOf(g) < 0; })) : seen;
    return names.map(function (g) { return { name: g, count: c[g] }; });
  }
  function finish(cat) {
    cat.liveGroups = groupsOf(cat.live, cat._lo);
    cat.movieGroups = groupsOf(cat.movies, cat._mo);
    cat.seriesGroups = groupsOf(cat.series, cat._so);
    delete cat._lo; delete cat._mo; delete cat._so;
    cat.t = Date.now();
    return cat;
  }

  /* ---------------- M3U ---------------- */
  var VOD_EXT = /\.(mp4|mkv|avi|mov|m4v|wmv|flv|webm|mpg|mpeg)(\?|$)/i, SE = /\bS(\d{1,2})\s*[._-]?\s*E(\d{1,3})\b/i;
  function parseInf(l) {
    var a = {}, re = /([\w-]+)="([^"]*)"/g, m, q = false, name = '';
    while ((m = re.exec(l))) a[m[1].toLowerCase()] = m[2];
    for (var i = 8; i < l.length; i++) { var c = l[i]; if (c === '"') q = !q; else if (c === ',' && !q) { name = l.slice(i + 1); break; } }
    return { name: (name || a['tvg-name'] || 'Sem nome').trim(), logo: a['tvg-logo'] || '', group: (a['group-title'] || 'Outros').trim() || 'Outros', epg: a['tvg-id'] || '' };
  }
  function parseM3U(txt) {
    if (txt.indexOf('#EXTINF') < 0) throw new Error('O link não parece ser uma lista M3U');
    var lines = txt.split(/\r?\n/), cat = { live: [], movies: [], series: [] }, smap = {}, cur = null, ec = 0;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (!l) continue;
      if (l.indexOf('#EXTINF') === 0) { cur = parseInf(l); continue; }
      if (l[0] === '#' || !cur) continue;
      var u = l, g = cur.group, kind;
      if (/\/series\//i.test(u)) kind = 'ep';
      else if (/\/movie\//i.test(u)) kind = 'movie';
      else if (VOD_EXT.test(u)) kind = SE.test(cur.name) ? 'ep' : 'movie';
      else if (/s[eé]ries?/i.test(g) && SE.test(cur.name) && !/\.(ts|m3u8)(\?|$)/i.test(u)) kind = 'ep';
      else kind = 'live';
      if (kind === 'live') {
        cat.live.push({ id: 'l' + cat.live.length, name: cur.name, logo: cur.logo, group: g, url: u, epg: cur.epg });
      } else if (kind === 'movie') {
        var sy = splitYear(cur.name);
        cat.movies.push({ id: 'm' + cat.movies.length, name: sy.name, year: sy.year, cover: cur.logo, group: g, url: u, added: i });
      } else {
        var m = SE.exec(cur.name);
        if (!m) { cat.movies.push({ id: 'm' + cat.movies.length, name: cur.name, year: '', cover: cur.logo, group: g, url: u, added: i }); cur = null; continue; }
        var base = cur.name.slice(0, m.index).replace(/[\s\-–|:._]+$/, '').trim() || cur.name;
        var bsy = splitYear(base), key = bsy.name.toLowerCase() + '|' + g, s = smap[key];
        if (!s) { s = smap[key] = { id: 's' + cat.series.length, name: bsy.name, year: bsy.year, cover: cur.logo, group: g, seasons: {}, added: i }; cat.series.push(s); }
        if (!s.cover) s.cover = cur.logo;
        s.added = i;
        var sn = +m[1], en = +m[2], rest = cur.name.slice(m.index + m[0].length).replace(/^[\s\-–|:.]+/, '');
        (s.seasons[sn] = s.seasons[sn] || []).push({ id: 'e' + (ec++), n: en, title: rest || ('Episódio ' + en), url: u, cover: cur.logo });
      }
      cur = null;
    }
    cat.series.forEach(function (s) { Object.keys(s.seasons).forEach(function (k) { s.seasons[k].sort(function (a, b) { return a.n - b.n; }); }); });
    return finish(cat);
  }

  /* ---------------- Xtream ---------------- */
  function login(l) {
    return api(l, '').then(function (r) {
      if (!r || !r.user_info) throw new Error('Servidor não respondeu como Xtream (verifique a URL/DNS)');
      if (String(r.user_info.auth) === '0') throw new Error('Usuário ou senha inválidos');
      if (r.user_info.status && !/active/i.test(r.user_info.status)) throw new Error('Conta ' + r.user_info.status);
      return r;
    });
  }
  function loadXtream(l, step) {
    return login(l).then(function (lg) {
      var fm = arr(lg.user_info.allowed_output_formats), fmt = fm.indexOf('m3u8') >= 0 ? 'm3u8' : 'ts';
      if (l.format && fm.indexOf(l.format) >= 0) fmt = l.format;
      var base = l.server, u = encodeURIComponent(l.user), p = encodeURIComponent(l.pass);
      var acts = ['get_live_categories', 'get_live_streams', 'get_vod_categories', 'get_vod_streams', 'get_series_categories', 'get_series'];
      var names = ['categorias de TV', 'canais', 'categorias de filmes', 'filmes', 'categorias de séries', 'séries'], done = 0;
      return Promise.all(acts.map(function (a, k) {
        return api(l, a).then(function (r) { done++; if (step) step('Carregando ' + names[k] + '… (' + done + '/6)'); return arr(r); }).catch(function () { done++; return []; });
      })).then(function (r) {
        function cats(list) { var m = {}, o = []; list.forEach(function (c) { m[c.category_id] = c.category_name; o.push(c.category_name); }); return { m: m, o: o }; }
        var lc = cats(r[0]), vc = cats(r[2]), sc = cats(r[4]);
        var cat = { live: [], movies: [], series: [], _lo: lc.o, _mo: vc.o, _so: sc.o, exp: lg.user_info.exp_date || null };
        r[1].forEach(function (s) {
          cat.live.push({ id: 'x' + s.stream_id, sid: s.stream_id, name: s.name || '', logo: s.stream_icon || '', group: lc.m[s.category_id] || 'Outros',
            url: base + '/live/' + u + '/' + p + '/' + s.stream_id + '.' + fmt, epg: s.epg_channel_id || '', arch: +s.tv_archive || 0 });
        });
        r[3].forEach(function (s) {
          var sy = splitYear(s.name);
          cat.movies.push({ id: 'v' + s.stream_id, vid: s.stream_id, name: sy.name, year: sy.year || (s.year ? String(s.year) : ''), cover: s.stream_icon || '',
            group: vc.m[s.category_id] || 'Outros', rating: num(s.rating), added: +s.added || 0,
            url: base + '/movie/' + u + '/' + p + '/' + s.stream_id + '.' + (s.container_extension || 'mp4') });
        });
        r[5].forEach(function (s) {
          var sy = splitYear(s.name);
          cat.series.push({ id: 'z' + s.series_id, xid: s.series_id, name: sy.name, year: sy.year || String(s.releaseDate || s.release_date || '').slice(0, 4), cover: s.cover || '',
            group: sc.m[s.category_id] || 'Outros', rating: num(s.rating), plot: s.plot || '', added: +s.last_modified || 0 });
        });
        return finish(cat);
      });
    });
  }

  function vodInfo(l, it) {
    return api(l, 'get_vod_info', '&vod_id=' + it.vid).then(function (r) {
      var i = (r && r.info) || {};
      return { plot: i.plot || i.description || '', cast: i.cast || i.actors || '', director: i.director || '', genre: i.genre || '',
        duration: i.duration || '', rating: num(i.rating) || it.rating, backdrop: arr(i.backdrop_path)[0] || '', cover: i.movie_image || i.cover_big || '',
        year: String(i.releasedate || i.release_date || '').slice(0, 4) };
    });
  }
  function seriesInfo(l, it) {
    var u = encodeURIComponent(l.user), p = encodeURIComponent(l.pass);
    return api(l, 'get_series_info', '&series_id=' + it.xid).then(function (r) {
      var i = (r && r.info) || {}, seasons = {}, eps = r && r.episodes ? r.episodes : {};
      Object.keys(eps).forEach(function (k) {
        seasons[k] = arr(eps[k]).map(function (e) {
          var ei = e.info || {};
          return { id: 'e' + e.id, n: +e.episode_num || 0, title: e.title || ('Episódio ' + e.episode_num), cover: ei.movie_image || '',
            dur: ei.duration || '', plot: ei.plot || '', url: l.server + '/series/' + u + '/' + p + '/' + e.id + '.' + (e.container_extension || 'mp4') };
        }).sort(function (a, b) { return a.n - b.n; });
      });
      return { seasons: seasons, plot: i.plot || it.plot || '', cast: i.cast || '', director: i.director || '', genre: i.genre || '',
        rating: num(i.rating) || it.rating, backdrop: arr(i.backdrop_path)[0] || '', cover: i.cover || '', year: String(i.releaseDate || '').slice(0, 4) };
    });
  }
  function shortEpg(l, it) {
    return api(l, 'get_short_epg', '&stream_id=' + it.sid + '&limit=5').then(function (r) {
      return arr(r && r.epg_listings).map(function (e) {
        return { title: b64(e.title), desc: b64(e.description), start: (+e.start_timestamp || 0) * 1000, end: (+e.stop_timestamp || 0) * 1000 };
      });
    });
  }

  /* ---------------- TMDB (opcional) ---------------- */
  var tmdbCache = Store.get('it.tmdbc', {}), tmdbQ = [], tmdbRun = 0, tmdbSaveT = 0;
  function tmdbKey() { return Store.get('it.tmdb', '') || CONFIG.TMDB_KEY || ''; }
  function cleanTitle(n) { return String(n || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\b(4K|UHD|FHD|HD|SD|1080p|720p|DUB|DUBLADO|LEG|LEGENDADO|NACIONAL|H265|HEVC)\b/gi, ' ').replace(/^[A-Z]{2,3}\s*[|:-]\s*/, '').replace(/\s+/g, ' ').trim(); }
  function tmdb(kind, it) {
    var key = tmdbKey(); if (!key) return Promise.resolve(null);
    var ck = kind + ':' + cleanTitle(it.name).toLowerCase() + ':' + (it.year || '');
    if (ck in tmdbCache) return Promise.resolve(tmdbCache[ck]);
    return new Promise(function (res) { tmdbQ.push({ kind: kind, it: it, ck: ck, res: res, key: key }); pump(); });
  }
  function pump() {
    while (tmdbRun < 3 && tmdbQ.length) {
      var j = tmdbQ.shift(); tmdbRun++;
      (function (j) {
        var path = j.kind === 'series' ? 'tv' : 'movie';
        var url = 'https://api.themoviedb.org/3/search/' + path + '?api_key=' + encodeURIComponent(j.key) + '&language=pt-BR&query=' + encodeURIComponent(cleanTitle(j.it.name)) +
          (j.it.year ? (path === 'tv' ? '&first_air_date_year=' : '&year=') + j.it.year : '');
        getJSON(url, 15000).then(function (r) {
          var x = r && r.results && r.results[0];
          var v = x ? { cover: x.poster_path ? 'https://image.tmdb.org/t/p/w342' + x.poster_path : '', backdrop: x.backdrop_path ? 'https://image.tmdb.org/t/p/w1280' + x.backdrop_path : '',
            plot: x.overview || '', rating: x.vote_average || 0, year: String(x.release_date || x.first_air_date || '').slice(0, 4) } : null;
          tmdbCache[j.ck] = v; saveTmdb(); j.res(v);
        }).catch(function () { j.res(null); }).then(function () { tmdbRun--; pump(); });
      })(j);
    }
  }
  function saveTmdb() {
    clearTimeout(tmdbSaveT);
    tmdbSaveT = setTimeout(function () {
      var k = Object.keys(tmdbCache); if (k.length > 3000) k.slice(0, k.length - 3000).forEach(function (x) { delete tmdbCache[x]; });
      Store.set('it.tmdbc', tmdbCache);
    }, 2000);
  }

  /* ---------------- geral ---------------- */
  function load(l, step) {
    if (l.type === 'xtream') return loadXtream(l, step);
    if (step) step('Baixando a lista…');
    return getText(l.url).then(function (t) { if (step) step('Organizando canais, filmes e séries…'); return parseM3U(t); });
  }
  function test(l) {
    if (l.type === 'xtream') return login(l).then(function (r) {
      var e = r.user_info.exp_date ? new Date(r.user_info.exp_date * 1000) : null;
      return 'Conectado! ' + (e ? 'Vence em ' + e.toLocaleDateString('pt-BR') : 'Conta sem vencimento');
    });
    return getText(l.url).then(function (t) { var c = parseM3U(t); return 'Lista OK: ' + c.live.length + ' canais, ' + c.movies.length + ' filmes, ' + c.series.length + ' séries'; });
  }

  return { normServer: normServer, xtreamFromUrl: xtreamFromUrl, load: load, test: test, vodInfo: vodInfo, seriesInfo: seriesInfo,
    shortEpg: shortEpg, tmdb: tmdb, tmdbKey: tmdbKey, parseM3U: parseM3U, getJSON: getJSON };
})();
