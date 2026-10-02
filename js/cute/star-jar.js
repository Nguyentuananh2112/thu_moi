/* =====================================================================
   star-jar.js - Lọ sao giấy: mỗi ngôi sao giữ một lý do

   Thêm một trang ngay trước trang lời mời cuối. Trên trang có một chiếc
   lọ thủy tinh đựng sao giấy. Mỗi lần chạm vào lọ, một ngôi sao nhảy ra
   và mở thành dải giấy ghi một lý do. Ngôi sao cuối cùng màu vàng. Lấy
   hết sao rồi thì chạm lần nữa để gấp sao lại vào lọ.

   Nội dung lấy từ mục "starJar" trong config.js (thiếu dòng nào thì dùng
   chữ mặc định ở dưới).

   Vì thư viện lật trang nhân bản cả trang khi lật, toàn bộ trạng thái
   nằm trong class, thuộc tính và chữ của các phần tử, để bản sao lúc nào
   cũng vẽ đúng mà không cần JS.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};

  var MAX_STARS = 8;
  var TONES = ['pink', 'butter', 'mint', 'sky', 'lav'];

  var DEFAULTS = {
    title: 'Vì sao phải có {to}?',
    hint: 'Chạm vào lọ để lấy một ngôi sao',
    /* Đây là lời riêng của người gửi nên để chữ giữ chỗ */
    reasons: [
      'Lorem ipsum dolor sit amet.',
      'Consectetur adipiscing elit sed do.',
      'Eiusmod tempor incididunt ut labore.',
      'Ut enim ad minim veniam quis.',
      'Duis aute irure dolor in voluptate.'
    ],
    /* Dấu cách không ngắt ( ) giữ "lý do" luôn đi cùng nhau khi xuống dòng */
    empty: 'Hết sao rồi, nhưng lý do thì còn nhiều lắm',
    refill: 'Chạm để gấp sao lại vào lọ',
    waiting: 'Mỗi ngôi sao giấy giữ một lý do'
  };

  /* Hiện khi người gửi để danh sách lý do trống */
  var NONE_TEXT = 'Sao còn đang được gấp dở, chờ một xíu nha';

  /* Sau khi ngôi sao vàng ra, phải chờ chừng này mới gấp sao lại được,
     kẻo chạm lỡ hai lần là lý do quan trọng nhất biến mất ngay. */
  var GOLD_LOCK_MS = 1100;

  /* Lý do dài hơn chừng này ký tự thì dải giấy đổi sang kiểu "chữ rộng":
     ngôi sao thành nhãn dán ở góc, chữ được cả bề ngang, khỏi phải thu nhỏ. */
  var LONG_CHARS = 90;

  /* Ngôi sao bay mất chừng này thì chạm dải giấy; dải giấy mở ra đúng lúc đó (khớp với CSS) */
  var HOP_MS = 520;

  /* Chỗ nằm của từng ngôi sao trong lọ (tâm x, tâm y, góc nghiêng), tính theo
     khung vẽ 160 x 188. Xếp từ đáy lên: chỗ số 0 là ngôi sao vàng nằm dưới
     cùng, lấy ra sau chót. */
  var SLOTS = [
    [80, 151, -5],
    [46, 150, -18],
    [114, 150, 14],
    [63, 122, 20],
    [97, 121, -12],
    [80, 93, 10],
    [46, 96, -24],
    [114, 95, 22]
  ];

  /* Sao trong lọ to gấp chừng này so với nét vẽ gốc (bán kính gốc khoảng 12,7) */
  var STAR_SCALE = 1.55;
  var STAR_SIZE = 12.7 * 2 * STAR_SCALE;

  /* Ngôi sao may mắn: sao năm cánh mập, bo tròn nhờ nét viền dày */
  var STAR_D = 'M0 -10L3.29 -4.53L9.51 -3.09L5.33 1.73L5.88 8.09L0 5.6L-5.88 8.09L-5.33 1.73L-9.51 -3.09L-3.29 -4.53Z';

  var FACE =
    '<g class="star-jar__s-face">' +
      '<ellipse class="star-jar__s-cheek" cx="-4.3" cy="2.5" rx="1.35" ry="0.85"/>' +
      '<ellipse class="star-jar__s-cheek" cx="4.3" cy="2.5" rx="1.35" ry="0.85"/>' +
      '<circle class="star-jar__s-eye" cx="-2.4" cy="0.5" r="0.95"/>' +
      '<circle class="star-jar__s-eye" cx="2.4" cy="0.5" r="0.95"/>' +
      '<path class="star-jar__s-smile" d="M-1.4 2.3q1.4 1.5 2.8 0"/>' +
    '</g>';

  function starShape(withFace) {
    return '<path class="star-jar__s-edge" d="' + STAR_D + '"/>' +
      '<path class="star-jar__s-fill" d="' + STAR_D + '"/>' +
      '<ellipse class="star-jar__s-shine" cx="-3.2" cy="-3.7" rx="2.2" ry="1.1" transform="rotate(-34 -3.2 -3.7)"/>' +
      (withFace ? FACE : '');
  }

  /* Ngôi sao rời (huy hiệu trên dải giấy, ngôi sao đang bay).
     Khuôn mặt chỉ hiện ở sao vàng, việc đó CSS lo. */
  function miniStar(className) {
    return '<svg class="' + className + '" viewBox="-13.5 -13.5 27 27" aria-hidden="true" focusable="false">' +
      starShape(true) + '</svg>';
  }

  /* Màu của ngôi sao được lấy ra ở lượt thứ k (tính từ 1); ngôi cuối cùng màu vàng */
  function toneOf(k, total) {
    return k >= total ? 'gold' : TONES[(k - 1) % TONES.length];
  }

  function jarSvg(total) {
    var stars = '';
    /* Vẽ từ chỗ cao nhất xuống đáy để sao phía dưới (và sao vàng) nằm đè lên trên */
    for (var j = total - 1; j >= 0; j--) {
      var s = SLOTS[j];
      var order = total - j;               /* sao ở chỗ j được lấy ra ở lượt thứ mấy */
      var tone = toneOf(order, total);
      stars +=
        '<g class="star-jar__star" data-order="' + order + '" data-tone="' + tone + '" transform="translate(' + s[0] + ' ' + s[1] + ')">' +
          '<g class="star-jar__star-in" style="--d:' + (j * 70) + 'ms">' +
            '<g transform="rotate(' + s[2] + ') scale(' + STAR_SCALE + ')">' + starShape(tone === 'gold') + '</g>' +
          '</g>' +
        '</g>';
    }

    var glass = 'M50 30h60a5 5 0 0 1 5 5v8c0 5 3 8 9 11 9 5 14 12 14 22v72a26 26 0 0 1-26 26H48a26 26 0 0 1-26-26V76c0-10 5-17 14-22 6-3 9-6 9-11v-8a5 5 0 0 1 5-5z';

    return '<svg class="star-jar__svg" viewBox="0 0 160 188" aria-hidden="true" focusable="false">' +
      '<path class="star-jar__glass" d="' + glass + '"/>' +
      '<path class="star-jar__base" d="M25 146c1 14 10 24 23 24h64c13 0 22-10 23-24-5 10-13 15-23 15H48c-10 0-18-5-23-15z"/>' +
      '<g class="star-jar__again" transform="translate(80 118)"><g class="star-jar__again-in">' +
        '<use href="#i-replay" x="-17" y="-17" width="34" height="34"/>' +
      '</g></g>' +
      '<g class="star-jar__stars">' + stars + '</g>' +
      '<path class="star-jar__sheen" d="' + glass + '"/>' +
      '<path class="star-jar__glint" d="M33.5 86c-2 15-2 33 0 50"/>' +
      '<path class="star-jar__glint" d="M36.5 73v.1"/>' +
      '<path class="star-jar__glint star-jar__glint--soft" d="M127 98c1.2 10 1.2 20 0 30"/>' +
      '<path class="star-jar__outline" d="' + glass + '"/>' +
      '<rect class="star-jar__rim" x="41.5" y="27" width="77" height="9.5" rx="4.75"/>' +
      '<g class="star-jar__lid">' +
        '<rect class="star-jar__cork" x="49" y="8" width="62" height="21" rx="7"/>' +
        '<path class="star-jar__cork-top" d="M56 8h48a7 7 0 0 1 7 7v2H49v-2a7 7 0 0 1 7-7z"/>' +
        '<path class="star-jar__cork-dot" d="M60 22h.1M74 24.5h.1M87 21.5h.1M100 24h.1M67 13h.1M93 12.5h.1"/>' +
      '</g>' +
      '<path class="star-jar__band" d="M45 39.5c23 3.6 47 3.6 70 0v7.2c-23 3.6-47 3.6-70 0z"/>' +
      '<path class="star-jar__string" d="M84 47c17 1 34 8 47 22"/>' +
      '<use href="#i-bow" x="62.5" y="32" width="35" height="22.5"/>' +
    '</svg>';
  }

  /* ---------- Đọc config ---------- */

  function isArray(v) { return Object.prototype.toString.call(v) === '[object Array]'; }

  /* Thiếu hoặc sai kiểu thì dùng chữ mặc định; để trống '' là người gửi cố ý bỏ dòng đó */
  function textOf(value, fallback) {
    if (typeof value === 'number') value = String(value);
    if (typeof value !== 'string') return fallback;
    return value.trim();
  }

  /* Tối đa 8 lý do (lọ chỉ vừa chừng đó sao), dòng trống thì bỏ qua */
  function readReasons(value) {
    if (typeof value === 'string' || typeof value === 'number') value = [value];
    if (!isArray(value)) return DEFAULTS.reasons.slice();
    var out = [];
    for (var i = 0; i < value.length && out.length < MAX_STARS; i++) {
      var t = textOf(value[i], '');
      if (t) out.push(t);
    }
    return out;
  }

  function countChars(s) {
    return (Array.from ? Array.from(s) : s.split('')).length;
  }

  function setClass(el, name, on) {
    if (on) el.classList.add(name); else el.classList.remove(name);
  }

  /* ---------- Dựng trang ---------- */

  var S = null;   /* mọi thứ của trang lọ sao: phần tử, chữ, số sao đã lấy */

  function buildHtml(total) {
    return '' +
      '<h2 class="title title--center star-jar__title" data-reveal style="--i:0"><span class="hl star-jar__title-text"></span></h2>' +
      '<div class="star-jar">' +
        '<div class="star-jar__stage" data-reveal style="--i:1">' +
          '<svg class="star-jar__moon" aria-hidden="true" focusable="false"><use href="#i-star-jar-moon"/></svg>' +
          '<svg class="spark star-jar__spark star-jar__spark--a" aria-hidden="true" focusable="false"><use href="#i-sparkle"/></svg>' +
          '<svg class="spark star-jar__spark star-jar__spark--b" aria-hidden="true" focusable="false"><use href="#i-star"/></svg>' +
          '<svg class="spark star-jar__spark star-jar__spark--c" aria-hidden="true" focusable="false"><use href="#i-sparkle"/></svg>' +
          '<div class="star-jar__fit">' +
            '<button type="button" class="star-jar__jar" data-left="' + total + '" data-total="' + total + '">' +
              '<span class="star-jar__ground"></span>' +
              '<span class="star-jar__art">' +
                jarSvg(total) +
                '<span class="star-jar__tag"><span class="star-jar__count"></span></span>' +
              '</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="star-jar__hint" data-reveal style="--i:2">' +
          '<p class="star-jar__say star-jar__say--tap">' +
            '<svg class="star-jar__hand" aria-hidden="true" focusable="false"><use href="#i-hand"/></svg>' +
            '<span class="star-jar__tap-text"></span>' +
          '</p>' +
          '<p class="star-jar__say star-jar__say--done">' +
            '<span class="star-jar__done-text"></span>' +
            '<span class="star-jar__redo"><svg class="ic" aria-hidden="true" focusable="false"><use href="#i-replay"/></svg><span class="star-jar__redo-text"></span></span>' +
          '</p>' +
        '</div>' +
        '<div class="star-jar__slot" data-reveal style="--i:3">' +
          '<p class="star-jar__wait"></p>' +
          '<div class="star-jar__paper" data-tone="pink">' +
            '<span class="star-jar__sheet"></span>' +
            '<span class="star-jar__track"><span class="star-jar__roll"></span></span>' +
            '<span class="star-jar__badge">' + miniStar('star-jar__mini') + '</span>' +
            '<div class="star-jar__words"><p class="star-jar__reason" aria-live="polite"></p></div>' +
            '<svg class="star-jar__twinkle star-jar__twinkle--a" aria-hidden="true" focusable="false"><use href="#i-sparkle"/></svg>' +
            '<svg class="star-jar__twinkle star-jar__twinkle--b" aria-hidden="true" focusable="false"><use href="#i-sparkle"/></svg>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function setup(ctx) {
    var conf = ctx.get('starJar');
    if (!conf || typeof conf !== 'object') conf = {};

    var texts = {
      title: ctx.fill(textOf(conf.title, DEFAULTS.title)),
      hint: ctx.fill(textOf(conf.hint, DEFAULTS.hint)),
      empty: ctx.fill(textOf(conf.empty, DEFAULTS.empty)),
      refill: ctx.fill(textOf(conf.refill, DEFAULTS.refill)),
      waiting: ctx.fill(textOf(conf.waiting, DEFAULTS.waiting))
    };
    var raw = readReasons(conf.reasons);
    var reasons = [];
    for (var i = 0; i < raw.length; i++) reasons.push(ctx.fill(raw[i]));
    var total = reasons.length;

    /* Trăng lưỡi liềm trang trí cạnh lọ (icon riêng của tính năng này) */
    ctx.symbol('i-star-jar-moon', '0 0 24 24',
      '<path fill="currentColor" d="M14.6 3.4A9 9 0 1 0 20.9 15 7.2 7.2 0 0 1 14.6 3.4z"/>');

    var page = ctx.addPage({
      className: 'page--star-jar',
      label: 'Lọ sao giấy',
      before: '.page--rsvp',
      html: buildHtml(total)
    });

    var root = ctx.qs('.star-jar', page);
    var words = ctx.qs('.star-jar__words', page);
    var reasonEl = ctx.qs('.star-jar__reason', page);

    /* Chữ của người gửi chỉ đưa vào bằng textContent, không bao giờ ghép thành HTML */
    var titleEl = ctx.qs('.star-jar__title', page);
    ctx.qs('.star-jar__title-text', page).textContent = texts.title;
    if (!texts.title) titleEl.hidden = true;

    /* Tên dài thì tiêu đề nhỏ lại để vẫn nằm gọn trong hai dòng */
    var n = countChars(texts.title);
    if (n > 50) titleEl.classList.add('star-jar__title--xs');
    else if (n > 40) titleEl.classList.add('star-jar__title--sm');
    else if (n > 30) titleEl.classList.add('star-jar__title--md');

    ctx.qs('.star-jar__tap-text', page).textContent = texts.hint;
    if (!texts.hint) ctx.qs('.star-jar__say--tap', page).hidden = true;
    ctx.qs('.star-jar__done-text', page).textContent = texts.empty;
    ctx.qs('.star-jar__redo-text', page).textContent = texts.refill;
    if (!texts.refill) ctx.qs('.star-jar__redo', page).hidden = true;
    ctx.qs('.star-jar__wait', page).textContent = total ? texts.waiting : NONE_TEXT;

    /* "Bóng" vô hình của mọi lý do nằm chồng cùng một ô với lý do đang hiện:
       dải giấy luôn cao bằng lý do dài nhất nên bố cục trang không bao giờ nhảy,
       và lời dài được trang tự thu nhỏ chữ một lần ngay từ lúc tải. */
    var longest = 0;
    for (var k = 0; k < total; k++) {
      longest = Math.max(longest, countChars(reasons[k]));
      var ghost = document.createElement('p');
      ghost.className = 'star-jar__ghost';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.textContent = reasons[k];
      words.insertBefore(ghost, reasonEl);
    }

    if (!total) root.classList.add('is-none');
    if (longest > LONG_CHARS) root.classList.add('star-jar--long');

    S = {
      ctx: ctx,
      page: page,
      root: root,
      jar: ctx.qs('.star-jar__jar', page),
      art: ctx.qs('.star-jar__art', page),
      tag: ctx.qs('.star-jar__tag', page),
      count: ctx.qs('.star-jar__count', page),
      stars: ctx.qsa('.star-jar__star', page),
      paper: ctx.qs('.star-jar__paper', page),
      badge: ctx.qs('.star-jar__badge', page),
      reason: reasonEl,
      texts: texts,
      reasons: reasons,
      total: total,
      taken: 0,          /* số sao đã lấy ra, chỉ nhớ trong lượt xem này */
      lockUntil: 0,
      timers: {},
      flies: []
    };

    paint();
  }

  /* Vẽ lại mọi thứ theo số sao đã lấy. Chỉ đổi class, thuộc tính và chữ. */
  function paint() {
    var total = S.total;
    var taken = S.taken;
    var left = total - taken;
    var empty = total > 0 && left === 0;

    S.jar.setAttribute('data-left', String(left));
    setClass(S.root, 'is-empty', empty);
    setClass(S.root, 'has-reason', taken > 0);

    for (var i = 0; i < S.stars.length; i++) {
      var order = parseInt(S.stars[i].getAttribute('data-order'), 10);
      setClass(S.stars[i], 'is-out', order <= taken);
    }

    S.count.textContent = taken + ' / ' + total;

    if (taken > 0) {
      S.paper.setAttribute('data-tone', toneOf(taken, total));
      S.reason.textContent = S.reasons[taken - 1];
    } else {
      S.reason.textContent = '';
    }

    var label = 'Lọ sao giấy';
    if (total) {
      label += ', đã lấy ' + taken + ' trên ' + total + ' ngôi sao. ' + (empty ? S.texts.refill : S.texts.hint);
    }
    S.jar.setAttribute('aria-label', label);
  }

  /* ---------- Chuyển động ---------- */

  /* Gắn một class chạy animation rồi tự gỡ. Chạm dồn dập thì hẹn giờ cũ bị hủy
     để class không bị gỡ nhầm giữa chừng. */
  function pulse(name, el, cls, ms) {
    if (S.timers[name]) clearTimeout(S.timers[name]);
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    S.timers[name] = setTimeout(function () {
      S.timers[name] = 0;
      el.classList.remove(cls);
    }, ms);
  }

  function dropFly(el) {
    var at = S.flies.indexOf(el);
    if (at >= 0) S.flies.splice(at, 1);
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  /* Ngôi sao nhảy khỏi miệng lọ theo một vòng cung rồi đáp xuống đầu dải giấy.
     Là một phần tử tạm nằm trong vùng .star-jar, bay xong thì tự dọn. */
  function hop(tone) {
    var probe = S.root;
    if (!probe.animate) return;

    var box = S.root.getBoundingClientRect();
    var jar = S.art.getBoundingClientRect();
    var paper = S.paper.getBoundingClientRect();
    if (!box.width || !jar.width || !paper.width) return;   /* trang đang ẩn thì thôi */

    /* Chạm dồn dập: không để quá ba ngôi sao bay cùng lúc */
    while (S.flies.length >= 3) dropFly(S.flies[0]);

    var sx = jar.left + jar.width / 2 - box.left;
    var sy = jar.top + jar.height * 0.08 - box.top;
    /* Dùng vị trí bố cục của huy hiệu (không bị ảnh hưởng bởi animation đang thu nhỏ nó) */
    var ex = paper.left + S.badge.offsetLeft + S.badge.offsetWidth / 2 - box.left;
    var ey = paper.top + S.badge.offsetTop + S.badge.offsetHeight / 2 - box.top;
    var cx = sx - jar.width * 0.8;
    var cy = sy - jar.height * 0.85;

    /* Sao bay to bằng sao trong lọ, lúc đáp thì nhỏ dần cho vừa huy hiệu trên dải giấy */
    var size = Math.max(20, jar.height / 188 * STAR_SIZE);
    var endScale = Math.min(1, S.badge.offsetWidth * 0.86 / size);

    var el = document.createElement('span');
    el.className = 'star-jar__fly';
    el.setAttribute('data-tone', tone);
    el.setAttribute('aria-hidden', 'true');
    el.style.width = size.toFixed(1) + 'px';
    el.style.height = size.toFixed(1) + 'px';
    el.style.margin = (-size / 2).toFixed(1) + 'px 0 0 ' + (-size / 2).toFixed(1) + 'px';
    el.innerHTML = miniStar('star-jar__mini');

    var frames = [];
    var steps = 8;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var u = 1 - t;
      var x = u * u * sx + 2 * u * t * cx + t * t * ex;
      var y = u * u * sy + 2 * u * t * cy + t * t * ey;
      var scale = i === 0 ? 0.45 : (t < 0.5 ? 1.08 : 1.08 - (t - 0.5) * 2 * (1.08 - endScale));
      frames.push({
        offset: t,
        opacity: i === 0 ? 0 : 1,
        transform: 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + Math.round(-320 * t) + 'deg) scale(' + scale.toFixed(2) + ')'
      });
    }

    S.root.appendChild(el);
    S.flies.push(el);

    var done = function () { dropFly(el); };
    try {
      var anim = el.animate(frames, { duration: HOP_MS, easing: 'linear', fill: 'both' });
      anim.onfinish = done;
      anim.oncancel = done;
    } catch (e) {
      done();
      return;
    }
    /* Phòng khi trình duyệt không báo kết thúc (trang bị ẩn giữa chừng) */
    setTimeout(done, HOP_MS + 300);
  }

  /* Lấy một ngôi sao ra */
  function takeStar() {
    var ctx = S.ctx;
    S.taken++;
    var gold = S.taken === S.total;
    var tone = toneOf(S.taken, S.total);
    paint();

    ctx.audio.pop();
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }

    if (!ctx.reduce) {
      pulse('shake', S.art, 'is-shake', 520);
      pulse('tag', S.tag, 'is-pop', 400);
      pulse('unroll', S.paper, 'is-unroll', 1100);
      hop(tone);
    }

    if (gold) {
      S.lockUntil = Date.now() + GOLD_LOCK_MS;
      /* Ăn mừng đúng lúc dải giấy vàng mở ra. Nếu trong lúc chờ lọ đã được gấp lại thì bỏ qua. */
      var turn = S.taken;
      var party = function () {
        if (S.taken !== turn) return;
        try {
          ctx.audio.chime();
          ctx.fx.hearts(S.jar, { count: 8, near: 50, far: 110, at: 0.45 });
        } catch (e) {}
      };
      if (ctx.reduce) party(); else setTimeout(party, HOP_MS - 80);
    }

    ctx.emit('star-jar:star', { index: S.taken - 1, total: S.total, gold: gold });
  }

  /* Gấp sao lại vào lọ và bắt đầu lại từ lý do đầu tiên */
  function refill() {
    var ctx = S.ctx;
    S.taken = 0;
    paint();

    ctx.audio.pop();
    /* Tiếng leng keng nho nhỏ khi sao rơi vào lọ */
    for (var i = 0; i < Math.min(S.total, 4); i++) {
      ctx.audio.tone(700 + i * 110, 0.06 + i * 0.07, 0.16, 'sine', 0.045);
    }

    if (!ctx.reduce) {
      pulse('refill', S.art, 'is-refill', 500 + S.total * 70 + 200);
      pulse('tag', S.tag, 'is-pop', 400);
    }
    ctx.emit('star-jar:refill', { total: S.total });
  }

  function onTap() {
    if (!S) return;
    try {
      if (!S.total) {
        /* Chưa có lý do nào: lọ chỉ lắc nhẹ cho vui, không có gì để lấy */
        S.ctx.audio.pop();
        if (!S.ctx.reduce) pulse('shake', S.art, 'is-shake', 520);
        return;
      }
      if (S.taken >= S.total) {
        if (Date.now() < S.lockUntil) return;
        refill();
      } else {
        takeStar();
      }
    } catch (e) {
      if (window.console && console.error) console.error('[thu-moi] star-jar:', e);
    }
  }

  function ready() {
    if (!S) return;
    /* Nghe trên nút thật của trang. Không gắn data-no-swipe: vuốt ngang bắt đầu
       từ chiếc lọ vẫn lật trang như mọi chỗ khác. */
    S.jar.addEventListener('click', onTap);
  }

  (Invite.features = Invite.features || []).push({
    name: 'star-jar',
    /* Trang này mặc định tắt: chỉ hiện khi config.js ghi rõ features['star-jar'] = true.
       Lỡ xóa mất dòng đó trong config thì trang cũng không tự hiện ra. */
    defaultOn: false,
    setup: setup,
    ready: ready
  });
})();
