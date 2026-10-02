/* =====================================================================
   sealed-letter.js - lá thư niêm phong, chờ đúng ngày lễ mới mở được

   Ở trang đếm ngược, bạn gấu canh một phong bì nhỏ có dấu sáp.
   - Chưa tới ngày: chạm vào thì phong bì lắc lư, hiện câu trêu, KHÔNG mở.
   - Tới giờ mở (mặc định 0 giờ ngày diễn ra buổi lễ, giờ Việt Nam): dấu sáp
     hoá vàng, chạm một lần là bóc thư, lời thư hiện trong cửa sổ nổi.
   - Đã mở một lần thì phong bì nằm ở dạng đã bóc, chạm lại để đọc lại.

   Nội dung nằm ở mục "sealedLetter" trong config.js. Thiếu mục nào thì dùng
   lời mặc định bên dưới.

   QUAN TRỌNG: người gửi không xem trước được lá thư đang khoá, nên tuyệt đối
   không để chữ giữ chỗ được mở ra đúng ngày lễ. Chưa viết đoạn thư nào, hoặc
   thư còn chữ "Lorem ipsum", thì phong bì KHÔNG hiện, trang đếm ngược giữ nguyên.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;

  var STORE_KEY = 'sealed-letter:opened';
  var DAY = 86400000;
  var VN_OFFSET = '+07:00';
  var VN_OFFSET_MS = 7 * 3600 * 1000;
  var MAX_TIMER = 2147480000;     /* setTimeout không hẹn được xa hơn khoảng 24 ngày */
  var TEASE_MS = 2500;
  var BREAK_MS = 480;             /* cảnh bóc dấu sáp trên trang, rồi mới mở cửa sổ thư */
  var MIN_TEXT_PX = 13;           /* chữ không nhỏ hơn 13px trên máy 320px */

  /* Class trạng thái của nút phong bì (đều mang tiền tố của tính năng) */
  var CLS_WIGGLE = 'sealed-letter__btn--wiggle';
  var CLS_BREAK = 'sealed-letter__btn--break';
  var CLS_SETTLE = 'sealed-letter__btn--settle';
  var CLS_QUIET = 'sealed-letter__btn--quiet';

  var DEFAULTS = {
    tag: 'Mở vào ngày lễ',
    readyTag: 'Mở được rồi nè',
    againTag: 'Đọc lại thư nè',
    teases: ['Chưa tới ngày mà!', 'Còn {days} ngày nữa thôi', 'Nhìn trộm là gấu mách {from} đó'],
    title: 'Gửi {to}, đúng ngày hôm nay',
    /* Cố ý để trống: lời thư phải do chính người gửi viết, không có chữ giữ chỗ */
    paragraphs: [],
    sign: '{from}'
  };

  /* Chữ giữ chỗ mà lỡ còn sót thì coi như thư chưa viết */
  var PLACEHOLDER_RE = /lorem\s+ipsum/i;

  var STAR_D = 'M32 20.9l1.2 2.9 3.1.2-2.4 2 .8 3-2.7-1.7-2.7 1.7.8-3-2.4-2 3.1-.2z';

  var HEART_D = 'M12 21.2c-.4 0-.8-.1-1.1-.4C6.1 17 2 13.4 2 8.9 2 6 4.2 3.8 7 3.8c1.9 0 3.6 1 5 2.9 1.4-1.9 3.1-2.9 5-2.9 2.8 0 5 2.2 5 5.1 0 4.5-4.1 8.1-8.9 11.9-.3.3-.7.4-1.1.4z';

  /* Phong bì vẽ bằng hình đơn giản. Hai trạng thái (đóng / đã bóc) nằm sẵn trong cùng
     một hình và bật tắt bằng class của trang, vì trang bị nhân bản lúc lật nên bản sao
     phải tự hiện đúng mà không cần JS. Không dùng id (clipPath, gradient) vì lý do đó. */
  var ENVELOPE =
    '<svg class="sealed-letter__env" viewBox="0 0 64 46" aria-hidden="true" focusable="false">' +
      '<rect class="sealed-letter__edge" x="2" y="6.5" width="60" height="38" rx="7"/>' +
      '<g class="sealed-letter__open">' +
        '<rect class="sealed-letter__inside" x="2" y="3" width="60" height="38" rx="7"/>' +
        '<path class="sealed-letter__flap-up" d="M3.5 9L28.2-13.6a5.4 5.4 0 0 1 7.6 0L60.5 9z"/>' +
        '<g class="sealed-letter__paper">' +
          '<rect x="11" y="-6" width="42" height="40" rx="3.5" fill="#FFFDF9"/>' +
          '<path d="M17 3.2h14M17 9.4h24M22 15.6h20" fill="none" stroke="#CDBDF5" stroke-width="2.3" stroke-linecap="round"/>' +
          '<path transform="translate(38.6 -4.2) scale(.44)" fill="#FF8FAB" d="' + HEART_D + '"/>' +
        '</g>' +
        '<path class="sealed-letter__pocket" d="M2 10l30 19.5L62 10v24a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7z"/>' +
      '</g>' +
      '<rect class="sealed-letter__body" x="2" y="3" width="60" height="38" rx="7"/>' +
      '<path class="sealed-letter__fold" d="M2 34L32 16.5 62 34a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7z"/>' +
      '<g class="sealed-letter__shut">' +
        '<path class="sealed-letter__flap" d="M9 3h46a7 7 0 0 1 7 7L36 27.6a6 6 0 0 1-8 0L2 10a7 7 0 0 1 7-7z"/>' +
        '<g class="sealed-letter__wax">' +
          '<g class="sealed-letter__wax-edge"><circle cx="32" cy="26.9" r="8.3"/><circle cx="25.3" cy="29.6" r="2.6"/><circle cx="38.9" cy="29.2" r="2.4"/><circle cx="30.2" cy="34.3" r="2.3"/></g>' +
          '<circle class="sealed-letter__wax-face" cx="32" cy="25.4" r="8.3"/>' +
          '<circle class="sealed-letter__wax-ring" cx="32" cy="25.4" r="6.1"/>' +
          /* Dấu sáp in hình ngôi sao (không phải trái tim) để khác hẳn phong bì hồng ở màn mở đầu */
          '<path class="sealed-letter__wax-star" d="' + STAR_D + '"/>' +
          /* Vết nứt: ẩn sẵn, chỉ loé lên trong khoảnh khắc bóc dấu sáp */
          '<path class="sealed-letter__wax-crack" d="M31.2 17.4l1.9 3.6-2.6 2.5 3 3-2.2 2.9 1.2 3.3"/>' +
        '</g>' +
      '</g>' +
    '</svg>';

  var PAGE_HTML =
    '<span class="sealed-letter__bubble" role="status" aria-live="polite"></span>' +
    '<span class="sealed-letter__stack">' +
      '<button class="sealed-letter__btn" type="button">' +
        ENVELOPE +
        '<svg class="sealed-letter__twinkle sealed-letter__twinkle--a" aria-hidden="true"><use href="#i-sparkle"/></svg>' +
        '<svg class="sealed-letter__twinkle sealed-letter__twinkle--b" aria-hidden="true"><use href="#i-sparkle"/></svg>' +
        /* Sợi dây buộc thẻ treo vào phong bì */
        '<span class="sealed-letter__string" aria-hidden="true"></span>' +
        '<span class="sealed-letter__tag"></span>' +
      '</button>' +
    '</span>';

  /* Dấu sáp vàng đã bẻ đôi, trái tim bay ra ở giữa (để nguyên tim, không vẽ tim vỡ) */
  var HALF_ZIGZAG = 'L64.5 55 56.5 47 64.5 39 56.5 31 63 23z';
  var BROKEN_SEAL =
    '<svg viewBox="0 0 120 70" aria-hidden="true" focusable="false">' +
      '<g class="sealed-letter-sheet__half sealed-letter-sheet__half--l">' +
        '<path fill="#DDA22E" transform="translate(0 3)" d="M60 16A24 24 0 0 0 60 64' + HALF_ZIGZAG + '"/>' +
        '<path fill="#F6C453" d="M60 16A24 24 0 0 0 60 64' + HALF_ZIGZAG + '"/>' +
        '<path fill="none" stroke="#FCE7A8" stroke-width="2.4" stroke-linecap="round" d="M52 25A17 17 0 0 0 52 55"/>' +
      '</g>' +
      '<g class="sealed-letter-sheet__half sealed-letter-sheet__half--r">' +
        '<path fill="#DDA22E" transform="translate(0 3)" d="M60 16A24 24 0 0 1 60 64' + HALF_ZIGZAG + '"/>' +
        '<path fill="#F6C453" d="M60 16A24 24 0 0 1 60 64' + HALF_ZIGZAG + '"/>' +
        '<path fill="none" stroke="#FCE7A8" stroke-width="2.4" stroke-linecap="round" d="M68 25A17 17 0 0 1 68 55"/>' +
      '</g>' +
      '<g class="sealed-letter-sheet__heart">' +
        '<path transform="translate(44.4 5) scale(1.3)" fill="#E8638C" d="' + HEART_D + '"/>' +
        '<ellipse cx="53.5" cy="14.5" rx="2.2" ry="3.4" transform="rotate(-35 53.5 14.5)" fill="#fff" opacity=".6"/>' +
      '</g>' +
      '<use class="sealed-letter-sheet__spark sealed-letter-sheet__spark--a" href="#i-sparkle" x="12" y="6" width="14" height="14"/>' +
      '<use class="sealed-letter-sheet__spark sealed-letter-sheet__spark--b" href="#i-sparkle" x="97" y="12" width="11" height="11"/>' +
      '<use class="sealed-letter-sheet__spark sealed-letter-sheet__spark--c" href="#i-heart" x="101" y="40" width="9" height="9"/>' +
    '</svg>';

  var SHEET_HTML =
    '<div class="sealed-letter-sheet__seal" aria-hidden="true">' + BROKEN_SEAL + '</div>' +
    '<h2 class="sealed-letter-sheet__title sealed-letter-sheet__in" style="--i:0"><span class="sealed-letter-sheet__hl"></span></h2>' +
    '<div class="sealed-letter-sheet__text"></div>' +
    '<p class="sealed-letter-sheet__sign sealed-letter-sheet__in"><svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg><span></span></p>' +
    '<div class="sealed-letter-sheet__cta sealed-letter-sheet__in">' +
      '<button class="btn sealed-letter-sheet__done" type="button"><svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg><span>Cất thư lại</span></button>' +
    '</div>';

  /* ---------- Đọc config: thiếu hay sai kiểu thì dùng mặc định ---------- */

  function isText(v) { return typeof v === 'string' || (typeof v === 'number' && isFinite(v)); }

  /* Nhãn ngắn: để trống cũng coi như thiếu (phong bì không thể không có nhãn) */
  function label(v, fallback) {
    return isText(v) && String(v).trim() ? String(v) : fallback;
  }

  /* Dòng chữ được phép để trống '' (nghĩa là người gửi muốn ẩn đi) */
  function line(v, fallback) {
    return isText(v) ? String(v) : fallback;
  }

  function list(v, fallback) {
    var src = isText(v) ? [v] : (Array.isArray(v) ? v : []);
    var out = [];
    for (var i = 0; i < src.length; i++) {
      if (isText(src[i]) && String(src[i]).trim()) out.push(String(src[i]));
    }
    return out.length ? out : fallback.slice();
  }

  /* ---------- Giờ mở thư ---------- */

  var ISO_RE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

  /* "+0700" -> "+07:00" để Safari cũng đọc được */
  function tidyOffset(off) {
    if (!off) return '';
    if (/^z$/i.test(off)) return 'Z';
    return off.indexOf(':') === -1 ? off.slice(0, 3) + ':' + off.slice(3) : off;
  }

  /* Đổi chuỗi ngày giờ thành mili giây. Chuỗi không ghi múi giờ thì hiểu theo múi giờ
     dự phòng (giờ buổi lễ, tức giờ Việt Nam) chứ không theo máy người xem.
     dayStart = true: lấy 0 giờ của ngày đó. Sai định dạng thì trả về NaN. */
  function toTime(value, fallbackOffset, dayStart) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    var s = value.replace(/^\s+|\s+$/g, '');
    if (!s) return NaN;
    var m = ISO_RE.exec(s);
    if (!m) return new Date(s).getTime();
    var off = tidyOffset(m[5]) || fallbackOffset;
    var clock = (dayStart || m[2] === undefined) ? '00:00:00' : pad2(m[2]) + ':' + m[3] + ':' + (m[4] || '00');
    return new Date(m[1] + 'T' + clock + off).getTime();
  }

  /* Trả về thời điểm mở thư (mili giây), hoặc null nếu thư không bị khoá.
     - sealedLetter.unlock hợp lệ: dùng nó.
     - Không thì lấy 0 giờ của ngày diễn ra buổi lễ, theo múi giờ ghi trong event.start.
     - Ngày lễ thiếu hoặc sai: không khoá (thà mở sớm còn hơn khoá mãi một lá thư). */
  function unlockTime(ctx) {
    var start = ctx.get('event.start');
    var m = typeof start === 'string' ? ISO_RE.exec(start.replace(/^\s+|\s+$/g, '')) : null;
    var eventOffset = (m && tidyOffset(m[5])) || VN_OFFSET;

    var custom = ctx.get('sealedLetter.unlock');
    if (custom !== undefined && custom !== null && custom !== '') {
      var t = toTime(custom, eventOffset, false);
      if (!isNaN(t)) return t;
    }

    var startMs = toTime(start, VN_OFFSET, false);
    if (isNaN(startMs)) return null;
    if (m) {
      var midnight = toTime(start, VN_OFFSET, true);
      if (!isNaN(midnight)) return midnight;
    }
    /* Ngày ghi theo kiểu lạ: lùi về 0 giờ Việt Nam của đúng hôm đó */
    return Math.floor((startMs + VN_OFFSET_MS) / DAY) * DAY - VN_OFFSET_MS;
  }

  /* ---------- Tính năng ---------- */

  function toggle(el, name, on) {
    if (on) el.classList.add(name); else el.classList.remove(name);
  }

  function create(ctx) {
    var S = ctx.get('sealedLetter');
    if (!S || typeof S !== 'object') S = {};

    var page = null;
    var wrap = null;
    var btn = null;
    var tagEl = null;
    var bubble = null;

    var unlockAt = unlockTime(ctx);
    var opened = ctx.store.get(STORE_KEY) === '1';
    var teaseCount = 0;
    var teaseTimer = null;
    var unlockTimer = null;
    var busy = false;         /* đang chạy cảnh bóc dấu sáp, chưa hiện thư */
    /* Đang đọc thư lần đầu: "đã bóc" được lưu ngay, nhưng phong bì trên trang chỉ đổi
       sang dạng đã bóc (và thẻ "Đọc lại thư nè") sau khi cất thư lại, để khoảnh khắc
       bóc dấu sáp không bị lộ kết cục trước. */
    var reading = false;
    var sheet = null;
    var celebrate = false;    /* lần mở đầu tiên thì tung tim trong cửa sổ thư */
    var lastInput = 'pointer';  /* lần tương tác gần nhất là chạm/chuột hay bàn phím */

    function fromName() {
      return String((ctx.names && ctx.names.from) || '').replace(/^\s+|\s+$/g, '');
    }

    function isUnlocked() {
      return unlockAt === null || Date.now() >= unlockAt;
    }

    /* Số ngày tròn còn lại tới giờ mở, ít nhất là 1 */
    function daysLeft() {
      if (unlockAt === null) return 1;
      return Math.max(1, Math.floor((unlockAt - Date.now()) / DAY));
    }

    function words(text) {
      return ctx.fill(text).split('{days}').join(String(daysLeft()));
    }

    function guard(fn) {
      return function (arg) {
        try { return fn(arg); } catch (err) {
          if (window.console && console.error) console.error('[thu-moi] sealed-letter:', err);
        }
      };
    }

    function buzz(pattern) {
      if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
    }

    function hideTease() {
      clearTimeout(teaseTimer);
      teaseTimer = null;
      if (wrap) wrap.classList.remove('sealed-letter--tease');
    }

    /* Tô lại phong bì theo giờ hiện tại. Trạng thái nằm ở class của TRANG và ở chữ,
       để bản sao lúc lật trang trông y hệt bản gốc. */
    function paint() {
      if (!page) return false;
      var unlocked = isUnlocked();
      var isOpen = unlocked && opened && !reading;
      toggle(page, 'sealed-letter--ready', unlocked);
      toggle(page, 'sealed-letter--opened', isOpen);

      var text = isOpen ? label(S.againTag, DEFAULTS.againTag)
        : unlocked ? label(S.readyTag, DEFAULTS.readyTag)
        : label(S.tag, DEFAULTS.tag);
      text = words(text);
      if (tagEl.textContent !== text) tagEl.textContent = text;
      btn.setAttribute('aria-label',
        (isOpen ? 'Lá thư đã bóc' : unlocked ? 'Lá thư bí mật' : 'Lá thư niêm phong') + ': ' + text);

      if (unlocked) hideTease();
      return unlocked;
    }

    /* Tab để mở qua nửa đêm: tự đổi sang "mở được" đúng lúc, khỏi cần tải lại trang */
    function arm() {
      clearTimeout(unlockTimer);
      unlockTimer = null;
      if (unlockAt === null) return;
      var wait = unlockAt - Date.now();
      if (wait <= 0 || wait > MAX_TIMER) return;
      unlockTimer = setTimeout(guard(refresh), wait + 250);
    }

    function refresh() {
      var unlocked = paint();
      if (!unlocked) arm();
      return unlocked;
    }

    /* ----- Chưa tới ngày: lắc lư và trêu ----- */

    /* Chạy lại animation bằng class, có hẹn giờ gỡ class RIÊNG cho từng loại.
       (ctx.replay hẹn giờ gỡ không huỷ được: chạm liên tục thì hẹn giờ của lần
       trước gỡ mất class của lần sau, cái lắc bị cắt ngang.) */
    var classTimers = {};
    function replayFor(el, cls, ms) {
      clearTimeout(classTimers[cls]);
      el.classList.remove(cls);
      void el.getBoundingClientRect().width;
      el.classList.add(cls);
      classTimers[cls] = setTimeout(function () { el.classList.remove(cls); }, ms);
    }

    function rectOf(el) {
      var r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width };
    }

    /* Khung bao mắt, mũi, miệng của bạn gấu cạnh phong bì: bong bóng không được che chỗ này */
    function faceRect(art) {
      var parts = ctx.qsa('.pet .m-eye, .pet .m-nose, .pet .m-mouth', art);
      var box = null;
      for (var i = 0; i < parts.length; i++) {
        var r = rectOf(parts[i]);
        if (!r.width) continue;
        if (!box) { box = r; continue; }
        box.left = Math.min(box.left, r.left);
        box.top = Math.min(box.top, r.top);
        box.right = Math.max(box.right, r.right);
        box.bottom = Math.max(box.bottom, r.bottom);
      }
      if (!box) return null;
      /* Gấu đang nhún lên xuống (animation "bob"): trừ độ dịch hiện tại để có vị trí lúc đứng yên */
      var slot = ctx.qs('.pet .mascot-slot', art);
      var ty = 0;
      try {
        var m = /matrix(3d)?\(([^)]+)\)/.exec(getComputedStyle(slot).transform || '');
        if (m) {
          var v = m[2].split(',');
          ty = parseFloat(v[m[1] ? 13 : 5]) || 0;
        }
      } catch (e) {}
      box.top -= ty;
      box.bottom -= ty;
      return box;
    }

    function hits(a, b) {
      return !!(a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom);
    }

    /* Khung của một phần tử đang hiện trên trang đếm ngược (null nếu không có hoặc đang ẩn) */
    function rectIn(sel) {
      var el = ctx.qs(sel, page);
      if (!el) return null;
      var r = rectOf(el);
      return r.width ? r : null;
    }

    /* Đo chỗ trống quanh bạn gấu (trang đang hiện nên đo được thật).
       Bộ đếm và nút "Thêm vào lịch" là nội dung chính của trang: bong bóng không bao giờ
       được đè lên, kể cả trong 2,5 giây. Mặt gấu (mắt, mũi, miệng) cũng vậy, tính cả
       quãng nhún lên 0.4em của animation "bob". */
    function measureRoom() {
      var art = wrap.parentNode;
      var size = 0;
      try { size = parseFloat(getComputedStyle(wrap).fontSize); } catch (e) {}
      var w = rectOf(wrap);
      if (!art || !page || !size || !w.width) return null;

      var inner = rectIn('.page__inner');
      var artBox = rectOf(art);
      var count = rectIn('.count');
      var done = rectIn('.count__done');
      var cal = rectIn('.page__cta .btn') || rectIn('.page__cta');
      var face = faceRect(art);
      var top = inner ? inner.top + 0.9 * size : artBox.top;
      if (count) top = Math.max(top, count.bottom + 0.3 * size);
      if (done) top = Math.max(top, done.bottom + 0.3 * size);
      return {
        size: size,
        w: w,
        b: rectOf(btn),
        count: count,
        cal: cal,
        zone: face ? {
          left: face.left - 0.25 * size, right: face.right + 0.25 * size,
          top: face.top - 0.55 * size, bottom: face.bottom + 0.1 * size
        } : null,
        /* Khung nét đứt của trang nằm cách mép .6em (bên gáy 1em): bong bóng ở trong khung */
        lim: {
          left: inner ? inner.left + 1.3 * size : artBox.left,
          right: inner ? inner.right - 0.85 * size : artBox.right,
          top: top,
          bottom: cal ? cal.top - 0.25 * size : artBox.bottom
        }
      };
    }

    /* Thử đặt bong bóng theo một kiểu, với chữ và cỡ chữ đang có:
       - "roomy": bong bóng hẹp đứng ngay trên phong bì, bên phải mặt gấu, đuôi chỉ xuống phong bì;
       - "top":   bong bóng dẹt nằm cao hơn mặt gấu (được đè lên mũ tốt nghiệp, không đè mặt);
       - "side":  bong bóng hẹp bên trái bạn gấu, đuôi chỉ vào gấu, như gấu đang canh thư lên tiếng.
       Trả về true nếu vừa chỗ trống. force = true: cứ đặt dù không vừa (đường lui cuối cùng).
       Vị trí ghi bằng style của chính bong bóng (không phải của .page) nên bản sao lúc lật
       trang cũng giống hệt. */
    function tryPlace(room, mode, force) {
      var s = room.size;
      var lim = room.lim;
      var zone = room.zone;
      var right;
      var maxW;
      var bottom;
      if (mode !== 'top' && !zone) return false;

      toggle(wrap, 'sealed-letter--roomy', mode === 'roomy');
      toggle(wrap, 'sealed-letter--side', mode === 'side');
      if (mode === 'roomy') {
        right = Math.min(room.w.right + 0.15 * s, lim.right);
        maxW = Math.min(right - zone.right - 0.1 * s, 9 * s);
        /* Đáy bong bóng chừa chỗ cho cái đuôi chỉ xuống phong bì */
        bottom = room.b.top - 0.62 * s;
      } else if (mode === 'side') {
        /* Chừa .6em cho cái đuôi chìa sang phải */
        right = zone.left - 0.6 * s;
        maxW = Math.min(right - lim.left, 8.5 * s);
      } else {
        right = Math.min(room.w.right - 0.1 * s, lim.right);
        maxW = Math.min(right - lim.left, 13 * s);
        bottom = room.b.top - 0.62 * s;
        if (zone) bottom = Math.min(bottom, zone.top - 0.1 * s);
      }
      if (maxW < 3.5 * s && !force) return false;

      bubble.style.maxWidth = Math.max(Math.floor(maxW), 1) + 'px';
      var bw = bubble.offsetWidth;
      var bh = bubble.offsetHeight;
      if (mode === 'side') {
        /* Ngang tầm mặt gấu, nhưng luôn nằm giữa bộ đếm và nút lịch */
        var mid = (zone.top + zone.bottom) / 2;
        bottom = Math.min(lim.bottom, Math.max(lim.top + bh, mid + bh / 2));
      }
      var box = { left: right - bw, right: right, top: bottom - bh, bottom: bottom };
      var fits = box.top >= lim.top - 0.5 && box.bottom <= lim.bottom + 0.5 &&
        box.left >= lim.left - 0.5 && box.right <= lim.right + 0.5 &&
        !hits(box, zone) && !hits(box, room.count) && !hits(box, room.cal);
      if (!fits && !force) return false;

      bubble.style.right = Math.round(room.w.right - right) + 'px';
      bubble.style.bottom = Math.round(room.w.bottom - bottom) + 'px';
      return true;
    }

    /* Tìm chỗ cho câu trêu đang gán trong bong bóng: thử từng kiểu ở cỡ chữ thường,
       rồi ở cỡ nhỏ nhất cho phép (13px). Trả về false nếu câu này không vừa ở đâu cả. */
    function fitBubble(force) {
      var room = measureRoom();
      if (!room) return true;
      var modes = ['roomy', 'top', 'side'];
      var fonts = [''];
      bubble.style.fontSize = '';
      var px = 0;
      try { px = parseFloat(getComputedStyle(bubble).fontSize); } catch (e) {}
      if (px > MIN_TEXT_PX + 0.5) fonts.push(MIN_TEXT_PX + 'px');

      for (var f = 0; f < fonts.length; f++) {
        bubble.style.fontSize = fonts[f];
        for (var m = 0; m < modes.length; m++) {
          if (tryPlace(room, modes[m], false)) return true;
        }
      }
      if (force) tryPlace(room, room.zone ? 'side' : 'top', true);
      return false;
    }

    function tease() {
      var lines = list(S.teases, DEFAULTS.teases);
      if (!fromName()) {
        /* Không có tên người gửi thì bỏ những câu nhắc tới {from} cho khỏi cụt lủn */
        lines = lines.filter(function (t) { return t.indexOf('{from}') === -1; });
      }
      if (!lines.length) lines = [DEFAULTS.teases[0]];

      /* Gán chữ trước rồi mới đo, để biết bong bóng cao bao nhiêu. Trang quá chật cho
         câu đến lượt (máy nhỏ trong Zalo) thì nói câu kế tiếp vừa chỗ, thay vì che bộ đếm;
         không câu nào vừa thì nói câu ngắn nhất. */
      var start = teaseCount % lines.length;
      var chosen = -1;
      for (var k = 0; k < lines.length && chosen < 0; k++) {
        var idx = (start + k) % lines.length;
        bubble.textContent = words(lines[idx]);
        if (fitBubble(false)) chosen = idx;
      }
      if (chosen < 0) {
        chosen = 0;
        for (var j = 1; j < lines.length; j++) {
          if (words(lines[j]).length < words(lines[chosen]).length) chosen = j;
        }
        bubble.textContent = words(lines[chosen]);
        fitBubble(true);
      }
      teaseCount = chosen + 1;

      ctx.audio.pop();
      buzz(10);

      if (ctx.reduce) {
        /* Giảm chuyển động: không lắc, bong bóng chỉ hiện lên rồi tắt */
        wrap.classList.add('sealed-letter--tease');
      } else {
        ctx.replay(wrap, 'sealed-letter--tease');
        replayFor(btn, CLS_WIGGLE, 650);
      }

      clearTimeout(teaseTimer);
      teaseTimer = setTimeout(guard(hideTease), TEASE_MS);
      ctx.emit('sealed-letter:tease', { text: bubble.textContent });
    }

    /* ----- Tới ngày: bóc thư ----- */

    /* Lời thư chỉ được đưa vào trang ở đây, tức là sau giờ mở */
    function buildSheet() {
      var title = ctx.fill(line(S.title, DEFAULTS.title));
      var api = ctx.overlay({
        label: title.replace(/^\s+|\s+$/g, '') || 'Lá thư bí mật',
        className: 'sealed-letter-sheet',
        html: SHEET_HTML,
        onOpen: function (s) {
          s.body.scrollTop = 0;
          if (!celebrate) return;
          celebrate = false;
          if (ctx.reduce) return;
          var seal = ctx.qs('.sealed-letter-sheet__seal', s.body);
          setTimeout(guard(function () {
            if (s.isOpen()) ctx.fx.hearts(seal, { count: 10, near: 44, far: 118, at: 0.4 });
          }), 380);
        },
        onClose: guard(function () {
          /* Cửa sổ trả tiêu điểm về phong bì. Người dùng chạm tay thì không cần vòng viền
             tiêu điểm to tướng quanh phong bì; người dùng bàn phím thì vẫn thấy như thường. */
          if (lastInput !== 'key') btn.classList.add(CLS_QUIET);
          finishReading();
        })
      });
      var body = api.body;

      var titleEl = ctx.qs('.sealed-letter-sheet__title', body);
      ctx.qs('.sealed-letter-sheet__hl', titleEl).textContent = title;
      if (!title.replace(/\s/g, '')) titleEl.hidden = true;

      var box = ctx.qs('.sealed-letter-sheet__text', body);
      var paras = list(S.paragraphs, DEFAULTS.paragraphs);
      paras.forEach(function (text, i) {
        var p = doc.createElement('p');
        p.className = 'sealed-letter-sheet__in';
        p.style.setProperty('--i', String(Math.min(i, 5) + 1));
        p.textContent = ctx.fill(text);
        box.appendChild(p);
      });

      var n = Math.min(paras.length, 6);
      var signEl = ctx.qs('.sealed-letter-sheet__sign', body);
      var signRaw = line(S.sign, DEFAULTS.sign);
      var sign = ctx.fill(signRaw).replace(/^\s+|\s+$/g, '');
      /* Chữ ký nhắc tới {from} mà chưa điền tên người gửi thì ẩn luôn */
      if (!sign || (signRaw.indexOf('{from}') !== -1 && !fromName())) signEl.hidden = true;
      else ctx.qs('span', signEl).textContent = sign;
      signEl.style.setProperty('--i', String(n + 1));

      var cta = ctx.qs('.sealed-letter-sheet__cta', body);
      cta.style.setProperty('--i', String(n + 2));
      ctx.qs('.sealed-letter-sheet__done', cta).addEventListener('click', guard(function () { api.close(); }));

      return api;
    }

    /* Cất thư lại sau lần đọc đầu: lúc này phong bì trên trang mới chuyển sang dạng đã bóc
       (nắp mở, lá thư nhô ra, thẻ "Đọc lại thư nè"), kèm cái nhún nhẹ khi thư được nhét lại. */
    function finishReading() {
      if (!reading) return;
      reading = false;
      btn.classList.remove(CLS_BREAK);
      paint();
      if (!ctx.reduce && page.classList.contains('sealed-letter--opened')) replayFor(btn, CLS_SETTLE, 700);
    }

    function showSheet() {
      busy = false;
      if (!isUnlocked()) {            /* đồng hồ máy bị chỉnh lùi giữa chừng */
        finishReading();
        return;
      }
      try {
        if (!sheet) sheet = buildSheet();
        sheet.open();
      } catch (err) {
        /* Không mở được cửa sổ thì đừng để phong bì kẹt ở cảnh đang bóc */
        finishReading();
        throw err;
      }
    }

    function openLetter() {
      if (busy || (sheet && sheet.isOpen())) return;
      var first = !opened;

      if (first) {
        /* Lưu "đã bóc" ngay (lỡ tải lại giữa chừng thì cũng không chime lần nữa), nhưng
           phong bì trên trang giữ nguyên dạng niêm phong cho tới khi cất thư lại */
        opened = true;
        reading = true;
        ctx.store.set(STORE_KEY, '1');
        celebrate = true;
        ctx.audio.chime();
        buzz([18, 50, 18]);
      } else {
        ctx.audio.pop();
      }
      ctx.emit('sealed-letter:open', { first: first });

      if (first && !ctx.reduce) {
        /* Dấu sáp nứt rồi bật ra, nắp phong bì hé lên, rồi mới mở cửa sổ thư.
           Class giữ nguyên trạng thái cuối (dấu sáp đã bung) cho tới khi cất thư lại. */
        busy = true;
        btn.classList.remove(CLS_BREAK);
        void btn.getBoundingClientRect().width;
        btn.classList.add(CLS_BREAK);
        ctx.fx.hearts(btn, { count: 8, near: 34, far: 86, at: 0.3 });
        setTimeout(guard(showSheet), BREAK_MS);
      } else {
        showSheet();
      }
    }

    function onTap() {
      if (refresh()) openLetter();
      else tease();
    }

    /* Thư đã thật sự được viết chưa? Trả về lý do nếu CHƯA, null nếu ổn.
       Chỉ đọc config, không đưa chữ nào vào trang. */
    function notWritten() {
      var paras = list(S.paragraphs, DEFAULTS.paragraphs);
      if (!paras.length) return 'empty';
      var title = line(S.title, DEFAULTS.title);
      if (PLACEHOLDER_RE.test(title)) return 'lorem';
      for (var i = 0; i < paras.length; i++) {
        if (PLACEHOLDER_RE.test(paras[i])) return 'lorem';
      }
      return null;
    }

    return {
      /* Trước khi dựng sách: đặt phong bì vào cạnh bạn gấu ở trang đếm ngược */
      setup: function () {
        var why = notWritten();
        if (why) {
          /* Thư trống là trạng thái mặc định: im lặng. Còn chữ Lorem thì nhắc người gửi một câu. */
          if (why === 'lorem' && window.console && console.warn) {
            console.warn('[thu-moi] sealed-letter: lá thư bí mật còn chữ giữ chỗ "Lorem ipsum" nên phong bì được ẩn. Hãy viết lời thật vào sealedLetter trong config.js.');
          }
          return;
        }

        var host = ctx.qs('.page--count', ctx.bookEl);
        var art = host ? ctx.qs('.page__art', host) : null;
        if (!art) return;

        wrap = doc.createElement('span');
        wrap.className = 'sealed-letter';
        wrap.innerHTML = PAGE_HTML;
        btn = ctx.qs('.sealed-letter__btn', wrap);
        tagEl = ctx.qs('.sealed-letter__tag', wrap);
        bubble = ctx.qs('.sealed-letter__bubble', wrap);
        if (!btn || !tagEl || !bubble) { wrap = null; return; }

        art.appendChild(wrap);
        page = host;
        btn.addEventListener('click', guard(onTap));
        paint();
      },

      /* Sau khi dựng sách: xem lại giờ mỗi khi trang đếm ngược hiện ra */
      ready: function () {
        if (!page) return;
        ctx.on('shown', function (d) {
          if (d && d.page === page) refresh();
        });
        doc.addEventListener('visibilitychange', guard(function () {
          if (!doc.hidden) refresh();
        }));

        /* Ghi nhớ kiểu tương tác (chạm hay bàn phím) để quyết định có vẽ viền tiêu điểm không */
        function pointerUsed() { lastInput = 'pointer'; }
        doc.addEventListener('pointerdown', pointerUsed, true);
        doc.addEventListener('touchstart', pointerUsed, { capture: true, passive: true });
        doc.addEventListener('keydown', function () {
          lastInput = 'key';
          btn.classList.remove(CLS_QUIET);
        }, true);
        btn.addEventListener('blur', function () { btn.classList.remove(CLS_QUIET); });
        arm();
      }
    };
  }

  var feature = null;

  (Invite.features = Invite.features || []).push({
    name: 'sealed-letter',
    setup: function (ctx) {
      feature = create(ctx);
      feature.setup();
    },
    ready: function () {
      if (feature) feature.ready();
    }
  });
})();
