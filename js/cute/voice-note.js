/* =====================================================================
   voice-note.js - tin nhắn thoại trong thư

   Người gửi ghi âm một câu mời bằng giọng thật. Ở cuối trang lời mời
   (.page--letter), chỗ hàng trang trí "chân gấu, tim, chân gấu" sẽ là một
   tin nhắn thoại kiểu ứng dụng chat: đầu bạn gấu, nút phát, sóng âm,
   thời lượng và một trái tim nhỏ báo "chưa nghe".

   Không có file ghi âm (voiceNote.src trống) thì tính năng không làm gì
   cả, trang giữ nguyên từng điểm ảnh như cũ.

   Vì trang sách bị nhân bản khi lật, mọi trạng thái nhìn thấy được nằm
   ở class trên .page và ở chữ, không nằm trong biến JS.

   Cấu hình trong config.js (khoá voiceNote, mọi mục đều tuỳ chọn):

     voiceNote: {
       src: '',        // file ghi âm, ví dụ 'assets/audio/loi-moi.m4a'. Để trống: không hiện gì
       label: 'Bấm để nghe {from} nói nè',
       duration: ''    // ví dụ '0:12'; để trống thì tự đo khi bấm nghe
     }

   Cách làm file ghi âm: thu 10 đến 20 giây bằng điện thoại, lưu dạng .m4a
   (bản ghi âm của iPhone) hoặc .mp3, cả hai đều phát được trên iPhone lẫn
   Android. Các dạng .ogg, .amr, .3gp KHÔNG phát được trên iPhone. Chép file
   vào thư mục assets/audio/ và giữ dưới khoảng 1 MB cho trang mở nhanh.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};

  var SLUG = 'voice-note';
  var STORE_PLAYED = 'voice-note:played';
  var DEFAULT_LABEL = 'Bấm để nghe {from} nói nè';
  var SHORT_LABEL = 'Nghe {from} nói nè';
  var NAMELESS_LABEL ='Bấm để nghe lời nhắn thoại nè';
  var FAIL_TEXT ='Chưa phát được, thử lại sau nha';
  var FAIL_MS = 3200;
  var BARS = 14;

  /* Chiều cao từng vạch sóng âm (tỉ lệ 0..1), sắp lệch nhau cho giống giọng nói thật */
  var BAR_H = [0.38, 0.62, 0.92, 0.55, 1, 0.7, 0.42, 0.84, 0.96, 0.5, 0.74, 0.46, 0.8, 0.34];

  /* Các mảnh dùng chung giữa setup() và ready() */
  var ui = null;

  /* Đường dẫn file ghi âm. Chỉ nhận chuỗi khác rỗng, không bao giờ coi là HTML. */
  function readSrc(ctx) {
    var src = ctx.get('voiceNote.src');
    if (typeof src !== 'string') return '';
    return src.trim();
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* Giây -> "m:ss" */
  function fmt(sec, roundUp) {
    if (!(sec >= 0) || !isFinite(sec)) return '';
    var s = roundUp ? Math.round(sec) : Math.floor(sec);
    return Math.floor(s / 60) + ':' + pad2(s % 60);
  }

  /* Độ dài người gửi tự ghi: '0:12' giữ nguyên, '12' hiểu là 12 giây.
     Cắt ngắn để chữ lạ không làm vỡ viên thuốc. */
  function configDuration(ctx) {
    var d = ctx.get('voiceNote.duration');
    if (typeof d === 'number' && d > 0) return fmt(d, true);
    if (typeof d !== 'string') return '';
    d = d.trim();
    if (/^\d+$/.test(d)) return fmt(parseInt(d, 10), true);
    return d.slice(0, 8);
  }

  /* Dòng chữ nhỏ trên tin nhắn thoại. Người gửi để trống tên mà nhãn lại
     cần {from}/{to} thì câu sẽ hụt chữ ("Bấm để nghe nói nè"), nên khi đó
     dùng một câu trung tính không cần tên. */
  function cleanText(ctx, raw) {
    return ctx.fill(raw).replace(/\s+/g, ' ').trim();
  }

  /* Trả về danh sách câu, dài nhất trước. Câu đầu là câu đầy đủ (cho
     aria-label); các câu sau là bản ngắn hơn để thử khi trang hẹp mà tên
     người gửi dài (chỉ với câu mặc định: câu tự viết của người gửi thì giữ
     nguyên chữ, quá dài mới cắt bằng "…"). */
  function readLabels(ctx) {
    var raw = ctx.get('voiceNote.label');
    raw = typeof raw === 'string' && raw.trim() ? raw : DEFAULT_LABEL;
    var names = ctx.names || {};
    var missing = (raw.indexOf('{from}') !== -1 && !String(names.from || '').trim()) ||
      (raw.indexOf('{to}') !== -1 && !String(names.to || '').trim());
    if (missing) raw = NAMELESS_LABEL;
    var full = cleanText(ctx, raw) || NAMELESS_LABEL;
    var list = [full];
    if (raw === DEFAULT_LABEL) list.push(cleanText(ctx, SHORT_LABEL));
    return list;
  }

  /* '0:12' -> 12 (để tô tiến độ khi chưa đo được độ dài thật) */
  function parseDuration(text) {
    var m = /^(\d{1,3}):(\d{1,2})$/.exec(text || '');
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
  }

  function buildMarkup() {
    var bars = '';
    for (var i = 0; i < BARS; i++) {
      /* Mỗi vạch nhảy một nhịp riêng (--t, --d) để sóng trông tự nhiên */
      var t = (0.55 + (i * 7 % 5) * 0.09).toFixed(2);
      var d = (-((i * 3) % 7) * 0.11).toFixed(2);
      bars += '<i class="voice-note__bar" style="--h:' + BAR_H[i % BAR_H.length] +
        ';--t:' + t + 's;--d:' + d + 's"></i>';
    }
    return '' +
      '<button class="voice-note__btn" type="button" aria-pressed="false">' +
        '<span class="voice-note__label" aria-live="polite"></span>' +
        '<span class="voice-note__row">' +
          '<span class="voice-note__avatar" aria-hidden="true">' +
            '<span class="voice-note__bear" data-mascot=""></span>' +
          '</span>' +
          '<span class="voice-note__floats" aria-hidden="true">' +
            '<svg class="voice-note__float voice-note__float--a"><use href="#i-heart"/></svg>' +
            '<svg class="voice-note__float voice-note__float--b"><use href="#i-voice-note-note"/></svg>' +
            '<svg class="voice-note__float voice-note__float--c"><use href="#i-sparkle"/></svg>' +
          '</span>' +
          '<span class="voice-note__pill" aria-hidden="true">' +
            '<span class="voice-note__play">' +
              '<svg class="voice-note__ic voice-note__ic--play"><use href="#i-voice-note-play"/></svg>' +
              '<svg class="voice-note__ic voice-note__ic--pause"><use href="#i-voice-note-pause"/></svg>' +
            '</span>' +
            '<span class="voice-note__wave">' + bars + '</span>' +
            '<span class="voice-note__time"></span>' +
            '<svg class="voice-note__unread"><use href="#i-heart"/></svg>' +
          '</span>' +
        '</span>' +
      '</button>';
  }

  function setup(ctx) {
    var src = readSrc(ctx);
    if (!src) return;   /* chưa có file ghi âm: không đụng vào trang */

    var page = ctx.qs('.page--letter', ctx.bookEl);
    var inner = page ? ctx.qs('.page__inner', page) : null;
    if (!inner) return;

    ctx.symbol('i-voice-note-play', '0 0 24 24',
      '<path fill="currentColor" d="M8.2 5.6v12.8c0 1 1.1 1.6 1.9 1.1l10-6.4c.8-.5.8-1.7 0-2.2l-10-6.4c-.8-.5-1.9.1-1.9 1.1z"/>');
    ctx.symbol('i-voice-note-pause', '0 0 24 24',
      '<rect x="6" y="5" width="4.4" height="14" rx="2" fill="currentColor"/>' +
      '<rect x="13.6" y="5" width="4.4" height="14" rx="2" fill="currentColor"/>');
    ctx.symbol('i-voice-note-note', '0 0 24 24',
      '<path fill="currentColor" d="M10 4.6l9-1.8v11.6a3 3 0 1 1-2-2.8V6.3l-5 1v9.1a3 3 0 1 1-2-2.8z"/>');

    var wrap = document.createElement('div');
    wrap.className = 'voice-note';
    wrap.setAttribute('data-reveal', '');
    wrap.innerHTML = buildMarkup();

    /* Thay đúng chỗ hàng trang trí, giữ thứ tự hiện (--i) của nó */
    var divider = ctx.qs('.divider', inner);
    var stagger = '3';
    if (divider) {
      stagger = divider.style.getPropertyValue('--i') || stagger;
      divider.parentNode.replaceChild(wrap, divider);
    } else {
      inner.insertBefore(wrap, ctx.qs('.page__num', inner));
    }
    wrap.style.setProperty('--i', String(stagger).trim() || '3');

    var labels = readLabels(ctx);
    var label = labels[0];
    var btn = ctx.qs('.voice-note__btn', wrap);
    var labelEl = ctx.qs('.voice-note__label', wrap);
    var timeEl = ctx.qs('.voice-note__time', wrap);
    labelEl.textContent = label;
    btn.setAttribute('aria-label', label + '. Tin nhắn thoại');

    var dur = configDuration(ctx);
    timeEl.textContent = dur || '-:--';
    if (!dur) timeEl.classList.add('voice-note__time--unknown');

    page.classList.add('voice-note--on');
    if (ctx.store.get(STORE_PLAYED) === '1') page.classList.add('voice-note--played');

    ui = {
      src: src,
      page: page,
      wrap: wrap,
      btn: btn,
      labelEl: labelEl,
      timeEl: timeEl,
      bars: ctx.qsa('.voice-note__bar', wrap),
      label: label,       /* câu đang hiện (có thể là bản ngắn) */
      labels: labels,
      configDur: dur
    };
  }

  function ready(ctx) {
    if (!ui) return;

    var page = ui.page;
    var audio = null;          /* MỘT đối tượng Audio duy nhất, tạo ở cú chạm đầu */
    var token = 0;             /* đánh dấu lần bấm phát gần nhất, để bỏ qua kết quả cũ */
    var waiting = false;
    var playing = false;
    var broken = false;        /* lần trước tải lỗi: lần bấm sau phải tải lại */
    var realDur = 0;
    var failTimer = null;
    var lit = -1;

    /* Lời thư có nhiều đoạn hơn mặc định thì tin nhắn thoại hiện sau đoạn cuối */
    var paras = ctx.qsa('.letter > *', page).length;
    var cur = parseInt(ui.wrap.style.getPropertyValue('--i'), 10) || 0;
    if (paras + 1 > cur) ui.wrap.style.setProperty('--i', String(paras + 1));
    ctx.refit();

    function setClass(name, on) { page.classList.toggle(name, !!on); }

    /* Dòng chữ luôn một dòng (CSS). Tên dài mà trang hẹp thì thử bản ngắn
       "Nghe {from} nói nè" trước khi để CSS cắt bằng "…". Chỉ đo được khi
       trang thư đang hiện (trang ẩn có bề rộng 0), nên gọi lại lúc trang thư
       sắp hiện, lúc hiện và khi xoay/đổi cỡ màn hình. */
    function fitLabel() {
      if (failTimer || ui.labels.length < 2) return;
      var el = ui.labelEl;
      if (!el.clientWidth) return;
      var pick = ui.labels[ui.labels.length - 1];
      for (var i = 0; i < ui.labels.length; i++) {
        if (el.textContent !== ui.labels[i]) el.textContent = ui.labels[i];
        if (el.scrollWidth <= el.clientWidth + 1) { pick = ui.labels[i]; break; }
      }
      if (el.textContent !== pick) el.textContent = pick;
      ui.label = pick;
    }

    function safeFit() { try { fitLabel(); } catch (e) {} }

    function totalSec() {
      return realDur || parseDuration(ui.configDur);
    }

    function paintTime() {
      var text;
      var t = audio ? audio.currentTime || 0 : 0;
      if (audio && (playing || waiting || t > 0.05) && !audio.ended) {
        text = fmt(t);
      } else {
        text = ui.configDur || (realDur ? fmt(realDur, true) : '');
      }
      ui.timeEl.classList.toggle('voice-note__time--unknown', !text);
      text = text || '-:--';
      if (ui.timeEl.textContent !== text) ui.timeEl.textContent = text;
    }

    /* Tô các vạch sóng đã phát qua (chỉ đổi class khi số vạch thay đổi) */
    function paintProgress() {
      var total = totalSec();
      var t = audio ? audio.currentTime || 0 : 0;
      var n = total > 0 && t > 0.05 ? Math.min(ui.bars.length, Math.ceil(t / total * ui.bars.length)) : 0;
      if (n === lit) return;
      lit = n;
      for (var i = 0; i < ui.bars.length; i++) {
        ui.bars[i].classList.toggle('voice-note__bar--lit', i < n);
      }
    }

    /* Nhạc nền (audio.bgm) mà vẫn chạy thì giọng thu bằng điện thoại, vốn nhỏ, sẽ
       bị nhạc át mất. Nên trong lúc tin nhắn thoại đang chờ hay đang phát thì nhờ
       lõi tạm dừng nhạc nền, xong (dừng, hết, lỗi) thì trả lại. Lõi tự lo phần
       "chỉ phát lại nếu trước đó đang phát và âm thanh trang đang bật". Gọi theo
       trạng thái (trong paint) để không bao giờ quên trả nhạc lại; bản lõi cũ
       chưa có duck() thì bỏ qua, không lỗi. */
    var ducked = false;
    function setDuck(on) {
      on = !!on;
      if (on === ducked) return;
      ducked = on;
      var A = ctx.audio || Invite.audio;
      if (A && typeof A.duck === 'function') {
        try { A.duck(on); } catch (e) {}
      }
    }

    function paint() {
      setDuck(playing || waiting);
      setClass('voice-note--playing', playing);
      setClass('voice-note--waiting', waiting && !playing);
      ui.btn.setAttribute('aria-pressed', playing || waiting ? 'true' : 'false');
      paintTime();
      paintProgress();
    }

    function restoreLabel() {
      clearTimeout(failTimer);
      failTimer = null;
      setClass('voice-note--error', false);
      if (ui.labelEl.textContent !== ui.label) ui.labelEl.textContent = ui.label;
      safeFit();   /* màn hình có thể đã xoay trong lúc hiện câu báo lỗi */
    }

    /* Không phát được: báo nhẹ nhàng rồi trả lại dòng chữ cũ, nút vẫn bấm lại được */
    function fail() {
      waiting = false;
      playing = false;
      /* Trình duyệt có thể vẫn để paused = false sau khi tải lỗi: dừng hẳn cho khớp */
      token++;
      if (audio) { try { audio.pause(); } catch (e) {} }
      paint();
      ui.labelEl.textContent = FAIL_TEXT;
      setClass('voice-note--error', false);
      if (!ctx.reduce) ctx.replay(page, 'voice-note--error');
      else setClass('voice-note--error', true);
      clearTimeout(failTimer);
      failTimer = setTimeout(restoreLabel, FAIL_MS);
    }

    function ensureAudio() {
      if (audio) return audio;
      try {
        audio = new Audio();
      } catch (e) {
        audio = null;
        return null;
      }
      audio.preload = 'auto';

      audio.addEventListener('loadedmetadata', onMeta);
      audio.addEventListener('durationchange', onMeta);
      audio.addEventListener('timeupdate', function () {
        try { paintTime(); paintProgress(); } catch (e) {}
      });
      audio.addEventListener('playing', function () {
        if (!waiting && !playing) return;   /* đã bấm dừng trong lúc chờ */
        waiting = false;
        playing = true;
        try { paint(); } catch (e) {}
      });
      /* Hệ điều hành tự dừng (có cuộc gọi, rút tai nghe...) thì cập nhật theo */
      audio.addEventListener('pause', function () {
        if (!playing) return;
        playing = false;
        try { paint(); } catch (e) {}
      });
      audio.addEventListener('ended', function () {
        try { onEnded(); } catch (e) {}
      });
      audio.addEventListener('error', function () {
        broken = true;
        if (waiting || playing) { try { fail(); } catch (e) {} }
      });

      try { audio.src = ui.src; } catch (e) { broken = true; }
      return audio;
    }

    function onMeta() {
      try {
        var d = audio ? audio.duration : 0;
        realDur = d > 0 && isFinite(d) ? d : realDur;
        paintTime();
        paintProgress();
      } catch (e) {}
    }

    function onEnded() {
      playing = false;
      waiting = false;
      page.classList.add('voice-note--played');
      ctx.store.set(STORE_PLAYED, '1');
      try { audio.currentTime = 0; } catch (e) {}
      lit = -1;
      paint();
      ctx.emit(SLUG + ':ended', {});
    }

    function play() {
      var a = ensureAudio();
      if (!a) { fail(); return; }
      restoreLabel();
      if (broken) {
        broken = false;
        try { a.load(); } catch (e) {}
      }
      waiting = true;
      paint();
      var mine = ++token;
      var p;
      try {
        p = a.play();
      } catch (e) {
        fail();
        return;
      }
      if (p && typeof p.then === 'function') {
        p.then(function () {
          if (mine !== token || !waiting) return;
          waiting = false;
          playing = true;
          paint();
        }, function (err) {
          if (mine !== token) return;
          /* AbortError: chính mình vừa bấm dừng, không phải lỗi */
          if (err && err.name === 'AbortError') { waiting = false; playing = false; paint(); return; }
          broken = true;
          fail();
        });
      }
      ctx.emit(SLUG + ':play', {});
    }

    function stop() {
      if (!audio || (!playing && !waiting)) return;
      token++;
      waiting = false;
      playing = false;
      try { audio.pause(); } catch (e) {}
      paint();
      ctx.emit(SLUG + ':pause', {});
    }

    ui.btn.addEventListener('click', function () {
      try {
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
        if (playing || waiting) stop();
        else play();
      } catch (e) {
        try { fail(); } catch (e2) {}
      }
    });

    /* Ngón tay (hay chuột) đang đè trên màn hình? Lõi báo 'turn' cả khi người
       xem chỉ mới kéo hờ mép trang rồi buông cho trang bật về chỗ cũ, lúc đó
       họ vẫn ở trang thư nên giọng nói phải phát tiếp. */
    var fingerDown = false;
    function onDown() { fingerDown = true; }
    function onUp(e) { fingerDown = !!(e && e.touches && e.touches.length); }
    var passive = { capture: true, passive: true };
    window.addEventListener('touchstart', onDown, passive);
    window.addEventListener('touchend', onUp, passive);
    window.addEventListener('touchcancel', onUp, passive);
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('mouseup', onUp, true);

    /* Không bao giờ phát khi người xem đã rời trang thư. Lật bằng nút mũi tên,
       bàn phím: dừng ngay. Lật bằng tay kéo: chờ trang khác hiện ra thật
       ('shown' bên dưới) mới dừng, vì cú kéo có thể chỉ là kéo hờ rồi buông. */
    ctx.on('turn', function () {
      if (!fingerDown) stop();
      /* Trang thư được hiện ra ngay khung hình sau khi bắt đầu lật tới nó:
         chọn câu vừa bề ngang trước khi người xem kịp thấy */
      if (window.requestAnimationFrame) window.requestAnimationFrame(safeFit);
    });
    ctx.on('shown', function (d) {
      if (d && d.page !== page) stop();
      else safeFit();
    });
    safeFit();   /* chế độ cuộn: mọi trang đều đang hiện, đo được luôn */
    var fitTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(fitTimer);
      /* sau khi lõi tự co chữ trang (180 ms) mới đo lại */
      fitTimer = setTimeout(safeFit, 260);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { try { stop(); } catch (e) {} }
    });
    window.addEventListener('pagehide', function () {
      try { stop(); } catch (e) {}
    });
  }

  (Invite.features = Invite.features || []).push({
    name: SLUG,
    setup: setup,
    ready: ready
  });
})();
