/* =====================================================================
   pinky-promise.js - "Ngoéo tay điểm chỉ"

   Bấm "Mình sẽ đến!" thì dễ, còn ngoéo tay là lời hứa không được nuốt.
   Sau khi người nhận đồng ý, dưới nút ăn mừng hiện ra một tấm thẻ nhỏ có
   hộp mực tròn. Giữ ngón tay trên đó: năm đường vân hình trái tim lần lượt
   lên mực. Đủ năm đường thì hộp mực biến thành dấu vân tay hình tim có ghi
   ngày, và được nhớ lại ở những lần mở thư sau.

   Vì trang sách bị nhân bản lúc lật, mọi trạng thái nhìn thấy được đều nằm
   trong DOM: thuộc tính data-step trên nút, class pinky-promise--done trên
   trang, chữ của nhãn. File này không giữ gì "ngầm" mà bản sao không thấy.

   Chỉnh lời trong config.js, mục "pinkyPromise".
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};

  var STORE_KEY = 'pinky-promise:sealed';
  var RIDGES = 5;          /* số đường vân của dấu tay */
  var TAP_MS = 250;        /* nhả tay trước mốc này thì chắc chắn là một cú chạm */
  var CLICK_GUARD = 700;   /* click đến sau cú chạm trong khoảng này là của chính cú chạm đó */
  /* Đợi pháo giấy của màn "Mình sẽ đến!" lắng xuống rồi mới cho hộp mực nảy ra,
     để hai màn vui không giành nhau sự chú ý */
  var REVEAL_MS = 2400;
  var REVEAL_CALM_MS = 300;  /* giảm chuyển động: không có pháo giấy để chờ */
  /* Người nhận lật đi trước khi hộp mực kịp nảy: đợi họ quay lại trang này, rồi chờ thêm một
     nhịp cho trang đứng yên (chế độ vuốt ngang còn đang trượt) để cú nảy diễn ra trước mắt họ */
  var ARRIVE_MS = 380;
  /* Một lần lật trang của thư viện mất 0,7 giây. Quá mốc này mà chưa thấy trang mới thì coi như
     người nhận đã kéo góc trang rồi buông về chỗ cũ (thư viện không báo lần lật bị huỷ) */
  var TURN_MAX_MS = 1200;
  var RETRY_MS = 200;

  var DONE_CLASS = 'pinky-promise--done';
  var WAIT_CLASS = 'pinky-promise--wait';
  var POP_CLASS = 'pinky-promise--pop';
  var HELD_CLASS = 'pinky-promise__pad--held';
  var STAMP_CLASS = 'pinky-promise__cushion--stamp';

  /* Cùng hình trái tim với icon i-heart, để dấu tay hợp với cả cuốn sách */
  var HEART = 'M12 21.2c-.4 0-.8-.1-1.1-.4C6.1 17 2 13.4 2 8.9 2 6 4.2 3.8 7 3.8c1.9 0 3.6 1 5 2.9 ' +
    '1.4-1.9 3.1-2.9 5-2.9 2.8 0 5 2.2 5 5.1 0 4.5-4.1 8.1-8.9 11.9-.3.3-.7.4-1.1.4z';

  var DEFAULTS = {
    label: 'Giữ ngón tay ở đây để ngoéo tay',
    early: 'Ơ, giữ thêm xíu nữa mà!',
    /* Chạm là một cách hoàn thành đàng hoàng (giữ lâu có thể trục trặc trong trình duyệt
       của Zalo/Messenger), nên câu này nói thẳng là chạm tiếp cũng được. {left} = số lần còn lại. */
    tapHint: 'Chạm thêm {left} lần nữa cũng được nha',
    done: 'Đã ngoéo tay ngày {date}.',
    penalty: 'Ai nuốt lời phải bao trà sữa!',
    holdMs: 1600
  };

  /* Năm nốt đi lên dần (Đô Rê Mi Son La), nốt cuối nhường cho tiếng chuông ăn mừng */
  var NOTES = [523.25, 587.33, 659.25, 783.99, 880];

  /* Các phần tử dựng ở setup, dùng lại ở ready */
  var page = null;
  var wrap = null;
  var pad = null;
  var cushion = null;
  var card = null;
  var label = null;

  function complain(where, err) {
    if (window.console && console.error) console.error('[thu-moi] pinky-promise ' + where + ':', err);
  }

  /* Lỗi trong bộ hẹn giờ hay trình nghe sự kiện không được làm hỏng phần còn lại của thư */
  function safe(where, fn) {
    return function (a) {
      try { return fn(a); } catch (err) { complain(where, err); }
    };
  }

  function two(n) { return n < 10 ? '0' + n : String(n); }

  /* Dấu vân tay: năm trái tim lồng nhau, phóng quanh tâm. Mỗi đường có vài chỗ đứt
     (stroke-dasharray tính theo phần trăm chu vi nhờ pathLength=100) để nhìn ra vân tay
     chứ không phải bia bắn. Bề dày nét chia cho tỉ lệ phóng để đường nào cũng dày như nhau. */
  function printMarkup() {
    var scales = [0.2, 0.41, 0.62, 0.83, 1.04];
    var dashes = ['', '46 8 38 8', '20 5.5 40 5.5 23.5 5.5', '33 4 16 4 30 4 5 4', '14 3.3 26 3.3 19 3.3 27.8 3.3'];
    var offsets = [0, 12, 31, 7, 22];
    var html = '<svg class="pinky-promise__print" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path class="pinky-promise__ink" d="' + HEART + '" transform="' + around(1.04) + '"/>';

    for (var i = 0; i < RIDGES; i++) {
      html += '<path class="pinky-promise__ridge pinky-promise__ridge--' + (i + 1) + '" pathLength="100" d="' + HEART + '"' +
        ' transform="' + around(scales[i]) + '" stroke-width="' + (1.15 / scales[i]).toFixed(2) + '"' +
        (dashes[i] ? ' stroke-dasharray="' + dashes[i] + '" stroke-dashoffset="' + offsets[i] + '"' : '') + '/>';
    }
    return html + '</svg>';
  }

  function around(scale) {
    return 'translate(12 12.6) scale(' + scale + ') translate(-12 -12.6)';
  }

  /* Đọc cấu hình: thiếu mục nào thì dùng lời có sẵn. Riêng "penalty" được phép để trống. */
  function readOptions(ctx) {
    var opt = {};
    var key;
    for (key in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) opt[key] = DEFAULTS[key];
    }

    ['label', 'early', 'tapHint', 'done'].forEach(function (name) {
      var v = ctx.get('pinkyPromise.' + name);
      if (typeof v === 'string' && v.trim()) opt[name] = v;
    });

    var penalty = ctx.get('pinkyPromise.penalty');
    if (typeof penalty === 'string') opt.penalty = penalty.trim();

    var ms = Number(ctx.get('pinkyPromise.holdMs'));
    if (isFinite(ms) && ms > 0) opt.holdMs = Math.max(300, Math.min(10000, ms));

    return opt;
  }

  /* ---------- setup: dựng tấm thẻ vào chỗ của nút "Để nghĩ đã…" ---------- */

  function setup(ctx) {
    var stack = ctx.qs('.page--rsvp .page__cta--stack');
    if (!stack) return;

    var box = document.createElement('div');
    box.className = 'pinky-promise';
    box.hidden = true;   /* chỉ hiện sau khi người nhận đã đồng ý */
    /* Lớp ngoài chỉ để đo bề rộng (container query trong CSS); tấm thẻ nằm bên trong */
    box.innerHTML =
      '<div class="pinky-promise__card">' +
        '<button class="pinky-promise__pad" type="button" data-no-swipe data-step="0" aria-label="Giữ, hoặc chạm năm lần, để ngoéo tay">' +
          '<span class="pinky-promise__cushion">' + printMarkup() + '</span>' +
        '</button>' +
        '<span class="pinky-promise__label" aria-live="polite"></span>' +
        '<svg class="pinky-promise__spark" aria-hidden="true" focusable="false"><use href="#i-sparkle"/></svg>' +
      '</div>';
    stack.appendChild(box);

    page = ctx.qs('.page--rsvp');
    wrap = box;
    pad = ctx.qs('.pinky-promise__pad', box);
    cushion = ctx.qs('.pinky-promise__cushion', box);
    card = ctx.qs('.pinky-promise__card', box);
    label = ctx.qs('.pinky-promise__label', box);
  }

  /* ---------- ready: nối hành vi ---------- */

  function ready(ctx) {
    if (!page || !wrap || !pad || !cushion || !card || !label) return;

    var opt = readOptions(ctx);
    var stepMs = opt.holdMs / RIDGES;
    /* Nhả trước mốc này là một cú chạm (ít nhất 250ms, dài hơn nếu một nấc giữ lâu hơn thế) */
    var tapLimit = Math.max(TAP_MS, stepMs);

    var base = 0;            /* số đường vân đã "ăn chắc" nhờ các cú chạm ngắn */
    var step = 0;            /* số đường vân đang lên mực trên màn hình */
    var held = false;
    var done = false;
    var shown = false;
    var t0 = 0;
    var timer = null;
    var pointerId = null;
    var lastPointer = 0;     /* lần cuối có ngón tay hay chuột trên hộp mực */
    var lastTouch = 0;
    var lastHeight = -1;
    var rsvpIndex = ctx.pageIndex('.page--rsvp');
    var pending = false;     /* tới giờ nảy ra mà người nhận đang ở trang khác: để dành cú nảy */
    var turnAt = 0;          /* lúc một lần lật trang bắt đầu (0 = sách đang đứng yên) */

    /* Chữ dài ngắn khác nhau có thể làm tấm thẻ cao lên; chỉ khi đó mới nhờ sách đo lại trang */
    function refitIfResized() {
      var h = wrap.offsetHeight;
      if (h === lastHeight) return;
      ctx.refit();
      lastHeight = wrap.offsetHeight;
    }

    /* Chữ của người gửi luôn đi qua textContent, không bao giờ thành HTML */
    function setLabel(text) {
      label.textContent = ctx.fill(text);
      refitIfResized();
    }

    /* Nhãn đã ngoéo tay: câu ghi ngày và câu phạt là hai mảnh riêng, để dòng xuống đúng chỗ
       (không có chữ "Ai" lẻ loi cuối dòng). Chữ vẫn chỉ đi vào bằng textContent. */
    function paintDone(ts) {
      var d = new Date(ts);
      var date = two(d.getDate()) + '/' + two(d.getMonth() + 1);
      label.textContent = '';
      label.appendChild(part('pinky-promise__when', ctx.fill(opt.done).split('{date}').join(date)));
      if (opt.penalty) {
        label.appendChild(document.createTextNode(' '));
        label.appendChild(part('pinky-promise__fine', ctx.fill(opt.penalty)));
      }
    }

    function part(className, text) {
      var span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      return span;
    }

    function paintStep(n) {
      step = n;
      pad.setAttribute('data-step', String(n));
    }

    function buzz(pattern) {
      if (!navigator.vibrate) return;
      try { navigator.vibrate(pattern); } catch (err) {}
    }

    /* Ngón tay che mất hộp mực, nên mỗi nấc có một vòng sóng lan ra từ dưới ngón tay */
    function ripple() {
      if (ctx.reduce || !cushion.animate) return;
      var ring = document.createElement('span');
      ring.className = 'pinky-promise__ring';
      ctx.fx.fly(cushion, ring, [
        { transform: 'scale(.85)', opacity: 0.85 },
        { transform: 'scale(1.9)', opacity: 0 }
      ], { duration: 640, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
    }

    /* Phản hồi cho một nấc mới: nốt nhạc cao dần, rung khẽ, vòng sóng, hai trái tim bay lên */
    function stepFx(n) {
      ctx.audio.tone(NOTES[(n - 1) % NOTES.length], 0, 0.24, 'sine', 0.06);
      buzz(8);
      if (ctx.reduce) return;
      ripple();
      ctx.fx.hearts(pad, { count: 2, near: 22, far: 40, at: 0.08 });
    }

    function stopHold() {
      held = false;
      pointerId = null;
      if (timer) { clearInterval(timer); timer = null; }
      pad.classList.remove(HELD_CLASS);
    }

    /* Vẽ trạng thái "đã ngoéo tay". Dùng chung cho lúc vừa hứa xong và lúc mở lại thư,
       nên ở đây không có âm thanh hay chuyển động nào. */
    function paintSealed(ts) {
      done = true;
      base = RIDGES;
      paintStep(RIDGES);
      /* Khoá nút. Nếu nút đang được chọn (vừa bấm Enter/phím cách, hay trình đọc màn hình),
         khoá kiểu "disabled" thật sẽ đánh rơi tiêu điểm về <body>: người dùng bàn phím lạc chỗ,
         và tờ vé tự mở ngay sau đó cũng trả tiêu điểm về <body> khi đóng. Khi đó chỉ báo
         aria-disabled, nút vẫn giữ tiêu điểm; mọi cú bấm sau khi xong đã bị bỏ qua (biến done).
         Mở lại thư thì không có tiêu điểm nào để mất, khoá thật cho nút ra khỏi vòng phím Tab. */
      if (document.activeElement === pad) pad.setAttribute('aria-disabled', 'true');
      else pad.disabled = true;
      /* Hứa xong thì dấu tay chỉ còn là hình: trả lại quyền vuốt lật trang cho chỗ này */
      pad.removeAttribute('data-no-swipe');
      pad.setAttribute('aria-label', 'Đã ngoéo tay');
      page.classList.add(DONE_CLASS);
      paintDone(ts);
    }

    /* Đã đóng dấu thì tấm thẻ co lại ôm vừa hai câu và nằm giữa, nên hộp mực dịch sang phải
       một chút. Cho cả tấm thẻ bắt đầu từ chỗ cũ rồi trượt êm về giữa (chỉ transform), để
       ngay lúc "cộp" dấu tay vẫn nằm đúng dưới ngón tay chứ không giật đi. */
    function glide(fromLeft) {
      if (ctx.reduce || !card.animate) return;
      var dx = fromLeft - pad.getBoundingClientRect().left;
      if (Math.abs(dx) < 1) return;
      card.animate([
        { transform: 'translateX(' + dx.toFixed(1) + 'px)' },
        { transform: 'none' }
      ], { duration: 420, delay: 180, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' });
    }

    function finish() {
      if (done) return;
      stopHold();
      var now = Date.now();
      var padLeft = pad.getBoundingClientRect().left;
      ctx.store.set(STORE_KEY, String(now));
      paintSealed(now);

      ctx.audio.chime();
      buzz([20, 40, 20]);
      if (!ctx.reduce) {
        glide(padLeft);
        ctx.replay(cushion, STAMP_CLASS, 700);
        ctx.fx.hearts(pad, { count: 10, near: 40, far: 100 });
      }

      ctx.refit();
      lastHeight = wrap.offsetHeight;
      ctx.emit('pinky-promise:sealed', { at: now });
    }

    /* ----- Giữ và nhả ----- */

    function tick() {
      if (!held || done) return;
      var n = Math.min(RIDGES, base + Math.floor((Date.now() - t0) / stepMs));
      if (n <= step) return;
      paintStep(n);
      if (n >= RIDGES) finish();
      else stepFx(n);
    }

    /* Lúc ngón tay thật sự chạm/nhấc, theo đồng hồ Date.now(). Khi máy đang bận (pháo giấy
       vẫn rơi), sự kiện có thể tới tay mình trễ cả trăm mili giây; đo bằng giờ xử lý thì một cú
       chạm nhanh dễ bị tính nhầm thành "giữ". e.timeStamp ghi đúng lúc sự kiện xảy ra. Trình
       duyệt cũ ghi timeStamp theo kiểu khác thì tuổi ra số vô lý, khi đó dùng giờ hiện tại. */
    function eventTime(e) {
      var now = Date.now();
      var perf = window.performance;
      if (!e || typeof e.timeStamp !== 'number' || !perf || !perf.now) return now;
      var age = perf.now() - e.timeStamp;
      return (age >= 0 && age < 1000) ? now - age : now;
    }

    function press(at) {
      if (done || held || !shown) return false;
      held = true;
      t0 = at || Date.now();
      lastPointer = t0;
      pad.classList.add(HELD_CLASS);
      timer = setInterval(safe('tick', tick), 40);
      return true;
    }

    /* how: 'up' là nhả tay thật; 'cancel' là hệ thống cắt ngang hoặc ngón tay trượt ra ngoài;
       'abort' là sách lật trang hay thư bị che mất, khi đó lặng lẽ trả về như cũ. */
    function release(how, at) {
      if (!held) return;
      var dt = (at || Date.now()) - t0;
      stopHold();
      lastPointer = Date.now();
      if (done) return;

      if (how === 'up' && dt < tapLimit) {
        /* Chỉ chạm chứ không giữ: mỗi cú chạm được một đường vân ăn chắc, năm cú là xong.
           Nhả tay trước khi lần giữ kịp lên đường vân nào cũng tính là chạm, để không có
           khoảng "chạm hơi chậm" nào bị mất công. Nấc vừa hiện lúc giữ (nếu có) chỉ là nấc này. */
        var had = step > base;
        base = Math.min(RIDGES, base + 1);
        paintStep(base);
        if (base >= RIDGES) { finish(); return; }
        if (!had) stepFx(base);
        setLabel(opt.tapHint.split('{left}').join(String(RIDGES - base)));
        return;
      }

      /* Nhả sớm: các đường vân của lần giữ này phai đi, phần đã ăn chắc thì còn nguyên */
      paintStep(base);
      if (how !== 'abort' && dt >= TAP_MS) setLabel(opt.early);
    }

    if (window.PointerEvent) {
      pad.addEventListener('pointerdown', safe('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (!press(eventTime(e))) return;
        /* Ngón tay: chặn các sự kiện chuột "giả" trình duyệt bắn ra sau khi nhấc tay. Nếu trang
           đã lật đi trong lúc giữ, chúng rơi xuống trang khác và thư viện lật sách tưởng là một
           cú bấm để lật tiếp. Sự kiện click vẫn đến bình thường. */
        if (e.pointerType !== 'mouse' && e.cancelable) e.preventDefault();
        pointerId = e.pointerId;
        /* Giữ lấy con trỏ để ngón tay lỡ trượt khỏi hộp mực vẫn không bị coi là nhả */
        try { pad.setPointerCapture(e.pointerId); } catch (err) {}
      }));
      pad.addEventListener('pointerup', safe('pointerup', function (e) {
        if (e.pointerId === pointerId) release('up', eventTime(e));
      }));
      ['pointercancel', 'pointerleave', 'lostpointercapture'].forEach(function (name) {
        pad.addEventListener(name, safe(name, function (e) {
          if (e.pointerId === pointerId) release('cancel', eventTime(e));
        }));
      });
    } else {
      /* Máy cũ không có Pointer Events: dùng touch, rồi tới chuột. Sau một cú chạm trình duyệt
         còn bắn thêm sự kiện chuột giả, phải bỏ qua kẻo một cú chạm bị tính hai lần. */
      pad.addEventListener('touchstart', safe('touchstart', function (e) {
        lastTouch = Date.now();
        press(eventTime(e));
      }), { passive: true });
      pad.addEventListener('touchend', safe('touchend', function (e) {
        lastTouch = Date.now();
        /* Như nhánh Pointer Events: không để chuột giả rơi xuống trang khác sau khi nhấc tay */
        if (held && e.cancelable) e.preventDefault();
        release('up', eventTime(e));
      }));
      pad.addEventListener('touchcancel', safe('touchcancel', function () {
        lastTouch = Date.now();
        release('cancel');
      }));
      pad.addEventListener('mousedown', safe('mousedown', function (e) {
        if (e.button !== 0 || Date.now() - lastTouch < 1000) return;
        press(eventTime(e));
      }));
      pad.addEventListener('mouseup', safe('mouseup', function (e) {
        if (Date.now() - lastTouch < 1000) return;
        release('up', eventTime(e));
      }));
      pad.addEventListener('mouseleave', safe('mouseleave', function () {
        if (Date.now() - lastTouch < 1000) return;
        release('cancel');
      }));
    }

    /* Trong lúc còn chờ ngoéo tay, ngón tay trượt trên hộp mực không được cuộn trang
       (chế độ dự phòng vuốt ngang). Hứa xong thì thôi chặn. */
    pad.addEventListener('touchmove', function (e) {
      if (!done && e.cancelable) e.preventDefault();
    }, { passive: false });

    /* Giữ lâu trên điện thoại hay bật menu ngữ cảnh: chặn lại */
    pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* Bàn phím (Enter, phím cách) và trình đọc màn hình kích hoạt nút bằng "click" mà không có
       ngón tay nào đặt xuống: cho hoàn thành ngay, vì không thể "giữ" theo cách đó. */
    pad.addEventListener('click', safe('click', function () {
      if (done || !shown || held) return;
      if (Date.now() - lastPointer < CLICK_GUARD) return;
      finish();
    }));

    /* Sách lật sang trang khác hoặc thư bị che: bỏ lần giữ đang dở */
    ctx.on('turn', safe('turn', function () {
      turnAt = Date.now();
      release('abort');
    }));
    ctx.on('shown', safe('shown', function (d) {
      turnAt = 0;
      /* Quay lại trang lời mời khi cú nảy còn để dành: giờ mới là lúc cho người nhận xem */
      if (pending && d && d.index === rsvpIndex) {
        pending = false;
        later(ARRIVE_MS);
      }
    }));
    document.addEventListener('visibilitychange', safe('visibilitychange', function () {
      if (document.hidden) release('abort');
      else if (pending) { pending = false; later(ARRIVE_MS); }
    }));

    /* ----- Hiện tấm thẻ ----- */

    function reveal(animated) {
      if (shown) return;
      shown = true;
      wrap.hidden = false;
      wrap.classList.remove(WAIT_CLASS);
      if (!done) label.textContent = ctx.fill(opt.label);
      if (animated && !ctx.reduce) {
        ctx.replay(wrap, POP_CLASS, 700);
        ctx.audio.pop();
      }
      refitIfResized();
    }

    /* Vừa bấm đồng ý: giữ sẵn chỗ (còn vô hình) để bố cục chỉ xê dịch một lần,
       rồi cho tấm thẻ nảy ra khi màn ăn mừng đã qua cao trào. */
    function reserve() {
      if (shown || !wrap.hidden) return;
      if (!done) label.textContent = ctx.fill(opt.label);
      wrap.classList.add(WAIT_CLASS);
      wrap.hidden = false;
      refitIfResized();
      later(ctx.reduce ? REVEAL_CALM_MS : REVEAL_MS);
    }

    function later(ms) {
      setTimeout(safe('reveal', revealIfSeen), ms);
    }

    /* Cú nảy và tiếng "pop" là màn chào của tấm thẻ, nên chỉ diễn khi người nhận đang nhìn
       trang lời mời: không đang lật dở, không ở trang khác, thư không bị che. Nếu không thì
       để dành (chỗ trống vô hình vẫn giữ nguyên, bố cục không xê dịch thêm lần nào) và diễn
       khi họ quay lại. Đã nảy rồi thì thôi, không bao giờ diễn hai lần. */
    function revealIfSeen() {
      if (shown) return;
      if (document.hidden || ctx.book.current() !== rsvpIndex) {
        pending = true;
        return;
      }
      if (turnAt && Date.now() - turnAt < TURN_MAX_MS) {
        /* Trang đang lật dở (có thể là lật đi): hỏi lại khi sách đã đứng yên */
        later(RETRY_MS);
        return;
      }
      reveal(true);
    }

    /* ----- Khôi phục sau khi tải lại: không âm thanh, không chuyển động, không phát sự kiện ----- */

    var saved = Number(ctx.store.get(STORE_KEY));
    if (isFinite(saved) && saved > 0) paintSealed(saved);

    if (ctx.saidYes()) reveal(false);

    ctx.on('rsvp-yes', function (d) {
      /* "Ăn mừng lần nữa" không được làm lại hay đặt lại điều gì */
      if (d && d.again) return;
      reserve();
    });
  }

  (Invite.features = Invite.features || []).push({
    name: 'pinky-promise',
    setup: setup,
    ready: ready
  });
})();
