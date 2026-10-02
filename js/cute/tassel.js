/* =====================================================================
   tassel.js - "Chuyển tua mũ cho gấu"

   Ở lễ tốt nghiệp, chuyển tua mũ từ bên này sang bên kia là lúc chính thức
   thành cử nhân. Ở bìa sau, người nhận được làm việc đó giúp bạn gấu:
   chạm vào đôi gấu, tua mũ vung sang bên kia, hai bạn gấu nhảy mừng.
   Từ đó mọi bạn gấu đội mũ trong cả cuốn thư đều đeo tua ở bên "đã tốt
   nghiệp", kể cả khi mở lại link.

   Cách làm: tua đổi bên bằng CSS cho mọi gấu cùng lúc, nhờ một class trên
   <html> (tassel-turned). Không sửa khuôn gấu, không tạo lại gấu.
   Chữ trong bong bóng lấy từ config.js, mục "tassel".
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var root = document.documentElement;

  var KEY = 'tassel:turned';        /* ctx.store tự thêm tiền tố "invite:" */
  var TURNED = 'tassel-turned';
  var DEFAULTS = {
    ask: 'Chuyển tua mũ giúp gấu nha',
    done: 'Chính thức tốt nghiệp rồi!'
  };
  var LABEL_ASK = 'Chuyển tua mũ cho gấu';
  var LABEL_DONE = 'Gấu đã được chuyển tua rồi. Chạm để hai bạn gấu nhảy mừng';

  var SWING_MS = 680;   /* nhỉnh hơn thời lượng tassel-swing trong tassel.css một chút */
  var LAND_MS = 400;    /* lúc tua vừa sang tới bên kia: gấu mới nhảy mừng */
  var HOP_MS = 720;
  var JIG_MS = 620;
  var MAX_CHARS = 90;   /* câu dài hơn nữa thì bong bóng che mất gấu */

  /* Số đo bố cục bong bóng (đơn vị em của trang, trừ khi ghi px) */
  var SIZE = 0.92;          /* cỡ chữ bong bóng bình thường */
  var SIZE_SNUG = 0.86;     /* cỡ chữ khi chật chỗ... */
  var MIN_PX = 13;          /* ...nhưng chữ không bao giờ nhỏ hơn 13px */
  var TAIL = 0.52;          /* đuôi bong bóng thò xuống chừng này: chóp đuôi vừa chạm đỉnh mũ */
  var STITCH = 0.65;        /* đường chỉ khâu của bìa cách mép trên chừng này (book.css, .cover::before) */
  var FLOAT = 0.2;          /* bong bóng lơ lửng lên xuống chừng này (theo cỡ chữ bong bóng) */
  var GAP_MIN = 0.3;        /* chật lắm (câu 2 dòng ở máy 320px) thì mới được lấn lên đường chỉ khâu */
  var MIN_FIT = 0.82;       /* đôi gấu chỉ được thu nhỏ tới mức này để nhường chỗ cho bong bóng */
  var MIN_FIT_TIGHT = 0.74; /* câu 2 dòng mà vẫn thiếu chỗ: thu nhỏ thêm chứ không để bong bóng che mũ */

  var ctx = null;
  var turned = false;
  var wrap = null;      /* .back__couple */
  var couple = null;
  var btn = null;
  var bubble = null;
  var label = null;     /* lớp chữ bên trong bong bóng */
  var live = null;
  var timers = {};
  var lastHearts = 0;

  /* Lỗi trong hẹn giờ hay lúc chạm là việc của riêng tính năng này:
     nuốt lỗi để không bao giờ làm hỏng lá thư. */
  function safe(fn) {
    return function () {
      try { return fn.apply(null, arguments); } catch (e) {
        if (window.console && console.error) console.error('[thu-moi] tassel:', e);
      }
    };
  }

  /* Câu của người gửi: chỉ là chữ thường, điền {to}/{from}, gọt cho gọn.
     Thiếu thì dùng câu mặc định; để trống '' thì ẩn bong bóng. */
  function words(key) {
    var v = ctx.get('tassel.' + key);
    if (v === undefined || v === null || typeof v === 'object' || typeof v === 'function') v = DEFAULTS[key];
    var s = ctx.fill(String(v)).split(/\s+/).join(' ').trim();
    var chars = Array.from ? Array.from(s) : s.split('');
    if (chars.length > MAX_CHARS) s = chars.slice(0, MAX_CHARS - 1).join('').trim() + '…';
    return s;
  }

  /* Gắn class trong một lúc rồi gỡ. Tự giữ hẹn giờ theo từng class để lần chạm sau
     không bị hẹn giờ của lần trước cắt ngang giữa chừng. */
  function pulse(el, cls, ms) {
    clearTimeout(timers[cls]);
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    timers[cls] = setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  function buzz(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  /* Trạng thái nằm trọn trong chữ và class, không phụ thuộc vào biến nào khác */
  function paint(pop) {
    if (!btn) return;
    var text = words(turned ? 'done' : 'ask');
    label.textContent = text;
    bubble.hidden = !text;
    btn.setAttribute('aria-label', turned ? LABEL_DONE : LABEL_ASK);
    if (pop && text && !ctx.reduce) pulse(bubble, 'is-pop', 450);
    layout();
  }

  /* Đặt cỡ chữ bong bóng rồi đo lại chiều cao (chữ nhỏ đi có khi rút từ 2 dòng về 1) */
  function measure(size, snug) {
    if (snug) btn.classList.add('tassel--snug'); else btn.classList.remove('tassel--snug');
    btn.style.setProperty('--tassel-size', size.toFixed(3));
    return bubble.hidden ? 0 : bubble.offsetHeight;
  }

  /* Bong bóng nằm ngay trên đầu đôi gấu, không chiếm chỗ trong bố cục của bìa.
     Phía trên gấu cần đủ chỗ cho: khoảng hở dưới đường chỉ khâu, bong bóng, cái đuôi.
     Thiếu chỗ (điện thoại nhỏ) thì nhường dần theo thứ tự, cái nào ít thấy nhất trước:
       1. bong bóng gọn lại (đệm mỏng hơn, chữ nhỏ đi một chút nhưng vẫn từ 13px);
       2. đôi gấu thu nhỏ một chút (chỉ bằng transform, bố cục bìa không đổi);
       3. bong bóng được lấn lên đường chỉ khâu;
       4. đôi gấu thu nhỏ thêm, để bong bóng không bao giờ che mũ và tua mũ,
          tức đúng thứ người nhận đang được nhờ chuyển;
       5. bất đắc dĩ mới hạ bong bóng xuống, chứ không để chữ bị cắt ở mép bìa. */
  function layout() {
    /* Sách chưa dựng xong hoặc trang đang ẩn thì không đo được: giữ số đo cũ */
    if (!btn || !ctx.book || !wrap.offsetParent) return;
    var pairH = wrap.offsetHeight;
    if (!pairH) return;

    var em = parseFloat(getComputedStyle(btn).fontSize) || 16;
    var free = Math.max(0, wrap.offsetTop);   /* từ mép trên tờ bìa tới đỉnh khung gấu */
    var size = SIZE;
    var h = measure(size, false);

    /* đuôi và độ lơ lửng to nhỏ theo chữ; 2px là nét chỉ khâu, 3px là chỗ thở */
    function tailOf(s) { return em * TAIL * s / SIZE; }
    function gapOf(s) { return em * STITCH + 2 + em * s * FLOAT + 3; }

    var over = h ? h + tailOf(size) + gapOf(size) - free : 0;
    if (over > 0) {
      size = Math.min(SIZE, Math.max(SIZE_SNUG, MIN_PX / em));
      h = measure(size, true);
      over = h + tailOf(size) + gapOf(size) - free;
    }

    var tail = tailOf(size);
    var shift = 0;
    var drop = 0;
    if (h && over > 0) {
      var step = Math.min(over, pairH * (1 - MIN_FIT));          /* bước 2 */
      shift += step; over -= step;
      step = Math.min(over, Math.max(0, gapOf(size) - em * GAP_MIN)); /* bước 3 */
      over -= step;
      step = Math.min(over, pairH * (MIN_FIT - MIN_FIT_TIGHT));  /* bước 4 */
      shift += step; over -= step;
      drop = Math.max(0, over);                                  /* bước 5 */
    }

    /* đáy bong bóng cách đỉnh khung gấu bao nhiêu (số âm = lấn xuống dưới) */
    var lift = tail - shift - drop;
    /* nút vươn lên che cả bong bóng, để chạm vào chữ cũng là chạm vào gấu */
    var ext = h ? Math.min(free, Math.max(0, lift + h + em * 0.2)) : 0;

    wrap.style.setProperty('--tassel-fit', (1 - shift / pairH).toFixed(3));
    btn.style.setProperty('--tassel-lift', lift.toFixed(1) + 'px');
    btn.style.setProperty('--tassel-ext', ext.toFixed(1) + 'px');
  }

  function hearts(count) {
    var now = Date.now();
    if (ctx.reduce || now - lastHearts < 380) return;   /* chạm dồn dập cũng không thả quá nhiều tim */
    lastHearts = now;
    ctx.fx.hearts(wrap, { count: count, near: 46, far: 104, at: 0.4 });
  }

  function hop() {
    if (ctx.reduce || !wrap) return;
    pulse(wrap, 'tassel--hop', HOP_MS);
  }

  /* Lần đầu: tua vung sang bên kia, từ nay mọi bạn gấu đều "đã tốt nghiệp" */
  function turn() {
    turned = true;
    root.classList.add(TURNED);
    ctx.store.set(KEY, '1');
    paint(true);
    if (live) live.textContent = words('done');
    ctx.audio.chime();
    buzz(18);

    if (!ctx.reduce) {
      /* Class swing chỉ dành cho bạn gấu vừa được chạm; gấu ở các trang khác đổi bên ngay. */
      pulse(wrap, 'tassel--swing', SWING_MS);
      clearTimeout(timers.land);
      timers.land = setTimeout(safe(function () {
        hop();
        lastHearts = 0;
        hearts(10);
      }), LAND_MS);
    }
    ctx.emit('tassel:turned', { button: btn });
  }

  /* Những lần sau: chỉ nhảy mừng với vài trái tim, bong bóng giữ nguyên */
  function cheer() {
    ctx.audio.pop();
    buzz(12);
    if (ctx.reduce) return;
    hop();
    pulse(wrap, 'tassel--jig', JIG_MS);
    hearts(6);
  }

  function build() {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tassel__btn';

    var say = document.createElement('span');
    say.className = 'tassel__say';
    bubble = document.createElement('span');
    bubble.className = 'bubble tassel__bubble';
    /* Chữ nằm trong một lớp riêng để cắt gọn còn 2 dòng mà không cắt mất cái đuôi bong bóng */
    label = document.createElement('span');
    label.className = 'tassel__text';
    bubble.appendChild(label);
    say.appendChild(bubble);
    btn.appendChild(say);

    /* Hai ngôi sao nhỏ nháy cạnh mũ để mời chạm (chỉ là trang trí) */
    var pair = document.createElement('span');
    pair.className = 'tassel__pair';
    pair.appendChild(ctx.fx.icon('sparkle', 'tassel__spark tassel__spark--a'));
    pair.appendChild(ctx.fx.icon('star', 'tassel__spark tassel__spark--b'));
    btn.appendChild(pair);

    /* Nút đứng TRƯỚC đôi gấu trong DOM để CSS làm được hiệu ứng nhấn (nút:active + .couple) */
    wrap.insertBefore(btn, wrap.firstChild);
    wrap.classList.add('tassel');

    /* Bản lõi mới đã tự đặt aria-hidden lên riêng hình đôi gấu. Phòng khi gặp bản cũ
       (aria-hidden nằm trên cả khung gấu, che luôn nút của mình): chuyển phần "ẩn"
       xuống hình đôi gấu để nút vẫn tới được trình đọc màn hình. */
    if (wrap.getAttribute('aria-hidden') === 'true') {
      wrap.removeAttribute('aria-hidden');
      couple.setAttribute('aria-hidden', 'true');
    }

    btn.addEventListener('click', safe(function () {
      if (turned) cheer(); else turn();
    }));
    paint(false);
  }

  (Invite.features = Invite.features || []).push({
    name: 'tassel',

    setup: function (c) {
      ctx = c;

      /* Đã chuyển tua từ lần mở trước: bật ngay trước khi gấu nào kịp hiện ra,
         không chuyển động, không âm thanh. */
      turned = ctx.store.get(KEY) === '1';
      if (turned) root.classList.add(TURNED);

      wrap = ctx.qs('.page--back .back__couple', ctx.bookEl);
      couple = wrap ? ctx.qs('.couple', wrap) : null;
      if (!wrap || !couple) { wrap = null; return; }   /* bìa sau không có đôi gấu: chỉ giữ trạng thái tua */
      build();
    },

    ready: function () {
      if (!btn) return;

      /* Báo cho trình đọc màn hình khi gấu tốt nghiệp. Nằm ngoài trang sách. */
      live = document.createElement('p');
      live.className = 'sr-only tassel__live';
      live.setAttribute('aria-live', 'polite');
      (ctx.qs('.app') || document.body).appendChild(live);

      var relayout = safe(layout);
      var raf = function (fn) {
        if (window.requestAnimationFrame) window.requestAnimationFrame(fn);
        else setTimeout(fn, 16);
      };
      var backPage = wrap.closest ? wrap.closest('.page') : null;

      /* Số đo chỉ lấy được khi bìa sau đang hiện, nên đo lại mỗi lần lật tới */
      ctx.on('start', relayout);
      ctx.on('turn', function () { raf(relayout); });
      ctx.on('shown', function (d) {
        if (!backPage || d.page === backPage) relayout();
      });

      var timer = null;
      window.addEventListener('resize', function () {
        clearTimeout(timer);
        timer = setTimeout(relayout, 260);   /* sau khi phần lõi đã chỉnh lại cỡ chữ của trang */
      });
      if (document.fonts && document.fonts.addEventListener) {
        document.fonts.addEventListener('loadingdone', function () { setTimeout(relayout, 220); });
      }
      relayout();
    }
  });
})();
