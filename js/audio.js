/* =====================================================================
   audio.js - tiếng lật trang, tiếng "pop", tiếng ăn mừng (tự tổng hợp
   bằng Web Audio, không cần file) và nhạc nền.

   Trình duyệt điện thoại chỉ cho phát tiếng sau khi người dùng chạm.
   Tiếng hiệu ứng vì thế chờ cú chạm đầu tiên. Nhạc nền thì thử phát
   ngay khi trang tải xong, bị chặn thì bắt đầu ở cú chạm đầu tiên.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var STORE_KEY = 'invite:sound';

  var cfg = (window.INVITE_CONFIG && window.INVITE_CONFIG.audio) || {};
  var ctx = null;
  var bgm = null;
  var gestureSeen = false;
  var enabled = cfg.enabled !== false;

  try {
    var saved = localStorage.getItem(STORE_KEY);
    if (saved === '0') enabled = false;
    if (saved === '1') enabled = true;
  } catch (e) {}

  function context() {
    if (!gestureSeen) return null;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    /* iOS có thể để ngữ cảnh âm thanh ở trạng thái "suspended" hoặc "interrupted"
       (sau khi chuyển sang app khác rồi quay lại), nên cứ chưa chạy là gọi lại */
    if (ctx.state !== 'running') {
      try {
        var p = ctx.resume();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
    return ctx;
  }

  /* Một nốt nhạc ngắn có độ ngân */
  function tone(c, freq, start, dur, type, peak) {
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  /* Tiếng "soạt" khi lật trang: một luồng nhiễu ngắn đi qua bộ lọc */
  function flip() {
    if (!enabled) return;
    var c = context();
    if (!c) return;
    try {
      var dur = 0.3;
      var frames = Math.floor(c.sampleRate * dur);
      var buffer = c.createBuffer(1, frames, c.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

      var src = c.createBufferSource();
      src.buffer = buffer;

      var filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.8;
      var t = c.currentTime;
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + dur);

      var gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.11, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  /* Tiếng "pop" nhỏ khi bấm nút */
  function pop() {
    if (!enabled) return;
    var c = context();
    if (!c) return;
    try {
      var t = c.currentTime;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(920, t + 0.09);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {}
  }

  /* Chuỗi nốt vui tai khi ăn mừng */
  function chime() {
    if (!enabled) return;
    var c = context();
    if (!c) return;
    try {
      var t = c.currentTime + 0.02;
      var notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      for (var i = 0; i < notes.length; i++) {
        tone(c, notes[i], t + i * 0.09, 0.5, 'triangle', 0.09);
      }
      tone(c, 1567.98, t + 0.5, 0.9, 'sine', 0.06);
    } catch (e) {}
  }

  /* ---------- Nhạc nền (chỉ khi config có file) ---------- */

  /* Độ to của nhạc nền, từ 0 đến 1. iPhone không cho trang chỉnh độ to nên ở đó nhạc
     luôn phát đúng độ to của file (file đi kèm đã được làm nhỏ sẵn cho vừa nền). */
  var bgmLevel = 1;
  if (typeof cfg.bgmVolume === 'number' && cfg.bgmVolume >= 0) bgmLevel = Math.min(1, cfg.bgmVolume);
  var FADE_MS = 1400;
  var fadeTimer = null;
  var warned = false;

  /* iPhone gạt nút im lặng: nhạc nền (thẻ <audio>) vẫn phát như ứng dụng nghe nhạc, nhưng
     tiếng Web Audio (lật trang, "pop") bị tắt. Safari 17 trở lên cho trang tự nhận là
     "đang phát nhạc", khi đó mọi tiếng của trang đều vang kể cả lúc gạt im lặng. */
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

  /* Danh sách bài. config bgm có thể là một đường dẫn (lặp mãi) hoặc một danh sách:
     [{ src, times, start }]. times: phát mấy lượt rồi sang bài sau (bài cuối bỏ trống
     times thì lặp mãi). start: bắt đầu (và mỗi lượt lặp lại) từ giây thứ mấy. */
  var playlist = (function () {
    var list = cfg.bgm;
    if (!list) return [];
    if (!Array.isArray(list)) list = [list];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var t = typeof list[i] === 'string' ? { src: list[i] } : list[i];
      if (!t || typeof t.src !== 'string' || !t.src.replace(/\s+/g, '')) continue;
      var times = Math.floor(+t.times);
      var start = +t.start;
      out.push({ src: t.src, times: times > 0 ? times : 0, start: start > 0 ? start : 0 });
    }
    return out;
  })();
  var track = 0;     /* bài đang phát */
  var played = 0;    /* số lượt bài này đã phát hết */

  function forever(i) { return playlist[i].times === 0 && i === playlist.length - 1; }

  function loadTrack(i) {
    track = i;
    played = 0;
    var t = playlist[i];
    /* Luôn tự lặp để nhạc không bao giờ dừng; số lượt đếm ở onBgmTime */
    lastT = 0;
    lapLock = false;
    bgm.loop = true;
    bgm.src = t.start ? t.src + '#t=' + t.start : t.src;
  }

  /* Có trình duyệt bỏ qua "#t=" trong đường dẫn: tua tới đúng giây bắt đầu khi file sẵn sàng */
  function seekToStart() {
    var t = playlist[track];
    if (t && t.start && bgm.currentTime < t.start - 0.3) {
      try { bgm.currentTime = t.start; } catch (e) {}
    }
  }

  /* Hết một lượt. Trình phát luôn để chế độ tự lặp (loop) nên nhạc không bao giờ tự dừng:
     ngay trước khi hết bài (hoặc ngay khi trình duyệt vừa tự quay về đầu) thì đếm một lượt,
     tua về giây bắt đầu, đủ số lượt thì sang bài sau (hết danh sách thì quay về bài đầu).
     Không phải gọi play() lại sau mỗi lượt: có trình duyệt (Zalo, Messenger, máy vừa khoá
     màn hình) từ chối play() khi không có cú chạm, làm nhạc tắt luôn. */
  var lastT = 0;
  var lapLock = false;

  function seekTo(sec) {
    try { bgm.currentTime = sec; } catch (e) {}
    lastT = sec;
  }

  function lapDone(wrapped) {
    played++;
    var t = playlist[track];
    if (forever(track) || played < (t.times || 1)) {
      if (!wrapped || t.start) seekTo(t.start);
      return;
    }
    var next = track + 1 < playlist.length ? track + 1 : 0;
    if (next === track) {
      played = 0;
      if (!wrapped || t.start) seekTo(t.start);
      return;
    }
    loadTrack(next);
    resume();
  }

  function onBgmTime() {
    var t = bgm.currentTime;
    var d = bgm.duration;
    if (!(d > 2) || !isFinite(d)) { lastT = t; return; }
    if (lapLock) {
      if (t < d - 1) lapLock = false;
      lastT = t;
      return;
    }
    if (t >= d - 0.35) {
      lapLock = true;
      lapDone(false);
    } else if (lastT >= d - 1.5 && t < lastT - 1) {
      /* lượt kiểm tra trước đã gần hết bài, giờ đã ở đầu bài: trình duyệt vừa tự lặp */
      lapDone(true);
    } else {
      lastT = t;
    }
  }

  /* Dự phòng: lỡ trình phát vẫn dừng ở cuối bài thì đếm lượt rồi phát tiếp */
  function onBgmEnded() {
    lapDone(true);
    resume();
  }

  /* Phát tiếp mà không to dần lại (dùng khi nối bài) */
  function resume() {
    if (!wantMusic()) { paintBgm(); return; }
    tryPlay();
  }

  function tryPlay() {
    try {
      var p = bgm.play();
      if (p && p.catch) {
        p.catch(function (err) {
          /* Bị chặn vì chưa có cú chạm: đánh dấu để trang nhắc "chạm để nghe nhạc";
             cú chạm kế tiếp sẽ tự thử lại */
          if (err && err.name === 'NotAllowedError' && wantMusic()) setBlocked(true);
        });
      }
    } catch (e) {}
  }

  function ensureBgm() {
    if (bgm || !playlist.length) return bgm;
    try {
      bgm = new Audio();
      bgm.preload = 'auto';
      bgm.addEventListener('playing', onBgmPlaying);
      bgm.addEventListener('pause', paintBgm);
      bgm.addEventListener('timeupdate', onBgmTime);
      bgm.addEventListener('ended', onBgmEnded);
      bgm.addEventListener('loadedmetadata', seekToStart);
      bgm.addEventListener('error', function () {
        paintBgm();
        if (!warned && window.console) {
          warned = true;
          console.warn('Không tải được nhạc nền: ' + playlist[track].src + '. Kiểm tra lại đường dẫn bgm trong config.js.');
        }
      });
      loadTrack(0);
    } catch (e) { bgm = null; }
    return bgm;
  }

  /* Nhạc vào thì to dần trong khoảng một giây rưỡi cho êm tai (trừ iPhone, xem ở trên).
     Tính từ độ to hiện tại: phát tiếp sau khi mạng chậm thì không bị hụt tiếng. */
  function fadeIn() {
    clearInterval(fadeTimer);
    fadeTimer = null;
    var from = 0;
    try { from = bgm.volume; } catch (e) {}
    if (from >= bgmLevel) return;
    var begin = Date.now();
    fadeTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - begin) / FADE_MS);
      try { bgm.volume = from + (bgmLevel - from) * k; } catch (e) {}
      if (k >= 1) { clearInterval(fadeTimer); fadeTimer = null; }
    }, 50);
  }

  function onBgmPlaying() {
    setBlocked(false);
    paintBgm();
    fadeIn();
  }

  /* Gắn class "bgm-playing" lên thẻ html khi nhạc đang phát, để nút loa có nốt nhạc nhún nhảy */
  function paintBgm() {
    var root = document.documentElement;
    var on = !!(bgm && !bgm.paused && enabled);
    if (root.classList) {
      if (on) root.classList.add('bgm-playing'); else root.classList.remove('bgm-playing');
    }
  }

  /* Trình duyệt đang chặn nhạc (chưa có cú chạm): hiện bong bóng nhỏ "Chạm để nghe nhạc"
     cạnh nút loa. Chạm vào đâu cũng được, kể cả bong bóng, là nhạc phát. */
  var cue = null;
  function setBlocked(on) {
    var root = document.documentElement;
    if (root.classList) {
      if (on) root.classList.add('bgm-blocked'); else root.classList.remove('bgm-blocked');
    }
    if (on && !cue) {
      var btn = document.getElementById('btn-sound');
      if (!btn || !btn.parentNode) return;
      cue = document.createElement('button');
      cue.type = 'button';
      cue.className = 'bgm-cue';
      cue.textContent = cfg.tapToPlay || 'Chạm để nghe nhạc nha';
      btn.parentNode.insertBefore(cue, btn);
    }
  }

  /* "Hạ nhạc": khi có tiếng khác cần nghe rõ (lời nhắn thoại), nhạc nền tạm dừng */
  var ducked = false;
  var resumeAfterDuck = false;

  /* Nhạc lẽ ra phải đang phát: có bài, đang bật tiếng, không nhường giọng thu, trang đang hiện */
  function wantMusic() {
    return !!(playlist.length && enabled && !ducked && !document.hidden);
  }

  function playBgm() {
    if (!enabled || document.hidden) return;
    if (ducked) { if (playlist.length) resumeAfterDuck = true; return; }
    var a = ensureBgm();
    if (!a || !a.paused) return;
    /* Bắt đầu từ im lặng rồi to dần. Bị chặn thì vẫn đang dừng, cú chạm sau lại thử. */
    try { a.volume = 0; } catch (e) {}
    tryPlay();
  }

  function pauseBgm() {
    clearInterval(fadeTimer);
    fadeTimer = null;
    if (bgm) { try { bgm.pause(); } catch (e) {} }
    paintBgm();
  }

  function setEnabled(on) {
    enabled = !!on;
    try { localStorage.setItem(STORE_KEY, enabled ? '1' : '0'); } catch (e) {}
    if (enabled) playBgm(); else { resumeAfterDuck = false; setBlocked(false); pauseBgm(); }
  }

  /* duck(true): dừng nhạc nền (nếu đang phát). duck(false): phát lại, chỉ khi trước đó
     nhạc đang phát (hoặc vừa được bật trong lúc dừng) và âm thanh vẫn đang bật. */
  function duck(on) {
    on = !!on;
    if (on === ducked) return;
    if (on) {
      resumeAfterDuck = !!(bgm && !bgm.paused);
      ducked = true;
      pauseBgm();
    } else {
      ducked = false;
      var again = resumeAfterDuck;
      resumeAfterDuck = false;
      if (again) playBgm();
    }
  }

  /* Mỗi cú chạm đều mở khóa âm thanh. Nhạc lẽ ra đang phát mà lại đang dừng (bị trình
     duyệt chặn, bị cuộc gọi cắt ngang, một cú vuốt không được tính là "chạm"...) thì cú chạm
     nào cũng thử phát lại. Trừ nút loa và các nút có data-no-music (ví dụ nút "Để sau"):
     các nút đó tự quyết định có phát nhạc hay không. */
  function onGesture(e) {
    gestureSeen = true;
    if (!enabled) return;
    context();
    var el = e && e.target;
    if (el && el.closest && el.closest('#btn-sound, [data-no-music]')) return;
    if (wantMusic() && (!bgm || bgm.paused)) playBgm();
  }

  var GESTURES = ['touchend', 'pointerup', 'mousedown', 'keydown', 'click'];
  for (var g = 0; g < GESTURES.length; g++) window.addEventListener(GESTURES[g], onGesture, true);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseBgm(); else playBgm();
  });

  /* Mở lại thư (kể cả khi trình duyệt khôi phục trang cũ từ bộ nhớ lúc bấm quay lại):
     nhạc bắt đầu lại từ bài đầu như lần mở đầu tiên. Chuyển app rồi quay lại thì chỉ
     tạm dừng và phát tiếp đúng chỗ (xử lý ở visibilitychange bên trên). */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted || !bgm) return;
    pauseBgm();
    loadTrack(0);
    playBgm();
  });

  /* Trang tải xong thì thử phát nhạc luôn. Phần lớn điện thoại sẽ chặn cho tới cú chạm đầu tiên. */
  function autoplay() { if (playlist.length) playBgm(); }
  if (document.readyState === 'complete') setTimeout(autoplay, 0);
  else window.addEventListener('load', autoplay);

  Invite.audio = {
    flip: flip,
    pop: pop,
    chime: chime,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    duck: duck,
    music: function () { return bgm; },
    musicState: function () { return { track: track, played: played, tracks: playlist.length }; },
    hasMusic: function () { return playlist.length > 0; },
    isPlaying: function () { return !!(bgm && !bgm.paused); },

    /* Cho các tính năng phụ tự tạo âm thanh.
       context(): trả về AudioContext, hoặc null khi đang tắt tiếng hay chưa có cú chạm nào.
       tone(tần số, trễ, độ dài, kiểu sóng, độ to): phát một nốt ngắn có độ ngân. */
    context: function () { return enabled ? context() : null; },
    tone: function (freq, delay, dur, type, peak) {
      var c = enabled ? context() : null;
      if (!c) return;
      try {
        tone(c, freq, c.currentTime + (delay || 0), dur || 0.3, type || 'sine', peak || 0.07);
      } catch (e) {}
    }
  };
})();
