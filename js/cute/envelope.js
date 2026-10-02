/* =====================================================================
   envelope.js - phong bì niêm phong dấu sáp, hiện ra TRƯỚC cuốn sách.

   Người nhận thấy một chiếc phong bì viết tay rơi xuống giữa màn hình.
   Chạm vào (cả phong bì là một nút lớn): dấu sáp nứt đôi, nắp bật mở,
   lá thư trượt lên, rồi cả lớp phong bì mờ đi để lộ bìa sách.

   Chỉnh trong config.js, mục "envelope":
     once    : true thì chỉ hiện phong bì ở lần mở link đầu tiên
     to      : dòng chữ viết tay trên phong bì ({to} là tên người nhận)
     sticker : nhãn dán nhỏ (để '' là bỏ)
     hint    : dòng gợi ý dưới phong bì

   An toàn là trên hết: phong bì giữ "cổng chờ" của sách, nên mọi đường
   đi (lỗi, thiếu CSS, hẹn giờ bị kẹt) đều phải mở cổng. Thà mất màn mở
   thư còn hơn để người nhận kẹt ngoài cuốn sách.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;

  var DEFAULTS = {
    to: 'Gửi {to}',
    sticker: 'Bên trong có một trái tim',
    hint: 'Chạm vào dấu sáp để mở thư'
  };
  var STORE_KEY = 'envelope:opened';

  /* Các phím lật sách. Khi phong bì còn che thì sách bên dưới không được lật. */
  var NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];

  /* Mốc thời gian (mili giây, tính từ cú chạm). Chuyển động vẽ bằng CSS;
     JS chỉ đổi class đúng lúc, phát tiếng và mở cổng. Tổng cộng khoảng 1,4 giây. */
  var T_FLAP_UP = 370;    /* nắp vừa dựng đứng: cho nó lùi ra sau lá thư */
  var T_LETTER = 520;     /* lá thư bắt đầu trượt lên (kèm tiếng soạt) */
  var T_LEAVE = 980;      /* lớp phong bì bắt đầu mờ đi, sách bắt đầu hiện */
  var T_REMOVE = 440;     /* mờ xong thì gỡ khỏi trang */
  var T_REMOVE_CALM = 240;/* chế độ giảm chuyển động: chỉ mờ nhanh */
  var T_WATCHDOG = 2500;  /* quá mốc này mà chưa xong thì ép kết thúc */
  var T_SHOW_ANYWAY = 4500;

  /* Chạm dồn (người nhận sốt ruột chạm thêm vài cái lúc thư đang mở) không được lọt xuống
     cuốn sách, vì trong sách một cú chạm là lật trang: bìa bị lật mất trước khi kịp nhìn.
     - Lúc lớp phong bì còn trên màn hình, và cho tới khi bìa sách hiện xong (đo theo chính
       hiệu ứng hiện của bìa, dự phòng T_REVEAL), mọi cú chạm vào sách đều bị nuốt.
     - Sau đó, cú chạm nào đến chưa tới T_TAP_GAP sau cú trước vẫn tính là cùng một tràng
       và bị nuốt tiếp. 900ms để nhịp chạm "hai cái mỗi giây" (đo bằng chạm giả lập có lúc giãn
       ra tới 700-750ms) vẫn chắc chắn được coi là một tràng; ai chạm chậm hơn một cái mỗi giây
       là đang chạm có chủ ý, cho lật trang.
     - Ngừng tay một nhịp là sách nhận chạm lại. Dù chạm mãi không dừng thì sau T_GUARD_MAX
       (tính từ lúc lớp phong bì được gỡ, tức lúc bìa đã lộ hẳn) sách cũng nhận chạm như thường. */
  var T_TAP_GAP = 900;
  var T_REVEAL = 1000;       /* dự phòng khi không đo được thời gian hiện của bìa */
  var T_REVEAL_MAX = 1600;
  var T_GUARD_MAX = 4000;
  var T_COMPAT = 700;        /* chuột giả lập và click mà trình duyệt bắn ra ngay sau cú chạm đã nuốt */
  var GUARD_TOUCH = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
  var GUARD_MOUSE = ['mousedown', 'mouseup', 'click'];

  /* "0.33s, 90ms" -> [330, 90] */
  function msList(text) {
    var out = [];
    var parts = String(text || '').split(',');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      var n = parseFloat(p);
      if (isNaN(n)) { out.push(0); continue; }
      out.push(/ms$/.test(p) ? n : n * 1000);
    }
    return out;
  }

  /* Bìa sách mất bao lâu để hiện hết (mục cuối cùng có độ trễ lớn nhất). Đo thật từ CSS của lõi,
     để lõi đổi nhịp hiện thì bộ chặn chạm cũng theo; giảm chuyển động thì gần như bằng 0. */
  function coverRevealMs(ctx) {
    try {
      var cover = ctx.book && ctx.book.pages ? ctx.book.pages[0] : null;
      if (!cover) return T_REVEAL;
      var items = cover.querySelectorAll('[data-reveal]');
      if (!items.length) return 0;
      var most = 0;
      for (var i = 0; i < items.length; i++) {
        var cs = getComputedStyle(items[i]);
        var dur = msList(cs.transitionDuration);
        var del = msList(cs.transitionDelay);
        for (var j = 0; j < dur.length; j++) {
          var d = del.length ? del[j % del.length] : 0;
          most = Math.max(most, d + dur[j]);
        }
      }
      return Math.min(T_REVEAL_MAX, most);
    } catch (e) {
      return T_REVEAL;
    }
  }

  function complain(where, err) {
    if (window.console && console.error) console.error('[thu-moi] envelope ' + where + ':', err);
  }

  /* Chữ trong config: chỉ nhận chuỗi; sai kiểu hoặc thiếu thì dùng câu mặc định */
  function textOf(ctx, key) {
    var v = ctx.get('envelope.' + key);
    return typeof v === 'string' ? v : DEFAULTS[key];
  }

  /* ---------- Hình vẽ (toàn bộ là chữ tĩnh, không chứa nội dung của người gửi) ---------- */

  var FLAP_PATH = 'M12 0H188A12 12 0 0 1 198.4 6L113 63.5Q100 73 87 63.5L1.6 6A12 12 0 0 1 12 0Z';

  /* Dấu sáp: một vệt sáp tròn hơi loang, giữa có trái tim dập nổi */
  function sealSvg() {
    return '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<g fill="#D9537E">' +
        '<circle cx="24" cy="24" r="20"/>' +
        '<circle cx="9.5" cy="13.5" r="5.4"/><circle cx="38" cy="10.5" r="5"/>' +
        '<circle cx="42.6" cy="27" r="4.5"/><circle cx="34" cy="40.6" r="5.3"/>' +
        '<circle cx="13" cy="39.2" r="5"/><circle cx="5.4" cy="27.5" r="4.1"/>' +
        '<circle cx="23" cy="5" r="4.3"/>' +
      '</g>' +
      '<circle cx="24" cy="24" r="15.6" fill="#E8638C"/>' +
      '<circle cx="24" cy="24" r="15.6" fill="none" stroke="#C4406A" stroke-width="1.5" opacity=".5"/>' +
      '<use href="#i-heart" x="14.5" y="15.9" width="19" height="19" color="#C4406A"/>' +
      '<use href="#i-heart" x="14.5" y="14.7" width="19" height="19" color="#FFB3C6"/>' +
      '<path d="M10.5 18.5a15.5 15.5 0 0 1 8.6-9" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" opacity=".5"/>' +
    '</svg>';
  }

  /* Một trái tim nhỏ trên lớp lót. Mặt trong của nắp bị lật ngược khi nắp mở,
     nên tim được vẽ ngược sẵn (scale 1 -1) để lúc mở ra nhìn đúng chiều. */
  function liningHeart(x, y, size, color) {
    return '<use href="#i-heart" transform="translate(' + x + ' ' + y + ') scale(1 -1)" width="' + size +
      '" height="' + size + '" color="' + color + '"/>';
  }

  function flapSvg() {
    var hearts = [
      [24, 17, 9, '#FFC2D1'], [52, 19, 10, '#FFB3C6'], [82, 17, 9, '#FFC2D1'], [110, 19, 10, '#FFB3C6'],
      [140, 17, 9, '#FFC2D1'], [167, 19, 10, '#FFB3C6'],
      [58, 37, 10, '#FFC2D1'], [95, 39, 10, '#FFB3C6'], [132, 37, 10, '#FFC2D1'],
      [78, 54, 9, '#FFB3C6'], [113, 54, 9, '#FFC2D1'], [96, 66, 8, '#FFC2D1']
    ];
    var lining = '';
    for (var i = 0; i < hearts.length; i++) {
      lining += liningHeart(hearts[i][0], hearts[i][1], hearts[i][2], hearts[i][3]);
    }
    return '' +
      '<span class="envelope__face envelope__face--out">' +
        '<svg viewBox="0 0 200 76" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
          '<path fill="#EC9DB6" transform="translate(0 3)" d="' + FLAP_PATH + '"/>' +
          '<path fill="#FFC1D1" d="' + FLAP_PATH + '"/>' +
          '<path fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-dasharray="5.5 4.5" opacity=".95" d="M20 6.5H180L105.7 56.5Q100 60.5 94.3 56.5Z"/>' +
        '</svg>' +
      '</span>' +
      '<span class="envelope__face envelope__face--in">' +
        '<svg viewBox="0 0 200 76" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
          '<path fill="#FFEEF2" stroke="#FFC2D1" stroke-width="1.6" stroke-linejoin="round" d="' + FLAP_PATH + '"/>' +
          lining +
        '</svg>' +
      '</span>';
  }

  /* Thân phong bì: hai vạt bên và vạt đáy, có đường gấp nhạt */
  function frontSvg() {
    return '<svg viewBox="0 0 200 138" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path fill="#FFD9E3" d="M0 0L100 74L200 0V138H0Z"/>' +
      '<path fill="none" stroke="#F3AFC3" stroke-width="1.6" stroke-linejoin="round" d="M0 0L100 74L200 0"/>' +
      '<path fill="#FFE7ED" d="M0 138L88 68.5Q100 59 112 68.5L200 138Z"/>' +
      '<path fill="none" stroke="#F3AFC3" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M0 138L88 68.5Q100 59 112 68.5L200 138"/>' +
    '</svg>';
  }

  /* Vài trái tim, ngôi sao bắn ra lúc dấu sáp nứt. Hướng bay đặt bằng biến CSS. */
  function bitsHtml() {
    var bits = [
      ['heart', '-5.2em', '-3.6em', '-30deg', '#FF8FAB'],
      ['sparkle', '5em', '-4em', '40deg', '#F6C453'],
      ['heart', '-6.4em', '.6em', '-50deg', '#E8638C'],
      ['heart', '6.2em', '.2em', '35deg', '#FFB3C6'],
      ['sparkle', '-2.2em', '-5.6em', '20deg', '#F6C453'],
      ['heart', '2.4em', '-5.8em', '-15deg', '#FF8FAB']
    ];
    var html = '';
    for (var i = 0; i < bits.length; i++) {
      html += '<svg class="envelope__bit" aria-hidden="true" focusable="false" style="--x:' + bits[i][1] +
        ';--y:' + bits[i][2] + ';--r:' + bits[i][3] + ';color:' + bits[i][4] + '"><use href="#i-' + bits[i][0] + '"/></svg>';
    }
    return html;
  }

  function layerHtml() {
    return '' +
      '<svg class="envelope__mote envelope__mote--a" aria-hidden="true" focusable="false"><use href="#i-heart"/></svg>' +
      '<svg class="envelope__mote envelope__mote--b" aria-hidden="true" focusable="false"><use href="#i-sparkle"/></svg>' +
      '<svg class="envelope__mote envelope__mote--c" aria-hidden="true" focusable="false"><use href="#i-star"/></svg>' +
      '<svg class="envelope__mote envelope__mote--d" aria-hidden="true" focusable="false"><use href="#i-heart"/></svg>' +
      '<div class="envelope__stage">' +
        '<div class="envelope__drop">' +
          '<svg class="envelope__spark envelope__spark--a" aria-hidden="true" focusable="false"><use href="#i-sparkle"/></svg>' +
          '<svg class="envelope__spark envelope__spark--b" aria-hidden="true" focusable="false"><use href="#i-star"/></svg>' +
          '<svg class="envelope__spark envelope__spark--c" aria-hidden="true" focusable="false"><use href="#i-sparkle"/></svg>' +
          '<span class="envelope__shadow" aria-hidden="true"></span>' +
          '<div class="envelope__float">' +
            '<button class="envelope__btn" type="button">' +
              '<span class="envelope__back"></span>' +
              '<span class="envelope__flap">' + flapSvg() + '</span>' +
              '<span class="envelope__letter">' +
                '<span class="envelope__kicker"></span>' +
                '<span class="envelope__line"></span>' +
                '<span class="envelope__line envelope__line--short"></span>' +
                '<svg aria-hidden="true" focusable="false"><use href="#i-heart"/></svg>' +
              '</span>' +
              '<span class="envelope__front">' + frontSvg() +
                '<span class="envelope__addr"><span class="envelope__to"></span></span>' +
              '</span>' +
              '<span class="envelope__stamp"><svg aria-hidden="true" focusable="false"><use href="#i-heart"/></svg></span>' +
              '<span class="envelope__sticker">' +
                '<svg aria-hidden="true" focusable="false"><use href="#i-heart"/></svg>' +
                '<span class="envelope__sticker-text"></span>' +
              '</span>' +
              '<span class="envelope__seal">' +
                '<span class="envelope__ping"></span>' +
                '<span class="envelope__wax envelope__wax--full">' + sealSvg() + '</span>' +
                '<span class="envelope__wax envelope__wax--l">' + sealSvg() + '</span>' +
                '<span class="envelope__wax envelope__wax--r">' + sealSvg() + '</span>' +
              '</span>' +
              bitsHtml() +
            '</button>' +
          '</div>' +
        '</div>' +
        '<p class="envelope__hint">' +
          '<svg class="envelope__hand" aria-hidden="true" focusable="false"><use href="#i-hand"/></svg>' +
          '<span class="envelope__hint-text"></span>' +
        '</p>' +
      '</div>';
  }

  /* ---------- Vòng đời ---------- */

  function setup(ctx) {
    /* once: đã mở ở lần trước thì bỏ qua hẳn, không dựng lớp, không giữ cổng */
    if (ctx.get('envelope.once') === true && ctx.store.get(STORE_KEY) === '1') return;

    var layer = null;
    var btn = null;
    var addrEl = null;
    var toEl = null;
    var release = null;     /* hàm mở cổng chờ của sách */
    var live = false;       /* màn chờ đã tắt, phong bì đã lộ ra: được phép chạm */
    var opening = false;
    var leaving = false;
    var gone = false;
    var bound = false;
    var timers = [];
    var lastDown = 0;       /* lúc ngón tay (hay chuột) chạm xuống gần nhất */
    var revealEnd = 0;      /* lúc bìa sách hiện xong */
    var removedAt = 0;      /* lúc lớp phong bì được gỡ khỏi trang */
    var guardOn = false;    /* bộ chặn đang nghe sự kiện */
    var expired = false;    /* tràng chạm đã dứt: không nuốt cú chạm mới nữa, chỉ dọn nốt cú đang dở */
    var guardTimer = 0;
    var held = {};          /* các ngón tay đã bị nuốt lúc chạm xuống, chưa nhấc lên */
    var mouseHeld = false;  /* nút chuột đã bị nuốt lúc nhấn, chưa nhả */
    var eatClickUntil = 0;  /* tới lúc này thì chuột giả lập và click vẫn thuộc cú chạm đã nuốt */

    /* ---------- Chặn tràng chạm dồn ----------
       Từ lúc lớp phong bì bắt đầu mờ, nó thôi bắt cú chạm (để nút mũi tên, nút âm thanh
       ở ngoài cuốn sách dùng được ngay). Cú chạm nào rơi vào cuốn sách trong khoảng chặn
       (xem T_TAP_GAP ở trên) đều bị nuốt, bắt ở window, pha capture, trước cả thư viện lật trang.
       Nuốt thì nuốt trọn cả cú: chạm xuống, kéo, nhấc tay, chuột giả lập và click theo sau.
       Nếu chỉ nuốt nửa đầu (giữ tay qua lúc hết hạn rồi mới nhấc) thì thư viện nhận một cú
       nhấc tay lạc lõng và lật trang. Tim nhỏ ở chỗ chạm (pointerdown) vẫn nở như thường. */

    function inWindow(now) {
      if (!gone) return true;                       /* lớp còn đang mờ trên màn hình */
      if (now < revealEnd) return true;             /* bìa chưa hiện xong */
      return now - lastDown < T_TAP_GAP && now < removedAt + T_GUARD_MAX;
    }

    function heldCount() {
      var n = 0;
      for (var k in held) { if (Object.prototype.hasOwnProperty.call(held, k)) n++; }
      return n;
    }

    function inStage(t) {
      var stage = ctx.stageEl || ctx.bookEl;
      return !!(stage && t && t.nodeType && stage.contains(t));
    }

    function stop(e) {
      e.stopPropagation();
      if (e.type === 'click' && e.cancelable) e.preventDefault();
    }

    /* Tràng chạm đã dứt và không còn cú nào dở dang: thôi nghe hẳn */
    function maybeDisarm(now) {
      if (expired && !mouseHeld && !heldCount() && now >= eatClickUntil) disarmGuard();
    }

    function onTouchTail(e, now) {
      var mine = false;
      var list = e.changedTouches || [];
      for (var i = 0; i < list.length; i++) {
        var id = String(list[i].identifier);
        if (held[id]) {
          mine = true;
          if (e.type !== 'touchmove') delete held[id];
        }
      }
      if (!mine) return;
      if (e.type !== 'touchmove') eatClickUntil = now + T_COMPAT;
      stop(e);
    }

    function onGuard(e) {
      try {
        if (!guardOn || e.isTrusted === false) return;
        var now = Date.now();
        var type = e.type;

        /* Phần sau của một cú chạm: chỉ nuốt khi phần đầu của chính nó đã bị nuốt */
        if (type === 'touchmove' || type === 'touchend' || type === 'touchcancel') {
          onTouchTail(e, now);
          maybeDisarm(now);
          return;
        }
        if (type === 'mouseup') {
          if (mouseHeld || now < eatClickUntil) {
            /* Click theo ngay sau mouseup. Chỉ nới một chút: nới dài thì cú nhấn chuột kế tiếp
               bị coi là "giả lập" và tràng bấm chuột kéo dài mãi, vượt cả mốc T_GUARD_MAX. */
            if (mouseHeld) eatClickUntil = Math.max(eatClickUntil, now + 120);
            mouseHeld = false;
            stop(e);
          }
          maybeDisarm(now);
          return;
        }

        /* Phần đầu của một cú chạm (hoặc click): chỉ quan tâm khi nó rơi vào cuốn sách */
        if (!inStage(e.target)) return;

        if ((type === 'mousedown' || type === 'click') && now < eatClickUntil) {
          /* chuột giả lập, click do trình duyệt bắn ra sau cú chạm vừa nuốt */
          if (type === 'mousedown') mouseHeld = true;
          stop(e);
          return;
        }

        /* Hẹn giờ có hỏng thì bộ chặn vẫn tự tắt ở cú chạm đầu tiên sau khi hết hạn */
        if (expired || !inWindow(now)) {
          expired = true;
          clearTimeout(guardTimer);
          if (type === 'touchstart' || type === 'mousedown') {
            /* Cú chạm mới hoàn toàn thuộc về cuốn sách: quên các cú cũ bị lạc (ngón tay
               không còn trên màn hình nữa) để không nuốt nhầm sự kiện của cú mới */
            eatClickUntil = 0;
            mouseHeld = false;
            var touching = {};
            var tl = e.touches || [];
            for (var i = 0; i < tl.length; i++) touching[String(tl[i].identifier)] = true;
            for (var k in held) {
              if (Object.prototype.hasOwnProperty.call(held, k) && !touching[k]) delete held[k];
            }
          }
          maybeDisarm(now);
          return;
        }

        if (type === 'touchstart') {
          lastDown = now;
          var ch = e.changedTouches || [];
          for (var j = 0; j < ch.length; j++) held[String(ch[j].identifier)] = true;
        } else if (type === 'mousedown') {
          lastDown = now;
          mouseHeld = true;
        }
        stop(e);
      } catch (err) {}
    }

    function armGuard() {
      if (guardOn) return;
      guardOn = true;
      expired = false;
      try {
        var i;
        for (i = 0; i < GUARD_TOUCH.length; i++) window.addEventListener(GUARD_TOUCH[i], onGuard, { capture: true, passive: true });
        for (i = 0; i < GUARD_MOUSE.length; i++) window.addEventListener(GUARD_MOUSE[i], onGuard, true);
      } catch (e) { complain('chặn chạm dồn', e); }
    }

    function disarmGuard() {
      guardOn = false;
      expired = true;
      held = {};
      mouseHeld = false;
      clearTimeout(guardTimer);
      var all = GUARD_TOUCH.concat(GUARD_MOUSE);
      for (var i = 0; i < all.length; i++) {
        try { window.removeEventListener(all[i], onGuard, true); } catch (e) {}
      }
    }

    /* Lớp còn trên màn hình thì cứ chặn; gỡ lớp rồi thì hẹn giờ xem lúc nào tràng chạm dứt */
    function checkGuard() {
      clearTimeout(guardTimer);
      if (!guardOn || !gone || expired) return;
      var now = Date.now();
      if (!inWindow(now)) {
        expired = true;
        maybeDisarm(now);
        /* còn ngón tay chưa nhấc: đợi nó nhấc (onGuard sẽ thôi nghe); hẹn thêm một lần để dọn */
        if (guardOn) guardTimer = setTimeout(function () { maybeDisarm(Date.now()); }, T_COMPAT + 20);
        return;
      }
      var end = Math.max(revealEnd, Math.min(lastDown + T_TAP_GAP, removedAt + T_GUARD_MAX));
      guardTimer = setTimeout(checkGuard, Math.max(10, end - now + 10));
    }

    function noteDown() { lastDown = Date.now(); }

    function openGate() {
      if (!release) return;
      var r = release;
      release = null;
      try { r(); } catch (e) { complain('mở cổng', e); }
      /* Bìa bắt đầu hiện từ lúc này: đo xem bao lâu thì hiện xong để chặn chạm tới lúc đó */
      revealEnd = Date.now() + coverRevealMs(ctx) + 60;
      ctx.emit('envelope:open', {});
    }

    function unbind() {
      if (!bound) return;
      bound = false;
      doc.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', fitAddress);
    }

    /* Kết thúc hẳn: gỡ lớp, trả bàn phím, mở cổng. Gọi bao nhiêu lần cũng được. */
    function destroy() {
      if (gone) return;
      gone = true;
      removedAt = Date.now();
      try {
        for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers = [];
        unbind();
        if (btn && doc.activeElement === btn) btn.blur();
        if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
      } catch (e) {
        complain('dọn dẹp', e);
      } finally {
        /* Đã chạm mở thư (kể cả khi bị chó canh ép kết thúc): vẫn chặn tràng chạm dồn */
        if (opening) armGuard();
        openGate();
        checkGuard();
      }
    }

    /* Hẹn giờ có bảo hiểm: bước nào lỗi thì kết thúc luôn thay vì treo */
    function later(ms, fn) {
      timers.push(setTimeout(function () {
        if (gone) return;
        try { fn(); } catch (e) { complain('hẹn giờ', e); destroy(); }
      }, ms));
    }

    function sound(name) {
      /* Cú chạm này thường là cú chạm đầu tiên nên có thể chưa phát được tiếng: không sao */
      try {
        if (ctx.audio && typeof ctx.audio[name] === 'function') ctx.audio[name]();
      } catch (e) {}
    }

    /* Lớp phong bì mờ đi, cùng lúc sách được phép hiện để hai chuyển động gối lên nhau */
    function leave(ms) {
      if (leaving || gone) return;
      leaving = true;
      unbind();
      try { btn.blur(); } catch (e) {}
      layer.classList.add('is-leaving');
      layer.setAttribute('aria-hidden', 'true');
      /* Từ đây lớp không bắt cú chạm nữa: bật bộ chặn trước khi bìa sách hiện ra */
      armGuard();
      openGate();
      later(ms, destroy);
    }

    function open() {
      if (!live || opening || gone) return;
      opening = true;
      /* cú chạm mở thư cũng là cú đầu của tràng chạm */
      lastDown = Math.max(lastDown, Date.now());
      /* Chó canh: dù chuyện gì xảy ra, sau 2,5 giây sách cũng phải hiện */
      timers.push(setTimeout(destroy, T_WATCHDOG));

      var ok = false;
      try {
        ctx.store.set(STORE_KEY, '1');
        if (navigator.vibrate) { try { navigator.vibrate(14); } catch (e) {} }
        sound('pop');

        if (ctx.reduce) {
          /* Giảm chuyển động: không nứt, không bật nắp, chỉ mờ đi nhẹ nhàng */
          leave(T_REMOVE_CALM);
        } else {
          layer.classList.add('is-opening');
          later(T_FLAP_UP, function () { layer.classList.add('is-flap-up'); });
          later(T_LETTER, function () { sound('flip'); });
          later(T_LEAVE, function () { leave(T_REMOVE); });
        }
        ok = true;
      } catch (e) {
        complain('mở thư', e);
      } finally {
        if (!ok) destroy();
      }
    }

    function onKey(e) {
      if (gone || leaving) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.key;

      if (NAV_KEYS.indexOf(k) !== -1) {
        /* main.js bỏ qua phím đã bị preventDefault, nên sách không lật */
        e.preventDefault();
        return;
      }
      if (k === 'Tab') {
        /* Chỉ có một nút để bấm: giữ tiêu điểm ở phong bì, không cho lọt xuống sách */
        e.preventDefault();
        layer.classList.add('is-keys');
        focusBtn();
        return;
      }
      if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
        layer.classList.add('is-keys');
        /* Tiêu điểm đang ở nút thì trình duyệt tự tạo click; lạc đi đâu đó thì tự mở */
        if (doc.activeElement !== btn) {
          e.preventDefault();
          open();
        }
      }
    }

    function focusBtn() {
      if (!btn || gone || leaving) return;
      try { btn.focus({ preventScroll: true }); } catch (e) {
        try { btn.focus(); } catch (e2) {}
      }
    }

    /* Tên dài (tới 30 ký tự) thì chữ tự nhỏ lại, xuống dòng cho vừa trong phong bì.
       Bình thường không nhỏ hơn 13px. Trường hợp hiếm (một từ dính liền rất dài, hoặc người gửi
       viết cả câu) thì khít dòng lại và cho xuống tới 11px; vẫn không vừa thì cắt gọn theo dòng,
       nhất quyết không để chữ tràn ra ngoài phong bì hay chui xuống dưới nhãn dán. */
    function fitAddress() {
      if (gone || !toEl || !addrEl) return;
      try {
        var boxW = addrEl.clientWidth;
        var boxH = addrEl.clientHeight;
        if (!boxW || !boxH) return;
        var em = parseFloat(getComputedStyle(addrEl).fontSize) || 16;

        var over = function () {
          return toEl.scrollWidth > boxW + 1 || toEl.offsetHeight > boxH + 1;
        };
        var shrink = function (from, min) {
          var size = from;
          var guard = 0;
          toEl.style.fontSize = size.toFixed(2) + 'em';
          while (over() && size > min && guard < 40) {
            size = Math.max(min, size - 0.05);
            toEl.style.fontSize = size.toFixed(2) + 'em';
            guard++;
          }
          return size;
        };

        toEl.classList.remove('is-tight');
        toEl.style.maxHeight = '';
        var size = shrink(1.7, Math.max(0.8, 13 / em));
        if (over()) {
          toEl.classList.add('is-tight');
          shrink(size, Math.max(0.6, 11 / em));
          if (over()) {
            var lineH = parseFloat(getComputedStyle(toEl).lineHeight);
            var rows = lineH > 0 ? Math.max(1, Math.floor((boxH + 1) / lineH)) : 0;
            toEl.style.maxHeight = (rows ? rows * lineH : boxH) + 'px';
          }
        }
      } catch (e) {}
    }

    /* Màn chờ tắt: phong bì rơi xuống */
    function show() {
      if (live || gone) return;
      if (!layer.parentNode) { destroy(); return; }   /* lớp bị ai đó gỡ mất: đừng giữ sách lại */
      live = true;
      layer.classList.add('is-in');
      fitAddress();
      focusBtn();
    }

    try {
      layer = doc.createElement('div');
      layer.className = 'envelope';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-modal', 'true');
      layer.setAttribute('aria-label', 'Phong bì thư mời');
      layer.innerHTML = layerHtml();

      btn = ctx.qs('.envelope__btn', layer);
      addrEl = ctx.qs('.envelope__addr', layer);
      toEl = ctx.qs('.envelope__to', layer);
      btn.setAttribute('aria-label', ctx.fill('Mở thư gửi {to}'));

      /* Chữ của người gửi: luôn đi qua fill() rồi gán bằng textContent, không bao giờ thành HTML */
      var toText = ctx.fill(textOf(ctx, 'to'));
      var stickerText = ctx.fill(textOf(ctx, 'sticker'));
      var hintText = ctx.fill(textOf(ctx, 'hint'));
      var kicker = ctx.get('pages.cover.kicker');
      var kickerText = ctx.fill(typeof kicker === 'string' ? kicker : 'Thư mời');

      toEl.textContent = toText;
      if (!toText.trim()) addrEl.hidden = true;

      var stickerEl = ctx.qs('.envelope__sticker', layer);
      ctx.qs('.envelope__sticker-text', layer).textContent = stickerText;
      if (!stickerText.trim()) stickerEl.parentNode.removeChild(stickerEl);

      var hintEl = ctx.qs('.envelope__hint', layer);
      ctx.qs('.envelope__hint-text', layer).textContent = hintText;
      if (!hintText.trim()) hintEl.hidden = true;

      var kickerEl = ctx.qs('.envelope__kicker', layer);
      kickerEl.textContent = kickerText;
      if (!kickerText.trim()) kickerEl.hidden = true;

      doc.body.appendChild(layer);

      /* File CSS không tải được thì lớp này không che được màn hình và có thể nằm khuất:
         khi đó bỏ luôn phong bì, đừng khóa cuốn sách. */
      if (getComputedStyle(layer).position !== 'fixed') {
        throw new Error('thiếu css/cute/envelope.css');
      }

      release = ctx.gate();

      btn.addEventListener('click', open);
      /* Đếm nhịp chạm ngay trên phong bì, để biết tràng chạm dồn bắt đầu từ lúc nào */
      layer.addEventListener('touchstart', noteDown, { passive: true });
      layer.addEventListener('mousedown', noteDown);
      doc.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', fitAddress);
      bound = true;

      fitAddress();
      focusBtn();

      ctx.on('loader-closed', show);
      /* Phòng khi sự kiện không tới: vẫn cho phong bì hiện ra để còn chạm được */
      timers.push(setTimeout(show, T_SHOW_ANYWAY));

      /* Font chữ viết tay về muộn thì đo lại cho vừa */
      if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) {
        doc.fonts.ready.then(fitAddress, function () {});
      }
    } catch (e) {
      complain('dựng phong bì', e);
      destroy();
    }
  }

  (Invite.features = Invite.features || []).push({
    name: 'envelope',
    setup: setup
  });
})();
