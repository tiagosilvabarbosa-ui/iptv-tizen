/* =====================================================================
   Player: usa o AVPlay da Samsung na TV (toca TS, HLS, MP4, MKV...)
   e <video> HTML5 quando aberto no navegador do PC (para testes).
   ===================================================================== */
var Player = (function () {
  'use strict';
  var av = null;
  try { if (window.webapis && webapis.avplay) av = webapis.avplay; } catch (e) {}
  var vid = document.getElementById('html5-player');
  var obj = document.getElementById('av-player');
  var L = {}; // callbacks: onTime(ms,dur), onBuffer(bool), onEnd(), onError(msg), onSubtitle(text), onReady()
  var state = 'idle', resumeAt = 0, isLive = false;

  function rect() {
    var w = window.innerWidth || 1920, h = window.innerHeight || 1080;
    try { av.setDisplayRect(0, 0, w, h); } catch (e) {}
  }

  function stopAll() {
    if (av) {
      try { var s = av.getState(); if (s !== 'NONE' && s !== 'IDLE') av.stop(); } catch (e) {}
      try { av.close(); } catch (e) {}
      obj.className = '';
    }
    try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) {}
    vid.className = '';
    state = 'idle';
  }

  function open(url, opts) {
    opts = opts || {};
    L = opts.listeners || {};
    resumeAt = opts.resume || 0;
    isLive = !!opts.live;
    stopAll();
    state = 'loading';
    if (L.onBuffer) L.onBuffer(true);
    if (av) {
      obj.className = 'on';
      try {
        av.open(url);
        rect();
        av.setListener({
          onbufferingstart: function () { if (L.onBuffer) L.onBuffer(true); },
          onbufferingprogress: function () {},
          onbufferingcomplete: function () { if (L.onBuffer) L.onBuffer(false); },
          oncurrentplaytime: function (ms) { if (L.onTime) L.onTime(ms, duration()); },
          onstreamcompleted: function () { state = 'ended'; if (L.onEnd) L.onEnd(); },
          onerror: function (e) { state = 'error'; if (L.onError) L.onError(errMsg(e)); },
          onevent: function () {},
          onsubtitlechange: function (dur, text) { if (L.onSubtitle) L.onSubtitle(text, dur); },
          ondrmevent: function () {}
        });
        try { av.setTimeoutForBuffering && av.setTimeoutForBuffering(20); } catch (e) {}
        av.prepareAsync(function () {
          try { if (resumeAt > 5000 && !isLive) av.seekTo(resumeAt); } catch (e) {}
          av.play(); state = 'playing';
          if (L.onBuffer) L.onBuffer(false);
          if (L.onReady) L.onReady();
        }, function (e) { state = 'error'; if (L.onError) L.onError(errMsg(e)); });
      } catch (e) { state = 'error'; if (L.onError) L.onError(errMsg(e)); }
    } else {
      vid.className = 'on';
      vid.onwaiting = function () { if (L.onBuffer) L.onBuffer(true); };
      vid.onplaying = function () { if (L.onBuffer) L.onBuffer(false); };
      vid.ontimeupdate = function () { if (L.onTime) L.onTime(vid.currentTime * 1000, duration()); };
      vid.onended = function () { state = 'ended'; if (L.onEnd) L.onEnd(); };
      vid.onerror = function () { state = 'error'; if (L.onError) L.onError('O navegador do PC não consegue tocar este formato (na TV ele toca pelo player da Samsung).'); };
      vid.onloadedmetadata = function () { if (resumeAt > 5000 && !isLive) vid.currentTime = resumeAt / 1000; if (L.onReady) L.onReady(); };
      vid.src = url;
      var p = vid.play(); if (p && p.catch) p.catch(function () {});
      state = 'playing';
    }
  }

  function errMsg(e) {
    var s = String((e && (e.name || e.message)) || e || '');
    if (/CONNECTION|NETWORK|TIMEOUT/i.test(s)) return 'Não foi possível conectar ao servidor do canal/vídeo.';
    if (/UNSUPPORTED|FORMAT|CODEC/i.test(s)) return 'Formato de vídeo não suportado.';
    if (/NOT_FOUND|404|INVALID_URI/i.test(s)) return 'Conteúdo não encontrado no servidor (fora do ar).';
    return 'Não foi possível reproduzir. ' + s;
  }

  function toggle() {
    if (av) {
      try { var s = av.getState(); if (s === 'PLAYING') { av.pause(); return false; } if (s === 'PAUSED' || s === 'READY') { av.play(); return true; } } catch (e) {}
      return true;
    }
    if (vid.paused) { vid.play(); return true; } vid.pause(); return false;
  }
  function playing() {
    if (av) { try { return av.getState() === 'PLAYING'; } catch (e) { return false; } }
    return !vid.paused;
  }
  function seekBy(ms) {
    if (isLive) return;
    if (av) {
      try { if (ms > 0) av.jumpForward(ms); else av.jumpBackward(-ms); } catch (e) {
        try { av.seekTo(Math.max(0, av.getCurrentTime() + ms)); } catch (e2) {}
      }
    } else { vid.currentTime = Math.max(0, vid.currentTime + ms / 1000); }
  }
  function seekTo(ms) {
    if (isLive) return;
    var d = duration(); ms = Math.max(0, d > 0 ? Math.min(ms, d - 3000) : ms);
    if (av) { try { av.seekTo(Math.floor(ms), function () {}, function () {}); } catch (e) { try { av.seekTo(Math.floor(ms)); } catch (e2) {} } }
    else { try { vid.currentTime = ms / 1000; } catch (e) {} }
  }
  function current() { if (av) { try { return av.getCurrentTime(); } catch (e) { return 0; } } return (vid.currentTime || 0) * 1000; }
  function duration() {
    if (av) { try { return av.getDuration(); } catch (e) { return 0; } }
    return isFinite(vid.duration) ? vid.duration * 1000 : 0;
  }

  /* Faixas de áudio e legenda */
  function tracks(type) {
    var out = [];
    if (av) {
      try {
        av.getTotalTrackInfo().forEach(function (t) {
          if (t.type !== type) return;
          var lang = '';
          try { var x = JSON.parse(t.extra_info); lang = x.language || x.track_lang || ''; } catch (e) {}
          out.push({ index: t.index, label: lang ? lang.toUpperCase() : (type === 'AUDIO' ? 'Áudio ' : 'Legenda ') + (out.length + 1) });
        });
      } catch (e) {}
    }
    return out;
  }
  function selectTrack(type, index) {
    if (!av) return;
    try {
      if (type === 'TEXT') { if (index < 0) { av.setSilentSubtitle(true); return; } av.setSilentSubtitle(false); }
      av.setSelectTrack(type, index);
    } catch (e) {}
  }

  function suspend() { if (av) { try { av.suspend(); } catch (e) {} } else { try { vid.pause(); } catch (e) {} } }
  function restore() { if (av) { try { av.restore(); } catch (e) {} } }

  window.addEventListener('resize', function () { if (av && state !== 'idle') rect(); });

  return { open: open, stop: stopAll, toggle: toggle, playing: playing, seekBy: seekBy, seekTo: seekTo, current: current, duration: duration,
    tracks: tracks, selectTrack: selectTrack, suspend: suspend, restore: restore, isTV: !!av };
})();
