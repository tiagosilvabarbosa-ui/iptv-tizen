/* Arte automática de capa: usada quando a lista não traz imagem (ou a imagem falha). */
var Art = (function () {
  'use strict';
  var uid = 0;
  var PAL = [['#1b1f3a','#07080f','#ff6b4a'],['#0f3d3e','#041011','#f6c453'],['#3a0f2e','#10040d','#ff4fa3'],['#102a4c','#040a15','#4fc3ff'],['#3a3210','#0f0d04','#ffd166'],['#173b1a','#050f07','#9be564'],['#4a1a0f','#120604','#ff9f43'],['#22104a','#090516','#b388ff'],['#0e2f3f','#03090d','#5eead4'],['#3d0d0d','#0c0303','#ef4444']];

  function rnd(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { s = String(s || ''); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function svg(seed, w, h) {
    var p = PAL[seed % PAL.length], m = (seed >>> 4) % 6, R = rnd(seed), id = 'ga' + (uid++), u = Math.min(w, h), W = w, H = h, k, x, y, d;
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>' +
      '<linearGradient id="' + id + '" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'r" cx=".5" cy=".38" r=".55"><stop offset="0" stop-color="' + p[2] + '" stop-opacity=".75"/><stop offset="1" stop-color="' + p[2] + '" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + ')"/><rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'r)"/>';
    if (m === 0) {
      s += '<circle cx="' + W * .55 + '" cy="' + H * .45 + '" r="' + u * .26 + '" fill="' + p[2] + '"/>';
      for (k = 0; k < 7; k++) s += '<rect x="0" y="' + (H * .47 + k * u * .03) + '" width="' + W + '" height="' + u * .012 + '" fill="' + p[1] + '"/>';
      s += '<rect x="0" y="' + H * .62 + '" width="' + W + '" height="' + H + '" fill="' + p[1] + '"/>';
    } else if (m === 1) {
      for (k = 0; k < 3; k++) { y = H * (.45 + k * .12); d = 'M0 ' + H + ' L0 ' + y; for (x = 0; x <= W; x += W / 6) d += ' L' + x + ' ' + (y - R() * u * .28); d += ' L' + W + ' ' + H + 'Z'; s += '<path d="' + d + '" fill="' + p[1] + '" opacity="' + (.55 + k * .2) + '"/>'; }
      s += '<circle cx="' + W * .3 + '" cy="' + H * .25 + '" r="' + u * .08 + '" fill="' + p[2] + '"/>';
    } else if (m === 2) {
      for (k = 6; k > 0; k--) s += '<circle cx="' + W * .5 + '" cy="' + H * .4 + '" r="' + u * .07 * k + '" fill="none" stroke="' + p[2] + '" stroke-width="' + u * .012 + '" opacity="' + (1 - k * .12) + '"/>';
      s += '<circle cx="' + W * .5 + '" cy="' + H * .4 + '" r="' + u * .05 + '" fill="#fff"/>';
    } else if (m === 3) {
      x = 0; while (x < W) { var bw = u * (.06 + R() * .1), bh = H * (.15 + R() * .45); s += '<rect x="' + x + '" y="' + (H - bh) + '" width="' + bw + '" height="' + bh + '" fill="' + p[1] + '"/>';
        for (y = H - bh + u * .03; y < H - u * .03; y += u * .05) for (var wx = x + u * .015; wx < x + bw - u * .02; wx += u * .03) if (R() > .6) s += '<rect x="' + wx + '" y="' + y + '" width="' + u * .012 + '" height="' + u * .02 + '" fill="' + p[2] + '" opacity=".8"/>';
        x += bw + u * .01; }
    } else if (m === 4) {
      s += '<circle cx="' + W * .5 + '" cy="' + H * .32 + '" r="' + u * .13 + '" fill="' + p[1] + '"/><path d="M' + (W * .5 - u * .32) + ' ' + H + ' Q' + (W * .5 - u * .3) + ' ' + H * .5 + ' ' + W * .5 + ' ' + H * .5 + ' Q' + (W * .5 + u * .3) + ' ' + H * .5 + ' ' + (W * .5 + u * .32) + ' ' + H + 'Z" fill="' + p[1] + '"/>';
      s += '<circle cx="' + W * .5 + '" cy="' + H * .32 + '" r="' + u * .135 + '" fill="none" stroke="' + p[2] + '" stroke-width="' + u * .008 + '"/>';
    } else {
      for (k = 0; k < 9; k++) { y = H * (.25 + k * .07); s += '<path d="M0 ' + y + ' C' + W * .3 + ' ' + (y - u * .12) + ' ' + W * .6 + ' ' + (y + u * .12) + ' ' + W + ' ' + (y - u * .04) + '" fill="none" stroke="' + p[2] + '" stroke-width="' + u * .01 + '" opacity="' + (.2 + k * .08) + '"/>'; }
    }
    return s + '</svg>';
  }

  var COLORS = ['#ef4444','#22c55e','#a855f7','#f59e0b','#ec4899','#14b8a6','#f97316','#3b82f6','#0ea5e9','#84cc16'];
  function initials(name) {
    var w = String(name || '?').replace(/[^\wÀ-ú+ ]/g, ' ').replace(/\b(HD|FHD|SD|UHD|4K|H265|HEVC|BR|PT)\b/gi, ' ').trim().split(/\s+/);
    var s = w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2);
    return s.toUpperCase();
  }
  function color(name) { return COLORS[hash(name) % COLORS.length]; }

  return { svg: svg, hash: hash, initials: initials, color: color };
})();
