/* Gerador de QR Code (modo byte, correção L, versões 1 a 5) — sem dependências. */
var QR = (function () {
  'use strict';
  var EXP = [], LOG = [], x = 1, i;
  for (i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }

  function rs(data, n) {
    var g = [1], j, k;
    for (k = 0; k < n; k++) {
      var ng = []; for (j = 0; j <= g.length; j++) ng.push(0);
      for (j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[k]); }
      g = ng;
    }
    var res = []; for (j = 0; j < n; j++) res.push(0);
    for (k = 0; k < data.length; k++) {
      var f = data[k] ^ res[0]; res.shift(); res.push(0);
      for (j = 0; j < n; j++) res[j] ^= mul(g[j + 1], f);
    }
    return res;
  }

  function utf8(s) { var b = [], e = unescape(encodeURIComponent(s)); for (var q = 0; q < e.length; q++) b.push(e.charCodeAt(q)); return b; }

  function matrix(text) {
    var data = utf8(text);
    var CAP = [0, 17, 32, 53, 78, 106], DC = [0, 19, 34, 55, 80, 108], EC = [0, 7, 10, 15, 20, 26];
    var v = 1; while (v <= 5 && data.length > CAP[v]) v++;
    if (v > 5) return null;
    var bits = [];
    function put(val, n) { for (var q = n - 1; q >= 0; q--) bits.push((val >>> q) & 1); }
    put(4, 4); put(data.length, 8); data.forEach(function (b) { put(b, 8); });
    var total = DC[v] * 8; put(0, Math.min(4, total - bits.length));
    while (bits.length % 8) bits.push(0);
    var cw = [];
    for (var q = 0; q < bits.length; q += 8) { var b = 0; for (var r = 0; r < 8; r++) b = (b << 1) | bits[q + r]; cw.push(b); }
    for (var p = 0; cw.length < DC[v]; p++) cw.push(p % 2 ? 0x11 : 0xEC);
    var all = cw.concat(rs(cw, EC[v]));

    var n = 17 + 4 * v, M = [], F = [], yy, xx;
    for (yy = 0; yy < n; yy++) { M.push([]); F.push([]); for (xx = 0; xx < n; xx++) { M[yy].push(false); F[yy].push(false); } }
    function set(x, y, dark) { M[y][x] = !!dark; F[y][x] = true; }

    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), X = cx + dx, Y = cy + dy;
        if (X >= 0 && X < n && Y >= 0 && Y < n) set(X, Y, d !== 2 && d !== 4);
      }
    }
    for (i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    if (v >= 2) { var a = n - 7; for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) set(a + dx2, a + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1); }

    // formato: correção L (01), máscara 0
    var fd = 8, rem = fd;
    for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var fmt = ((fd << 10) | rem) ^ 0x5412;
    function fb(k) { return ((fmt >>> k) & 1) !== 0; }
    for (i = 0; i <= 5; i++) set(8, i, fb(i));
    set(8, 7, fb(6)); set(8, 8, fb(7)); set(7, 8, fb(8));
    for (i = 9; i < 15; i++) set(14 - i, 8, fb(i));
    for (i = 0; i < 8; i++) set(n - 1 - i, 8, fb(i));
    for (i = 8; i < 15; i++) set(8, n - 15 + i, fb(i));
    set(8, n - 8, true);

    var bi = 0;
    for (var right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < n; vert++) for (var j = 0; j < 2; j++) {
        var X2 = right - j, up = ((right + 1) & 2) === 0, Y2 = up ? n - 1 - vert : vert;
        if (!F[Y2][X2] && bi < all.length * 8) { M[Y2][X2] = ((all[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1; bi++; }
      }
    }
    for (yy = 0; yy < n; yy++) for (xx = 0; xx < n; xx++) if (!F[yy][xx] && (xx + yy) % 2 === 0) M[yy][xx] = !M[yy][xx];
    return M;
  }

  function svg(text) {
    var M = matrix(text); if (!M) return '';
    var n = M.length, s = '<svg viewBox="-2 -2 ' + (n + 4) + ' ' + (n + 4) + '" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="-2" y="-2" width="' + (n + 4) + '" height="' + (n + 4) + '" fill="#fff"/><path fill="#000" d="';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (M[y][x]) s += 'M' + x + ' ' + y + 'h1v1h-1z';
    return s + '"/></svg>';
  }
  return { svg: svg, matrix: matrix };
})();
