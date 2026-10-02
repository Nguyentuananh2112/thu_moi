/* =====================================================================
   photo-stack.js - chồng ảnh kỷ niệm có mặt sau

   Tấm polaroid ở trang ảnh trở thành một chồng ảnh nhỏ:
   - Lần xem đầu, tấm đầu tiên còn "mờ sữa": chạm 3 lần (lắc) cho hiện hình,
     hoặc cứ chờ 4 giây ở trang này là ảnh tự hiện.
   - Chạm ảnh đã rõ: ảnh lật ra mặt sau, có lời nhắn viết tay, chữ ký và ngày tháng.
     Lần đầu có nhãn nhỏ "Chạm để lật ảnh" dưới ô đếm, lật một lần là nhãn biến mất.
   - Chạm mặt sau: tấm đó bị gạt sang bên rồi chui xuống đáy chồng, tấm kế trồi lên.
   - Tấm cuối là khung trống "để dành cho hôm đó".

   Vì sao viết thế này:
   - Trang sách bị thư viện lật trang nhân bản (cloneNode) khi lật, nên mọi
     trạng thái nằm ở class / thuộc tính / chữ (data-index, data-fog, is-back),
     bản sao không cần JS vẫn trông đúng.
   - Chỉ có MỘT nút bấm thật (tấm trên cùng); các mép ảnh phía dưới và hai
     "bóng ma" lúc gạt ảnh chỉ là hình trang trí.
   - Chữ của người gửi luôn đi qua ctx.fill() rồi gán bằng textContent.
   - Chỉ có một thẻ <img> (tấm trên cùng) và tải trước đúng một tấm kế tiếp,
     để ảnh điện thoại nặng không làm sập trình duyệt trong Zalo / Messenger.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;

  /* Ảnh chụp bằng điện thoại rất nặng (12 megapixel trở lên). Trình duyệt bên trong
     Zalo / Messenger có thể bị sập nếu phải giải mã nhiều tấm cùng lúc, nên chỉ nhận
     tối đa 5 tấm, và chỉ gắn src cho tấm đang ở trên cùng (tải trước đúng một tấm kế). */
  var MAX_PHOTOS = 5;
  var TAPS = 3;                    /* số lần lắc để ảnh hiện rõ */
  var AUTO_MS = 4000;              /* đứng yên ở trang ảnh chừng này thì ảnh tự hiện */
  var FALLBACK_SRC = 'assets/photo.svg';
  var KEY_DEVELOPED = 'photo-stack:developed';
  var KEY_TURNED = 'photo-stack:turned';

  var DEFAULTS = {
    /* Câu đầu mời CHẠM chứ không mời lắc điện thoại (không thì người xem lắc máy mãi chẳng thấy gì) */
    shake: ['Chạm để lắc ảnh nè!', 'Lắc nữa đi…', 'Sắp rõ rồi!'],
    flipHint: 'Chạm để lật ảnh',
    /* Người xem chạm "Chạm để lật ảnh" là thấy câu này, nên phải là lời thật chứ không phải chữ mẫu */
    defaultBack: 'Nhìn lại tấm này là thấy thương ghê',
    reserved: 'Để dành cho hôm đó',
    reservedBack: 'Chỗ này chờ tấm hình chụp chung hôm lễ',
    /* Chữ ký cuối lời nhắn mặt sau, như ký sau lưng tấm ảnh thật */
    sign: 'Thương, {from}',
    caption: 'Lorem ipsum dolor sit amet',
    alt: 'Ảnh kỷ niệm'
  };

  /* Nhãn đọc cho trình đọc màn hình: luôn mô tả việc sẽ xảy ra khi bấm */
  var LABEL = {
    shake: 'Lắc ảnh',
    back: 'Xem mặt sau tấm ảnh',
    next: 'Xem ảnh kế tiếp',
    front: 'Xem lại mặt trước tấm ảnh'
  };

  /* Giấy mặt sau: dòng kẻ + lời nhắn + chữ ký, góc dưới có trái tim nhỏ và ngày tháng.
     Lời nhắn ngắn thì giấy còn trống nhiều dòng: đóng thêm một con dấu tim nho nhỏ
     ở góc cho đỡ trống (chỉ hiện khi còn đủ chỗ, xem fitNote). */
  var PAPER =
    '<span class="photo-stack__lines"><span class="photo-stack__note"></span><span class="photo-stack__sign"></span></span>' +
    '<svg class="photo-stack__stamp" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3.2 2.6"/>' +
      '<circle cx="20" cy="20" r="12.6" fill="none" stroke="currentColor" stroke-width=".9"/>' +
      '<use class="photo-stack__stamp-heart" href="#i-heart" x="13" y="13.4" width="14" height="14"/>' +
    '</svg>' +
    '<span class="photo-stack__foot">' +
      '<svg class="photo-stack__mark" aria-hidden="true"><use href="#i-heart"/></svg>' +
      '<span class="photo-stack__date"></span>' +
    '</span>';

  var S = null;   /* trạng thái dùng chung giữa setup() và ready() */

  function text(v, fallback) {
    return (typeof v === 'string' || typeof v === 'number') ? String(v) : fallback;
  }

  function trim(s) { return String(s).replace(/^\s+|\s+$/g, ''); }

  /* Ngày diễn ra buổi lễ, viết gọn kiểu 15.11.2026, để ghi ở góc tấm "để dành" */
  function eventDay(ctx) {
    var start = new Date(ctx.get('event.start'));
    if (isNaN(start.getTime())) return '';
    try {
      var s = new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: ctx.get('event.timeZone') || 'Asia/Ho_Chi_Minh'
      }).format(start);
      return s.replace(/\//g, '.');
    } catch (e) {
      return '';
    }
  }

  /* Gom danh sách tấm ảnh từ config. Thiếu gì thì có mặc định cho cái đó. */
  function readCards(ctx, conf) {
    var list = Array.isArray(conf.photos) ? conf.photos : [];
    var defBack = text(conf.defaultBack, DEFAULTS.defaultBack);
    /* config.js còn để chữ mẫu Lorem: người xem lật ảnh sẽ thấy chữ mẫu ký tên người gửi,
       nên dùng câu mặc định thật thay vào (giống cách thư niêm phong làm) */
    if (/lorem ipsum/i.test(defBack)) defBack = DEFAULTS.defaultBack;
    var cards = [];
    var dropped = 0;
    var i, p, caption;

    for (i = 0; i < list.length; i++) {
      p = list[i];
      if (typeof p === 'string') p = { src: p };
      /* Mục rác (null, số, mảng lồng nhau...) thì bỏ qua, không tính là một tấm */
      if (!p || typeof p !== 'object' || Array.isArray(p)) continue;
      if (cards.length >= MAX_PHOTOS) { dropped++; continue; }
      caption = ctx.fill(text(p.caption, ''));
      cards.push({
        reserved: false,
        src: trim(text(p.src, '')) || FALLBACK_SRC,
        alt: ctx.fill(text(p.alt, '')) || caption || DEFAULTS.alt,
        caption: caption,
        back: ctx.fill(text(p.back, '') || defBack),
        date: ctx.fill(text(p.date, ''))
      });
    }
    /* Nhắc người gửi (một lần) là ảnh thừa đã bị bỏ qua */
    if (dropped && window.console && console.warn) {
      console.warn('[thu-moi] photo-stack: chỉ dùng ' + MAX_PHOTOS + ' ảnh đầu trong photoStack.photos, bỏ qua ' + dropped + ' ảnh còn lại.');
    }

    /* Không khai ảnh nào: dùng đúng tấm ảnh sẵn có của trang (pages.photo) */
    if (!cards.length) {
      caption = ctx.fill(text(ctx.get('pages.photo.caption'), DEFAULTS.caption));
      cards.push({
        reserved: false,
        src: trim(text(ctx.get('pages.photo.src'), '')) || FALLBACK_SRC,
        alt: ctx.fill(text(ctx.get('pages.photo.alt'), DEFAULTS.alt)),
        caption: caption,
        back: ctx.fill(defBack),
        date: ''
      });
    }

    /* Tấm để dành: khung trống chờ ảnh chụp hôm lễ. reserved: '' là bỏ. */
    var reserved = conf.reserved === undefined ? DEFAULTS.reserved : text(conf.reserved, '');
    if (trim(reserved)) {
      cards.push({
        reserved: true,
        src: '',
        alt: '',
        caption: ctx.fill(reserved),
        back: ctx.fill(text(conf.reservedBack, DEFAULTS.reservedBack)),
        date: eventDay(ctx)
      });
    }
    return cards;
  }

  function readShake(conf) {
    var out = [];
    var list = Array.isArray(conf.shake) ? conf.shake : [];
    for (var i = 0; i < TAPS; i++) {
      var v = text(list[i], '');
      out.push(trim(v) ? v : DEFAULTS.shake[i]);
    }
    return out;
  }

  /* ---------- Dựng chồng ảnh (trước khi sách được dựng) ---------- */

  function setup(ctx) {
    var wrap = ctx.qs('.page--photo .polaroid-wrap');
    if (!wrap) return;

    var conf = ctx.get('photoStack');
    if (!conf || typeof conf !== 'object') conf = {};

    var cards = readCards(ctx, conf);
    var shake = readShake(conf).map(function (s) { return ctx.fill(s); });

    /* Lớp phim mờ chỉ có ở lần xem đầu, và không có khi giảm chuyển động */
    var fogOn = conf.develop !== false && !ctx.reduce && ctx.store.get(KEY_DEVELOPED) !== '1';

    /* Lời nhắc "chạm để lật": chỉ cho lần đầu, ai đã lật một lần rồi thì thôi. '' là tắt hẳn. */
    var flipHint = conf.flipHint === undefined || conf.flipHint === null ? DEFAULTS.flipHint : text(conf.flipHint, DEFAULTS.flipHint);
    flipHint = trim(flipHint) ? ctx.fill(flipHint) : '';
    var turned = ctx.store.get(KEY_TURNED) === '1';
    var hasTip = !!flipHint && !turned;

    /* Chữ ký sau lưng ảnh. '' là bỏ. */
    var sign = conf.sign === undefined || conf.sign === null ? DEFAULTS.sign : text(conf.sign, DEFAULTS.sign);
    /* Chữ ký nhắc tới {from} mà chưa điền tên người gửi thì bỏ hẳn, khỏi còn trơ "Thương," */
    var fromName = trim(text(ctx.names && ctx.names.from, ''));
    if (sign.indexOf('{from}') !== -1 && !fromName) sign = '';
    sign = trim(sign) ? ctx.fill(sign) : '';

    var root = doc.createElement('div');
    /* photo-stack--tip giữ nguyên suốt lần xem này (kể cả khi nhãn đã rơi đi), để ô đếm
       và vùng chạm không nhảy chỗ ngay lúc lật ảnh lần đầu */
    root.className = 'photo-stack' + (hasTip ? ' photo-stack--tip' : '');
    root.setAttribute('data-count', String(cards.length));
    root.innerHTML =
      '<span class="photo-stack__under photo-stack__under--b" aria-hidden="true"></span>' +
      '<span class="photo-stack__under photo-stack__under--a" aria-hidden="true"></span>' +
      '<span class="photo-stack__ghost photo-stack__ghost--in" aria-hidden="true"></span>' +
      '<button type="button" class="photo-stack__card">' +
        '<span class="photo-stack__flip">' +
          '<span class="photo-stack__face photo-stack__face--front">' +
            '<span class="photo-stack__pic">' +
              '<img class="photo-stack__img" alt="" draggable="false" decoding="async">' +
              '<span class="photo-stack__empty"><svg aria-hidden="true"><use href="#i-heart"/></svg></span>' +
              (fogOn ? '<span class="photo-stack__film"><svg aria-hidden="true"><use href="#i-heart"/></svg></span>' : '') +
            '</span>' +
            '<span class="photo-stack__label">' +
              '<span class="photo-stack__cap"></span>' +
              (fogOn ? '<span class="photo-stack__hint"></span>' : '') +
            '</span>' +
            '<svg class="photo-stack__sticker photo-stack__sticker--heart" aria-hidden="true"><use href="#i-heart"/></svg>' +
            '<svg class="photo-stack__sticker photo-stack__sticker--cap" aria-hidden="true"><use href="#i-cap"/></svg>' +
          '</span>' +
          '<span class="photo-stack__face photo-stack__face--back photo-stack__paper">' + PAPER + '</span>' +
        '</span>' +
      '</button>' +
      '<span class="photo-stack__ghost photo-stack__ghost--out photo-stack__paper" aria-hidden="true">' + PAPER + '</span>' +
      '<span class="photo-stack__top" aria-hidden="true">' +
        '<span class="photo-stack__tape"></span>' +
        '<span class="photo-stack__row">' +
          '<span class="photo-stack__count">' +
            '<svg class="photo-stack__count-ic" aria-hidden="true"><use href="#i-replay"/></svg>' +
            '<span class="photo-stack__count-text"></span>' +
          '</span>' +
          (hasTip ?
            '<span class="photo-stack__tip">' +
              '<svg class="photo-stack__tip-ic" aria-hidden="true"><use href="#i-hand"/></svg>' +
              '<span class="photo-stack__tip-text"></span>' +
            '</span>' : '') +
        '</span>' +
      '</span>' +
      '<span class="photo-stack__sr sr-only" aria-live="polite"></span>';

    var card = ctx.qs('.photo-stack__card', root);
    var ghostOut = ctx.qs('.photo-stack__ghost--out', root);

    S = {
      ctx: ctx,
      cards: cards,
      shake: shake,
      root: root,
      card: card,
      top: ctx.qs('.photo-stack__top', root),
      img: ctx.qs('.photo-stack__img', root),
      cap: ctx.qs('.photo-stack__cap', root),
      hint: ctx.qs('.photo-stack__hint', root),
      note: ctx.qs('.photo-stack__note', card),
      date: ctx.qs('.photo-stack__date', card),
      paper: ctx.qs('.photo-stack__face--back', card),
      sign: sign,
      signEl: ctx.qs('.photo-stack__sign', card),
      ghostOut: ghostOut,
      ghostNote: ctx.qs('.photo-stack__note', ghostOut),
      ghostSign: ctx.qs('.photo-stack__sign', ghostOut),
      ghostDate: ctx.qs('.photo-stack__date', ghostOut),
      countText: ctx.qs('.photo-stack__count-text', root),
      sr: ctx.qs('.photo-stack__sr', root),
      index: 0,
      back: false,
      fog: fogOn ? 0 : -1,          /* -1: không có phim mờ; 0..2: số lần đã lắc */
      lockUntil: 0,
      broken: {},                   /* những ảnh đã biết là không tải được */
      clockOn: false,
      elapsed: 0,
      since: 0,
      autoTimer: null,
      wobbleTimer: null,
      tossTimer: null,
      pre: null,                    /* ảnh tải trước (chỉ một tấm kế tiếp) */
      photoIndex: -1
    };

    /* Ảnh hỏng (sai tên file...) thì dùng ảnh giữ chỗ, mọi thứ khác vẫn chạy */
    S.img.addEventListener('error', function () {
      var cur = S.img.getAttribute('src');
      if (!cur || cur === FALLBACK_SRC) return;
      S.broken[cur] = true;
      S.img.setAttribute('src', FALLBACK_SRC);
    });

    if (fogOn) {
      card.setAttribute('data-fog', '0');
      root.classList.add('is-foggy');
      S.hint.textContent = shake[0];
    }
    if (!turned) root.classList.add('is-fresh');
    var tipText = ctx.qs('.photo-stack__tip-text', root);
    if (tipText) tipText.textContent = flipHint;
    /* Chữ ký giống nhau cho mọi tấm (cả "bóng ma" lúc gạt ảnh) */
    ctx.qsa('.photo-stack__sign', root).forEach(function (el) { el.textContent = sign; });

    render();

    card.addEventListener('click', function () {
      try { onTap(); } catch (e) { complain(e); }
    });

    /* Đặt đúng chỗ tấm polaroid gốc rồi gỡ tấm gốc đi (hai ngôi sao trang trí giữ nguyên) */
    var old = ctx.qs('button.polaroid', wrap) || ctx.qs('.polaroid', wrap);
    if (old && old.parentNode === wrap) {
      wrap.insertBefore(root, old);
      wrap.removeChild(old);
    } else {
      wrap.insertBefore(root, wrap.firstChild);
    }
    /* Đánh dấu ô chứa để CSS cho chồng ảnh tự co theo chiều cao còn trống */
    wrap.classList.add('photo-stack-wrap');
  }

  function complain(e) {
    if (window.console && console.error) console.error('[thu-moi] photo-stack:', e);
  }

  /* ---------- Vẽ tấm ảnh đang ở trên cùng ---------- */

  function render() {
    var c = S.cards[S.index];
    var idx = String(S.index);

    S.card.setAttribute('data-index', idx);
    S.top.setAttribute('data-index', idx);
    S.card.classList.toggle('is-reserved', !!c.reserved);

    if (!c.reserved) {
      var src = S.broken[c.src] ? FALLBACK_SRC : c.src;
      if (S.img.getAttribute('src') !== src) S.img.setAttribute('src', src);
    }
    S.img.setAttribute('alt', c.alt);

    S.cap.textContent = c.caption;
    S.note.textContent = c.back;
    S.date.textContent = c.date;
    S.countText.textContent = (S.index + 1) + '/' + S.cards.length;
    paintLabel();
    fitNote();
  }

  var SIGN_MAX = 3;   /* chữ ký (họ tên đầy đủ) xuống dòng được tối đa chừng này dòng */

  function lineHeight() {
    return parseFloat(getComputedStyle(S.note).lineHeight);
  }

  /* Số dòng một thẻ đang chiếm (ít nhất 1, như cách tính cũ) */
  function rows(el, lh) {
    return Math.max(1, Math.round(el.offsetHeight / lh));
  }

  /* Số dòng lời nhắn + chữ ký cần nếu không bị cắt (đo bằng một số dòng rất lớn:
     Safari nào cũng hiểu, khác với 'none') */
  function needRows(lh) {
    S.note.style.setProperty('-webkit-line-clamp', '99');
    if (!S.sign) return rows(S.note, lh);
    S.signEl.style.setProperty('-webkit-line-clamp', '99');
    S.paper.classList.add('is-signed');
    return rows(S.note, lh) + rows(S.signEl, lh);
  }

  /* Lời nhắn mặt sau chỉ hiện số dòng vừa khít khoảng giấy còn trống, để dòng cuối
     không bị cắt ngang nửa chữ (máy nhỏ thì tấm ảnh nhỏ, ít dòng hơn).
     - Lời nhắn + chữ ký dài hơn số dòng giấy có: viết chữ nhỏ lại, dòng sát hơn
       (is-tight, chữ không dưới 13px) để đọc được trọn câu và thấy tên người gửi.
     - Còn đủ dòng trống thì ký tên ở dòng kế (is-signed). Họ tên dài thì xuống dòng,
       tối đa SIGN_MAX dòng; không đủ chỗ ký trọn thì chữ ký nhường chỗ cho lời nhắn.
     - Còn trống từ 3 dòng trở lên thì đóng con dấu tim ở góc (is-roomy), để lời nhắn
       ngắn không bỏ lại cả tờ giấy trơn.
     Kết quả nằm ở class và style của các thẻ, nên bản sao lúc lật trang vẫn y hệt.
     Chỉ đo được khi trang ảnh đang hiện; trang ẩn thì để nguyên lần đo trước. */
  function fitNote() {
    var avail = S.note.parentNode.clientHeight;
    if (!avail) return;
    S.paper.classList.remove('is-tight');
    var lh = lineHeight();
    if (!lh) return;

    /* Khung giấy không đổi cao theo cỡ chữ, nên chỉ cần đo lại số dòng */
    if (needRows(lh) > Math.floor((avail + 1) / lh)) {
      S.paper.classList.add('is-tight');
      lh = lineHeight() || lh;
    }
    var n = Math.max(1, Math.floor((avail + 1) / lh));
    S.note.style.setProperty('-webkit-line-clamp', String(n));

    var used = rows(S.note, lh);
    var room = n - used;

    /* Chữ ký cần mấy dòng ở cỡ chữ đang dùng; không đủ chỗ ký trọn thì nhường chỗ,
       chứ không cắt "…" ngang tên người gửi */
    var signRows = 0;
    if (S.sign) {
      S.signEl.style.setProperty('-webkit-line-clamp', '99');
      S.paper.classList.add('is-signed');
      signRows = Math.min(SIGN_MAX, rows(S.signEl, lh));
      if (signRows > room) signRows = 0;
      S.signEl.style.setProperty('-webkit-line-clamp', String(signRows || SIGN_MAX));
    }
    S.paper.classList.toggle('is-signed', signRows > 0);
    S.paper.classList.toggle('is-roomy', n - used - signRows >= 3);
  }

  /* "Bóng ma" bay đi mang đúng dáng mặt sau của tấm vừa rời khỏi chồng
     (cả cỡ chữ và số dòng đã đo, vì mỗi tấm một độ dài lời nhắn) */
  function copyPaper(to) {
    ['is-signed', 'is-roomy', 'is-tight'].forEach(function (k) {
      to.classList.toggle(k, S.paper.classList.contains(k));
    });
    S.ghostNote.style.setProperty('-webkit-line-clamp', S.note.style.getPropertyValue('-webkit-line-clamp') || '6');
    S.ghostSign.style.setProperty('-webkit-line-clamp', S.signEl.style.getPropertyValue('-webkit-line-clamp') || String(SIGN_MAX));
  }

  function paintLabel() {
    var label;
    if (S.fog >= 0) label = LABEL.shake;
    else if (!S.back) label = LABEL.back;
    else label = S.cards.length > 1 ? LABEL.next : LABEL.front;
    S.card.setAttribute('aria-label', label);
  }

  /* Đọc cho trình đọc màn hình biết nội dung vừa hiện ra */
  function announce(msg) {
    if (S.sr) S.sr.textContent = msg;
  }

  function lock(ms) {
    S.lockUntil = S.ctx.reduce ? 0 : Date.now() + ms;
  }

  /* ---------- Chạm vào tấm ảnh ---------- */

  function onTap() {
    if (Date.now() < S.lockUntil) return;
    if (S.fog >= 0) shakeOnce();
    else if (!S.back) turnOver();
    else nextCard();
  }

  function buzz(ms) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  /* A. Lắc cho hiện hình */
  function shakeOnce() {
    var ctx = S.ctx;
    ctx.audio.pop();
    buzz(12);

    /* Tự quản lý class lắc: chạm dồn dập thì lần lắc sau không bị lần trước cắt ngang */
    clearTimeout(S.wobbleTimer);
    ctx.replay(S.root, 'is-wobble');
    S.wobbleTimer = setTimeout(function () { S.root.classList.remove('is-wobble'); }, 720);
    ctx.fx.hearts(S.card, { count: 5, near: 60, far: 110, at: 0.4 });

    S.fog++;
    if (S.fog >= TAPS) {
      develop(true);
      return;
    }
    S.card.setAttribute('data-fog', String(S.fog));
    S.hint.textContent = S.shake[S.fog];
    ctx.replay(S.hint, 'is-pop', 400);

    /* Người xem đang tự lắc: lùi giờ tự hiện lại (còn ít nhất 2,5 giây) để ảnh không
       tự hiện ngay trước cú chạm cuối, cướp mất niềm vui tự tay làm ảnh rõ */
    if (S.clockOn) {
      stopClock();
      S.elapsed = Math.min(S.elapsed, AUTO_MS - 2500);
      startClock();
    } else {
      S.elapsed = Math.min(S.elapsed, AUTO_MS - 2500);
    }
  }

  function develop(byTap) {
    var ctx = S.ctx;
    if (S.fog < 0) return;
    S.fog = -1;
    stopClock();
    clearTimeout(S.autoTimer);

    S.card.removeAttribute('data-fog');
    S.root.classList.remove('is-foggy');
    S.root.classList.add('is-developed');
    ctx.store.set(KEY_DEVELOPED, '1');
    paintLabel();
    announce(S.cards[S.index].caption);

    /* Vừa lắc xong mà lỡ chạm thêm một cái thì đừng lật ngay: cho ngắm ảnh đã */
    lock(550);

    if (byTap) {
      ctx.audio.tone(1318.5, 0.05, 0.35, 'triangle', 0.07);
      ctx.audio.tone(1760, 0.16, 0.5, 'triangle', 0.06);
      ctx.fx.hearts(S.card, { count: 10, near: 60, far: 125, at: 0.4 });
    }
    ctx.emit('photo-stack:developed', { byTap: !!byTap });
  }

  /* B. Lật ra mặt sau */
  function turnOver() {
    var ctx = S.ctx;
    var c = S.cards[S.index];
    fitNote();
    S.back = true;
    S.card.classList.add('is-back');

    /* Đã biết lật rồi thì thôi nhắc (icon xoay ở ô đếm ngừng lúc lắc) */
    S.root.classList.remove('is-fresh');
    ctx.store.set(KEY_TURNED, '1');

    ctx.audio.flip();
    buzz(8);
    lock(380);
    paintLabel();
    /* Lời nhắn đã có dấu câu ở cuối thì không thêm ". " nữa (khỏi đọc "elit.." hay "!.") */
    var said = trim(c.back);
    if (S.sign) said += (!said ? '' : /[.!?…]$/.test(said) ? ' ' : '. ') + S.sign;
    announce('Mặt sau: ' + said + (c.date ? ' (' + c.date + ')' : ''));
    ctx.emit('photo-stack:flip', { index: S.index, back: true });
  }

  /* C. Sang tấm kế */
  function nextCard() {
    var ctx = S.ctx;
    var total = S.cards.length;
    var from = S.index;

    /* Chỉ có một tấm: lật lại mặt trước, không có gì để gạt đi */
    if (total < 2) {
      S.back = false;
      S.card.classList.remove('is-back');
      ctx.audio.flip();
      lock(380);
      paintLabel();
      announce(S.cards[from].caption);
      ctx.emit('photo-stack:flip', { index: from, back: false });
      return;
    }

    /* "Bóng ma" mang hình mặt sau của tấm cũ: nó bay sang bên rồi chui xuống đáy,
       còn nút thật thì đổi ngay sang tấm mới, mặt trước ngửa lên. */
    if (!ctx.reduce) {
      S.ghostNote.textContent = S.cards[from].back;
      S.ghostDate.textContent = S.cards[from].date;
      S.ghostOut.setAttribute('data-index', String(from));
      copyPaper(S.ghostOut);
    }

    S.index = (from + 1) % total;
    S.back = false;

    /* Tắt transition trong một nhịp để tấm mới không "lật ngược" từ mặt sau về */
    S.card.classList.add('is-snap');
    S.card.classList.remove('is-back');
    render();
    void S.card.offsetWidth;
    S.card.classList.remove('is-snap');

    if (!ctx.reduce) {
      clearTimeout(S.tossTimer);
      ctx.replay(S.root, 'is-toss');
      S.tossTimer = setTimeout(settleToss, 720);
    }

    ctx.audio.pop();
    buzz(8);
    lock(420);
    preloadNext();

    var c = S.cards[S.index];
    announce('Ảnh ' + (S.index + 1) + '/' + total + ': ' + c.caption);

    /* Tấm để dành trồi lên: thưởng một chùm tim nho nhỏ */
    if (c.reserved) {
      ctx.audio.tone(1046.5, 0.12, 0.3, 'triangle', 0.06);
      ctx.audio.tone(1318.5, 0.24, 0.45, 'triangle', 0.06);
      if (!ctx.reduce) {
        setTimeout(function () {
          try {
            if (S.index === total - 1) ctx.fx.hearts(S.card, { count: 8, near: 50, far: 115, at: 0.42 });
          } catch (e) { complain(e); }
        }, 260);
      }
    }
    ctx.emit('photo-stack:next', { index: S.index, from: from, reserved: !!c.reserved });
  }

  /* Dọn hiệu ứng gạt ảnh (cũng gọi khi trang bắt đầu lật, để bản sao của trang không diễn lại) */
  function settleToss() {
    clearTimeout(S.tossTimer);
    S.root.classList.remove('is-toss');
  }

  /* Trang bắt đầu lật: thư viện đã nhân bản trang TRƯỚC khi báo "turn", nên bản sao mang
     theo các class hiệu ứng tạm (gạt ảnh, lắc, chữ nảy) và diễn lại từ đầu lúc trang bay đi.
     Gỡ chúng trên mọi bản của chồng ảnh trong sách, cả tấm gốc. */
  function calmCopies() {
    var ctx = S.ctx;
    settleToss();
    clearTimeout(S.wobbleTimer);
    S.root.classList.remove('is-wobble');
    var scope = ctx.bookEl || doc;
    ctx.qsa('.photo-stack', scope).forEach(function (el) {
      el.classList.remove('is-toss');
      el.classList.remove('is-wobble');
    });
    ctx.qsa('.photo-stack__hint.is-pop', scope).forEach(function (el) {
      el.classList.remove('is-pop');
    });
  }

  /* ---------- Đồng hồ tự hiện hình ----------
     Chỉ đếm khi trang ảnh đang là trang được đọc và tab đang mở. */

  function onPhotoPage() {
    return !!(S.ctx.book && S.ctx.started() && S.ctx.book.current() === S.photoIndex);
  }

  function startClock() {
    if (S.fog < 0 || S.clockOn) return;
    S.clockOn = true;
    S.since = Date.now();
    clearTimeout(S.autoTimer);
    S.autoTimer = setTimeout(function () {
      try {
        S.clockOn = false;
        S.elapsed = AUTO_MS;
        develop(false);
      } catch (e) { complain(e); }
    }, Math.max(0, AUTO_MS - S.elapsed));
  }

  function stopClock() {
    if (!S.clockOn) return;
    S.clockOn = false;
    clearTimeout(S.autoTimer);
    S.elapsed += Date.now() - S.since;
  }

  /* Tải trước ĐÚNG MỘT tấm kế tiếp để lúc đổi tấm không bị chớp trắng.
     Không tải trước cả chồng: ảnh gốc từ điện thoại rất nặng, nhiều tấm cùng lúc
     có thể làm trình duyệt trong Zalo / Messenger hết bộ nhớ. Mỗi lần chỉ giữ một
     đối tượng Image, tấm cũ được thả ra cho trình duyệt dọn. */
  function preloadNext() {
    var total = S.cards.length;
    if (total < 2) return;
    var c = S.cards[(S.index + 1) % total];
    if (!c || c.reserved || !c.src || c.src === FALLBACK_SRC || S.broken[c.src]) return;
    if (S.pre && S.pre.src0 === c.src) return;
    try {
      var im = new Image();
      im.decoding = 'async';
      im.onerror = function () { S.broken[c.src] = true; };
      im.src = c.src;
      im.src0 = c.src;
      if (S.pre) { S.pre.onerror = null; }
      S.pre = im;
    } catch (e) {}
  }

  /* ---------- Sau khi sách dựng xong ---------- */

  function ready(ctx) {
    if (!S) return;
    S.photoIndex = ctx.pageIndex('.page--photo');

    ctx.on('shown', function (d) {
      if (d.index === S.photoIndex) { startClock(); preloadNext(); fitNote(); }
      else { stopClock(); settleToss(); }
    });

    /* Xoay máy / đổi cỡ cửa sổ: tấm ảnh đổi cỡ thì đo lại số dòng lời nhắn */
    var fitTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(function () {
        try { if (onPhotoPage()) fitNote(); } catch (e) { complain(e); }
      }, 220);
    });
    /* Font viết tay về muộn thì chiều cao dòng đổi, đo lại một lần nữa */
    if (doc.fonts && doc.fonts.addEventListener) {
      doc.fonts.addEventListener('loadingdone', function () {
        try { if (onPhotoPage()) fitNote(); } catch (e) { complain(e); }
      });
    }

    /* Bắt đầu lật trang là ngừng đếm. Nếu người xem chỉ nhấc mép trang rồi thả ra
       (không có sự kiện "shown" nào) thì kiểm tra lại sau một nhịp để đếm tiếp. */
    var recheck = null;
    ctx.on('turn', function () {
      stopClock();
      calmCopies();
      clearTimeout(recheck);
      recheck = setTimeout(function () {
        try { if (onPhotoPage() && !doc.hidden) startClock(); } catch (e) { complain(e); }
      }, 1100);
    });

    doc.addEventListener('visibilitychange', function () {
      try {
        if (doc.hidden) stopClock();
        else if (onPhotoPage()) startClock();
      } catch (e) { complain(e); }
    });

    ctx.on('start', function () {
      if (onPhotoPage()) { startClock(); preloadNext(); }
    });
  }

  (Invite.features = Invite.features || []).push({
    name: 'photo-stack',
    setup: setup,
    ready: ready
  });
})();
