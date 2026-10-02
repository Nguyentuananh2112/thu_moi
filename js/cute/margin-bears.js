/* =====================================================================
   margin-bears.js - đôi gấu tí hon xích lại gần ở lề trang

   Giống hình vẽ nguệch ngoạc ở mép vở: lề dưới mỗi trang giấy có hai cái
   đầu gấu bé xíu (gấu cử nhân bên trái, gấu nâu bên phải). Trang đầu hai
   bạn đứng ở hai góc, mỗi trang nhích lại gần nhau một bước, tới trang lời
   mời cuối thì chạm má nhau, có trái tim nhỏ đập ở giữa.
   Lật nhanh sẽ thấy như một đoạn hoạt hình tí hon. Người đọc không cần
   làm gì cả: đây là phần thưởng cho việc đọc tiếp.

   Cấu hình (config.js, mục marginBears, không có cũng chạy):
     marginBears: { heart: true }   // false = không vẽ trái tim lúc gặp nhau

   Vì trang sách bị nhân bản khi lật nên mọi trạng thái đều nằm trong class
   và biến CSS ghi thẳng lên phần tử của mình (không bao giờ ghi lên .page).
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;
  var root = doc.documentElement;

  var HOP_MS = 900;      /* dài hơn animation nhảy (kể cả nhịp trễ của gấu nâu) rồi mới gỡ class */
  var JOY_MS = 1700;     /* hai cú nhảy ăn mừng */
  var HOP_MAX_EM = 0.62; /* cú bật cao nhất khi phía trên trống trải (khớp với giá trị mặc định trong CSS) */
  var HOP_MIN_EM = 0.24; /* chỗ trống chỉ đủ bật thấp hơn mức này thì nhìn như run rẩy: chuyển sang nhún tại chỗ */
  var REACH_EM = 0.2;    /* lúc ở đỉnh, đầu gấu còn vươn người + nghiêng thêm chừng này (xem @keyframes margin-bears-hop-*) */
  var TINY_PX = 240;     /* sách hẹp hơn mức này thì cất đôi gấu đi cho trang đỡ chật */
  var FIT_MIN = 0.86;    /* trang gặp nhau bị nút đè sát: thu cụm gấu nhỏ lại tối đa còn chừng này */
  var CAP_GAP = 2.5 / 36; /* chóp mũ cử nhân bắt đầu ở y = 2.5 trong khung vẽ cao 36 */
  var SIZE_FRAMES = 75;  /* chờ trang có kích thước tối đa chừng ấy khung hình (khoảng 1,2 giây) */
  var SETTLE_MIN = 160;  /* đợi tối thiểu trước khi đo lại sau một thay đổi của lõi (nút nhả trạng thái bấm...) */
  var SETTLE_MAX = 1800; /* nhưng không đợi chuyển động của nội dung lâu hơn mức này */
  var SETTLE_BLIND = 750; /* trình duyệt cũ không liệt kê được animation: đợi cố định chừng này */

  /* Vị trí ngang của hai bạn, tính bằng em, y hệt công thức trong margin-bears.css
     (.margin-bears__bear--a / --b và trang gặp nhau). Dùng để biết trang trước hai bạn
     đứng ở đâu, cho cú nhảy xuất phát từ chỗ cũ. Sửa CSS thì sửa cả ở đây. */
  function posA(t, meet, half) { return meet ? half - 1.432 : 1.55 + (half - 4.462) * t; }
  function posB(t, meet, half) { return meet ? half - 1.432 : 1.75 + (half - 4.662) * t; }

  /* Gấu không bao giờ được đứng đè lên thứ người đọc NHÌN THẤY trong trang: chữ, nền màu,
     viền, ảnh, hình vẽ. Không dựa vào danh sách class hay thẻ, vì tính năng khác có thể thêm
     trang với nội dung bất kỳ (ví dụ một thẻ <div> có nền, chữ nằm trong <span>).
     Cũng không lấy cả hộp của nút trong suốt: nút "Để nghĩ đã…" chỉ là dòng chữ gạch chân
     nhưng hộp bấm cao 44px; khi lõi xoay + dời nút đi, hộp nghiêng đó (tính theo trục ngang
     dọc) lấn xuống tận đầu gấu dù chữ còn cách cả chục px. Nên chỉ đo phần "mực":
     - phần tử có nền, viền, đổ bóng, hoặc là ảnh / hình vẽ: cả hộp của nó;
     - còn lại: đúng các dòng chữ của riêng nó (Range trên từng nút chữ).
     Thêm vào đó, các khối nội dung quen thuộc của sách được đo theo bố cục gốc (không tính
     transform đang chạy), để gấu cũng không lấn vào hộp của chúng.
     Lấp lánh trang trí (.spark) và số trang thì không tính. */
  var BLOCKS = '.title, .text, .btn, .info, .count, .polaroid, .page__cta';
  var SOLID_TAGS = /^(img|svg|video|canvas|picture|iframe|object|embed|input|textarea|select|meter|progress|hr)$/;
  var SIDES = ['Top', 'Right', 'Bottom', 'Left'];

  /* Màu trong suốt hẳn (trình duyệt trả về dạng rgba(..., 0) hoặc 'transparent') */
  function clear(col) {
    return !col || col === 'transparent' || /^rgba\(.*,\s*0(?:\.0*)?\)$/.test(col);
  }

  /* Phần tử tự vẽ ra thứ gì đó trên giấy (không tính chữ bên trong nó) */
  function solid(node, cs) {
    if (SOLID_TAGS.test(String(node.tagName).toLowerCase())) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    if (!clear(cs.backgroundColor)) return true;
    if (cs.boxShadow && cs.boxShadow !== 'none') return true;
    for (var k = 0; k < SIDES.length; k++) {
      var sd = SIDES[k];
      if (parseFloat(cs['border' + sd + 'Width']) > 0 && cs['border' + sd + 'Style'] !== 'none' &&
        !clear(cs['border' + sd + 'Color'])) return true;
    }
    return false;
  }

  var HEART = 'M12 21.2c-.4 0-.8-.1-1.1-.4C6.1 17 2 13.4 2 8.9 2 6 4.2 3.8 7 3.8c1.9 0 3.6 1 5 2.9 1.4-1.9 3.1-2.9 5-2.9 2.8 0 5 2.2 5 5.1 0 4.5-4.1 8.1-8.9 11.9-.3.3-.7.4-1.1.4z';

  /* Vẽ một cái đầu gấu trong khung 34 x 36 (x từ 3 tới 37, đầu gấu chiếm gần hết bề ngang).
     shift: mặt lệch về phía bạn kia một chút, nhìn như hai bạn đang ngó nhau.
     Chỉ dùng chuỗi cố định trong file này, không có chữ nào từ config. */
  function bearSvg(o) {
    var s = o.shift;
    function x(n) { return String(Math.round((n + s) * 10) / 10); }

    var svg = '<svg class="margin-bears__svg" viewBox="3 0 34 36" focusable="false">' +
      /* hai tai */
      '<circle cx="8.6" cy="14" r="5.6" fill="' + o.ear + '"/><circle cx="8.6" cy="14" r="2.7" fill="#FFC9D4"/>' +
      '<circle cx="31.4" cy="14" r="5.6" fill="' + o.ear + '"/><circle cx="31.4" cy="14" r="2.7" fill="#FFC9D4"/>' +
      /* đầu */
      '<ellipse cx="20" cy="23.4" rx="16.4" ry="12.2" fill="' + o.head + '"/>' +
      /* má hồng */
      '<g class="margin-bears__cheeks" fill="#FF9FB5">' +
        '<ellipse cx="' + x(9.9) + '" cy="27.7" rx="3" ry="1.9"/>' +
        '<ellipse cx="' + x(30.1) + '" cy="27.7" rx="3" ry="1.9"/>' +
      '</g>' +
      /* mắt mở */
      '<g class="margin-bears__eyes">' +
        '<circle cx="' + x(13.6) + '" cy="23.8" r="2.15" fill="#43384C"/><circle cx="' + x(13) + '" cy="23.1" r=".8" fill="#fff"/>' +
        '<circle cx="' + x(26.4) + '" cy="23.8" r="2.15" fill="#43384C"/><circle cx="' + x(25.8) + '" cy="23.1" r=".8" fill="#fff"/>' +
      '</g>' +
      /* mắt cười (chỉ hiện sau khi người nhận đồng ý) */
      '<path class="margin-bears__eyes-happy" fill="none" stroke="#43384C" stroke-width="1.5" stroke-linecap="round" d="' +
        'M' + x(11.2) + ' 24.7q2.4-3.4 4.8 0M' + x(24) + ' 24.7q2.4-3.4 4.8 0"/>' +
      /* mõm, mũi, miệng */
      '<ellipse cx="' + x(20) + '" cy="28.5" rx="5" ry="3.7" fill="' + o.muzzle + '"/>' +
      '<ellipse cx="' + x(20) + '" cy="27" rx="1.7" ry="1.2" fill="#5B4A4A"/>' +
      '<path fill="none" stroke="#5B4A4A" stroke-width=".75" stroke-linecap="round" stroke-linejoin="round" d="' +
        'M' + x(20) + ' 28.1v1.1m0 0c-.6 1.1-2 1.1-2.6.3m2.6-.3c.6 1.1 2 1.1 2.6.3"/>';

    /* Mũ cử nhân tí hon, tua vàng rủ bên phải như bạn gấu lớn.
       Cả cuốn sách đổi theo hai trạng thái chung (class trên <html>, xem margin-bears.css):
       - tassel-turned: tua sang bên trái. Vẽ sẵn cả hai bên (đối xứng qua nút mũ x = 20)
         rồi chỉ đổi cái nào hiện, thay vì lật bằng transform: transform-box / transform-origin
         trên phần tử SVG mỗi trình duyệt cũ hiểu một kiểu, còn ẩn hiện thì đâu cũng giống nhau;
       - diploma-done: gấu nâu cũng được đội mũ (mũ có sẵn nhưng ẩn), kẹp tim thì cất đi. */
    svg += '<g class="margin-bears__cap' + (o.cap ? '' : ' margin-bears__cap--later') + '">' +
        '<path d="M11.6 11.3c5.4-2.5 11.4-2.5 16.8 0v3.7c-5.4-2.3-11.4-2.3-16.8 0z" fill="#5E5270"/>' +
        '<path d="M20 2.5l15.2 5.3L20 13.1 4.8 7.8z" fill="#4A3F55" stroke="#4A3F55" stroke-width="1.1" stroke-linejoin="round"/>' +
        '<g class="margin-bears__tassel" fill="#F6C453">' +
          '<path d="M20 7.8l11.5 1v4.6" fill="none" stroke="#F6C453" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<rect x="30.2" y="12.9" width="2.6" height="3.9" rx=".9"/>' +
        '</g>' +
        '<g class="margin-bears__tassel margin-bears__tassel--turned" fill="#F6C453">' +
          '<path d="M20 7.8l-11.5 1v4.6" fill="none" stroke="#F6C453" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<rect x="7.2" y="12.9" width="2.6" height="3.9" rx=".9"/>' +
        '</g>' +
        '<circle cx="20" cy="7.8" r="1.25" fill="#F6C453"/>' +
      '</g>';
    if (!o.cap) {
      /* kẹp tóc trái tim cài bên tai (cất đi khi gấu nâu đã đội mũ) */
      svg += '<g class="margin-bears__clip"><path transform="translate(26.4 4.6) rotate(14 4.6 4.6) scale(.39)" fill="#FF6F96" d="' + HEART + '"/></g>';
    }

    return svg + '</svg>';
  }

  /* Vệt gió kiểu truyện tranh phía sau lưng mỗi bạn: chỉ loé lên lúc nhảy,
     cho thấy hai bạn vừa "chạy" lại gần nhau. Gấu trái vệt ở bên trái, gấu phải ở bên phải. */
  var ZIP_A = '<svg class="margin-bears__zip" viewBox="0 0 10 12" focusable="false">' +
    '<path d="M9 2.5H3.5M9.5 6.5H1M9 10.5H4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var ZIP_B = '<svg class="margin-bears__zip" viewBox="0 0 10 12" focusable="false">' +
    '<path d="M1 2.5H6.5M.5 6.5H9M1 10.5H5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  var BEAR_A = bearSvg({ head: '#F1CBA5', ear: '#E9BC93', muzzle: '#FFF3E4', cap: true, shift: 1 });
  var BEAR_B = bearSvg({ head: '#BA8B6A', ear: '#A9795B', muzzle: '#F7E6D5', cap: false, shift: -1 });

  function isCover(page) {
    return page.classList.contains('page--cover') || page.classList.contains('page--back');
  }

  /* Người gửi không rành máy có thể viết heart: 'false' hay 0 thay cho false: đều hiểu là tắt.
     Mọi giá trị khác (kể cả thiếu) là bật. */
  function heartWanted(opts) {
    if (!opts || typeof opts !== 'object') return true;
    var v = opts.heart;
    if (v === false || v === 0) return false;
    if (typeof v === 'string' && /^(false|0|no|off|không|khong)$/i.test(v.replace(/^\s+|\s+$/g, ''))) return false;
    return true;
  }

  /* Dựng phần tử trang trí cho một trang.
     t: 0 = đứng ở hai góc, 1 = sát hai bên số trang. meet = trang gặp nhau. */
  function build(t, meet, withHeart) {
    var el = doc.createElement('div');
    el.className = 'margin-bears' + (meet ? ' margin-bears--meet' : '');
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--t', String(Math.round(t * 10000) / 10000));

    var html =
      '<span class="margin-bears__bear margin-bears__bear--a">' + ZIP_A + BEAR_A + '</span>' +
      '<span class="margin-bears__bear margin-bears__bear--b">' + ZIP_B + BEAR_B + '</span>';
    if (meet) {
      /* Hai đốm lấp lánh chỉ hiện khi người nhận đã đồng ý (phần thưởng cuối) */
      html += '<span class="margin-bears__spark margin-bears__spark--l"><svg focusable="false"><use href="#i-sparkle"/></svg></span>' +
        '<span class="margin-bears__spark margin-bears__spark--r"><svg focusable="false"><use href="#i-sparkle"/></svg></span>';
    }
    if (meet && withHeart) {
      /* data-reveal: trái tim chỉ hiện ra khi trang gặp nhau được mở lần đầu.
         Lớp giữa (__heart-in) lo việc phóng to sau khi đồng ý, để không giành transform
         với hiệu ứng hiện ra của data-reveal hay nhịp đập của svg bên trong. */
      html += '<span class="margin-bears__heart" data-reveal style="--i:5">' +
        '<span class="margin-bears__heart-in"><svg focusable="false"><use href="#i-heart"/></svg></span></span>';
    }
    el.innerHTML = html;
    return el;
  }

  function hit(a, b) {
    return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  }

  /* Khung hình kế tiếp (máy quá cũ không có requestAnimationFrame thì dùng hẹn giờ 16 ms) */
  function nextFrame(fn) {
    if (window.requestAnimationFrame) window.requestAnimationFrame(fn);
    else setTimeout(fn, 16);
  }

  /* Còn bao nhiêu mili giây nữa thì nội dung trang thôi chuyển động (chỉ tính animation
     và transition có hồi kết, của lõi hay tính năng khác, không tính đôi gấu của mình).
     Nhịp nhún vô tận của nút "Mình sẽ đến!" không có hồi kết nên bỏ qua.
     Trả về -1 khi trình duyệt không cho liệt kê. */
  function busyMs(it) {
    if (!it.inner.getAnimations) return -1;
    var most = 0;
    it.inner.getAnimations({ subtree: true }).forEach(function (a) {
      var target = a.effect && a.effect.target;
      if (!target || target.nodeType !== 1 || it.el.contains(target)) return;
      if (a.playState !== 'running' || !a.effect.getComputedTiming) return;
      var end = a.effect.getComputedTiming().endTime;
      if (typeof end !== 'number' || !isFinite(end)) return;
      var left = end - (a.currentTime || 0);
      if (left > most) most = left;
    });
    return most;
  }

  (Invite.features = Invite.features || []).push({
    name: 'margin-bears',

    /* Làm ở ready vì lúc này danh sách trang mới là cuối cùng
       (tính năng khác có thể đã thêm trang trong setup). */
    ready: function (ctx) {
      var book = ctx.book;
      if (!book || !book.pages || !book.pages.length) return;

      var withHeart = heartWanted(ctx.get('marginBears'));

      /* Các trang giấy: từ sau bìa trước tới hết trang lời mời cuối.
         Không có trang lời mời cuối thì lấy mọi trang giấy, gặp nhau ở trang chót. */
      var pages = book.pages;
      var rsvp = ctx.pageIndex('.page--rsvp');
      var last = rsvp >= 0 ? rsvp : pages.length - 1;
      var items = [];
      var i;

      for (i = 0; i <= last && i < pages.length; i++) {
        var page = pages[i];
        if (!page || !page.classList || isCover(page)) continue;
        var inner = ctx.qs('.page__inner', page);
        if (!inner) continue;
        items.push({ page: page, inner: inner, el: null });
      }

      var n = items.length;
      if (!n) return;

      for (i = 0; i < n; i++) {
        var it = items[i];
        var meet = i === n - 1;
        /* Các trang trước chia đều quãng đường từ góc tới sát số trang;
           riêng trang cuối hai bạn nhảy hẳn vào giữa, thế chỗ số trang. */
        var t = meet ? 1 : (n > 2 ? i / (n - 2) : 0);

        /* Phòng khi ready bị gọi lại: gỡ đôi gấu cũ để mỗi trang chỉ có một */
        ctx.qsa('.margin-bears', it.inner).forEach(function (old) {
          if (old.parentNode) old.parentNode.removeChild(old);
        });

        it.k = i;
        it.t = t;
        it.meet = meet;
        it.el = build(t, meet, withHeart);
        it.inner.appendChild(it.el);

        /* Class trên .page thì thư viện lật trang giữ nguyên (style thì không) */
        it.page.classList.add('margin-bears-page');
        if (meet) it.page.classList.add('margin-bears-page--meet');
        else it.page.classList.remove('margin-bears-page--meet');
      }

      var meetItem = items[n - 1];
      var meetEl = meetItem.el;
      if (typeof ctx.saidYes === 'function' && ctx.saidYes()) meetEl.classList.add('margin-bears--happy');

      function findItem(page) {
        for (var k = 0; k < items.length; k++) {
          if (items[k].page === page) return items[k];
        }
        return null;
      }

      /* ----- Sách quá nhỏ: cất đôi gấu đi -----
         Màn hình thấp (thanh công cụ của Zalo, Messenger chiếm chỗ) làm sách nhỏ lại,
         lúc đó lề dưới chật tới mức hai bạn sẽ chen vào số trang và chữ. */
      function checkTiny() {
        var w = ctx.stageEl ? ctx.stageEl.getBoundingClientRect().width : 0;
        root.classList.toggle('margin-bears-tiny', w > 0 && w < TINY_PX);
      }

      /* ----- Không bao giờ đứng đè lên nội dung -----
         Trang do tính năng khác thêm vào có thể có nội dung chạm xuống tận lề dưới.
         Đo hộp của hai bạn (theo bố cục, bỏ qua lúc đang nhảy) so với từng khối nội dung:
         - đè ngay cả khi đứng yên: cất đôi gấu của trang đó đi (--shy);
         - phía trên còn trống bao nhiêu thì nhảy cao bấy nhiêu (biến --mb-lift ghi lên
           phần tử của mình); trống quá ít thì nhún tại chỗ (--low).
         Chỉ đo được trang đang hiển thị (trang ẩn có kích thước 0). Trả về false khi chưa đo được. */
      function measure(it) {
        var el = it.el;
        var inner = it.inner;
        var band = el.getBoundingClientRect();
        if (!band.width || !band.height || root.classList.contains('margin-bears-tiny')) return false;
        var ir = inner.getBoundingClientRect();
        /* Sách có thể bị thu phóng bằng transform: quy đổi toạ độ bố cục ra toạ độ màn hình */
        var s = ir.width / (inner.offsetWidth || ir.width);
        var em = (parseFloat(window.getComputedStyle(el).fontSize) || 16) * s;

        /* Hộp theo bố cục (không tính transform đang chạy), đổi ra toạ độ màn hình.
           Cộng dồn offsetLeft/Top tới .page__inner (nó là position: absolute nên luôn là mốc). */
        function layout(node) {
          var x = 0;
          var y = 0;
          var w = node.offsetWidth;
          var h = node.offsetHeight;
          while (node && node !== inner) {
            x += node.offsetLeft;
            y += node.offsetTop;
            node = node.offsetParent;
          }
          if (node !== inner) return null;
          return { l: ir.left + x * s, t: ir.top + y * s, r: ir.left + (x + w) * s, b: ir.top + (y + h) * s };
        }

        var parts = [];
        ctx.qsa('.margin-bears__bear, .margin-bears__heart', el).forEach(function (p) {
          var b = layout(p);
          if (!b) return;
          b.bear = p.classList.contains('margin-bears__bear');
          /* Đường đi của cú nhảy: từ chỗ đứng ở trang trước (lệch ra phía ngoài) tới chỗ mới */
          b.path = { l: b.l, t: b.t, r: b.r, b: b.b };
          if (p.classList.contains('margin-bears__bear--a')) b.path.l -= (it.stepA || 0) * em;
          if (p.classList.contains('margin-bears__bear--b')) b.path.r += (it.stepB || 0) * em;
          parts.push(b);
        });

        var shy = false;
        var blocked = false;   /* có thứ chắn ngang đường đi: nhảy tại chỗ thôi */
        var room = Infinity;   /* khoảng trống (px màn hình) giữa đỉnh đầu gấu và thứ thấp nhất ngay phía trên */
        var restRoom = Infinity;

        /* Khối data-reveal lúc chưa hiện (hoặc đang hiện dở) bị đẩy xuống 14px.
           Trừ đi độ lệch đó bằng cách so tâm hộp thật với tâm hộp bố cục của khối,
           nhưng vẫn giữ transform riêng của nội dung (ví dụ nút đồng ý to dần,
           nút từ chối xoay đi). Mỗi khối chỉ tính một lần cho mỗi lần đo. */
        var shifts = [];
        function revealShift(node) {
          var rv = node.closest('[data-reveal]');
          if (!rv || rv === inner || !inner.contains(rv)) return null;
          for (var k = 0; k < shifts.length; k++) if (shifts[k].rv === rv) return shifts[k];
          var lb = layout(rv);
          var vr = rv.getBoundingClientRect();
          var sh = { rv: rv, dx: 0, dy: 0 };
          if (lb) {
            sh.dx = (vr.left + vr.right - lb.l - lb.r) / 2;
            sh.dy = (vr.top + vr.bottom - lb.t - lb.b) / 2;
          }
          shifts.push(sh);
          return sh;
        }

        /* Phần nằm ngoài một khung overflow: hidden thì người đọc không nhìn thấy, không phải
           "mực". Ví dụ: đầu gấu trong khung tròn của tin nhắn thoại là một hình vẽ to hơn
           khung (phóng 144% rồi đẩy lên), hộp của nó thò xuống dưới khung tròn cả chục px
           dù phần thò ra đã bị cắt. Lấy giao của các khung cắt phía trên phần tử.
           withSelf: chữ bên trong phần tử còn bị chính phần tử cắt (nhãn có dấu "…").
           Phần tử position: absolute chỉ bị cắt bởi khung nào là mốc định vị của nó (hoặc
           nằm ngoài mốc đó); position: fixed thì thoát hết. Không chắc thì không cắt
           (tính dư mực thì gấu chỉ lánh đi, không bao giờ đè lên chữ). */
        function clipOf(node, withSelf) {
          var box = null;
          var abs = false;
          for (var cur = node; cur && cur !== inner; cur = cur.parentElement) {
            var cs = window.getComputedStyle(cur);
            var self = cur === node;
            /* khung có định vị (hoặc transform) là mốc của con cháu absolute: nó cắt được chúng */
            if (!self && (cs.position !== 'static' || (cs.transform && cs.transform !== 'none'))) abs = false;
            if (!self || withSelf) {
              var ox = cs.overflowX !== 'visible';
              var oy = cs.overflowY !== 'visible';
              if ((self || !abs) && (ox || oy)) {
                var cr = cur.getBoundingClientRect();
                if (!box) box = { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };
                if (ox) { box.l = Math.max(box.l, cr.left); box.r = Math.min(box.r, cr.right); }
                if (oy) { box.t = Math.max(box.t, cr.top); box.b = Math.min(box.b, cr.bottom); }
              }
            }
            if (cs.position === 'fixed') break;
            if (cs.position === 'absolute') abs = true;
          }
          return box;
        }

        /* So một mảnh "mực" với từng phần của đôi gấu */
        function consider(r, edge, sh, clip) {
          if (shy || !r.width || !r.height) return;
          var box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
          if (clip) {
            box = { l: Math.max(box.l, clip.l), t: Math.max(box.t, clip.t), r: Math.min(box.r, clip.r), b: Math.min(box.b, clip.b) };
            if (box.r <= box.l || box.b <= box.t) return;
          }
          if (sh) box = { l: box.l - sh.dx, t: box.t - sh.dy, r: box.r - sh.dx, b: box.b - sh.dy };
          for (var k = 0; k < parts.length; k++) {
            var p = parts[k];
            if (hit(p, box)) { shy = true; return; }
            if (p.bear && hit(p.path, box)) blocked = true;
            /* chỉ xét thứ nằm ngay phía trên đường đi của cái đầu (trùng bề ngang) */
            var q = p.path;
            if (p.bear && box.l < q.r && box.r > q.l && box.t < q.t) {
              room = Math.min(room, q.t - box.b - edge);
            }
            /* riêng chỗ đứng (không tính đường đi), để thu cụm gấu ở trang gặp nhau */
            if (p.bear && box.l < p.r && box.r > p.l && box.t < p.t) {
              restRoom = Math.min(restRoom, p.t - box.b - edge);
            }
          }
        }

        var range = doc.createRange ? doc.createRange() : null;
        var all = inner.getElementsByTagName('*');
        for (var n = 0; n < all.length && !shy; n++) {
          var c = all[n];
          /* phần bên trong một hình vẽ thì hình vẽ ngoài cùng đã đại diện rồi */
          if (c.ownerSVGElement || el.contains(c) || c.closest('.page__num, .spark')) continue;
          var tag = String(c.tagName).toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'template') continue;
          var cs = window.getComputedStyle(c);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          /* Nút kiểu .btn có gờ nổi màu đậm ngay dưới đáy (box-shadow, không nằm trong hộp):
             nhảy lên đụng gờ đó cũng là đụng nút */
          var edge = 0;
          var btn = c.closest('.btn');
          if (btn) edge = 0.3 * (parseFloat(window.getComputedStyle(btn).fontSize) || 16) * s;
          var sh = revealShift(c);
          var rects;
          var j;
          var clip;
          if (solid(c, cs)) {
            /* chữ nằm cả trong hộp này rồi; phần tử inline xuống dòng thì lấy từng dòng */
            rects = c.getClientRects();
            clip = rects.length ? clipOf(c, false) : null;
            for (j = 0; j < rects.length; j++) consider(rects[j], edge, sh, clip);
            continue;
          }
          clip = undefined;
          for (var t = c.firstChild; t && !shy; t = t.nextSibling) {
            if (t.nodeType !== 3 || !/\S/.test(t.nodeValue)) continue;
            if (clip === undefined) clip = clipOf(c, true);
            if (!range) {
              /* máy rất cũ không có Range: lấy cả hộp của phần tử chứa chữ */
              rects = c.getClientRects();
            } else {
              range.selectNodeContents(t);
              rects = range.getClientRects();
            }
            for (j = 0; j < rects.length; j++) consider(rects[j], edge, sh, clip);
            if (!range) break;
          }
        }

        /* Các khối nội dung quen thuộc: đo theo bố cục gốc (bỏ qua transform của lõi,
           kể cả độ lệch lúc chưa hiện), chỉ để quyết định có phải lánh đi hay không */
        if (!shy) {
          ctx.qsa(BLOCKS, inner).forEach(function (c) {
            if (shy || el.contains(c) || c.hidden) return;
            var cs = window.getComputedStyle(c);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            var b = layout(c);
            if (!b || b.r <= b.l || b.b <= b.t) return;
            for (var k = 0; k < parts.length; k++) {
              if (hit(parts[k], b)) { shy = true; return; }
            }
          });
        }

        if (blocked) {
          it.stepA = 0;
          it.stepB = 0;
        }
        applyStep(it);

        /* Độ cao cú nhảy (em): chỗ trống trừ phần vươn người lúc ở đỉnh và 2px cho thoáng */
        var lift = Math.min(HOP_MAX_EM, (room - 2) / em - REACH_EM);
        var low = !shy && lift < HOP_MIN_EM;

        el.classList.toggle('margin-bears--shy', shy);
        el.classList.toggle('margin-bears--low', low);
        if (shy || low || lift >= HOP_MAX_EM) el.style.removeProperty('--mb-lift');
        else el.style.setProperty('--mb-lift', (Math.floor(lift * 100) / 100) + 'em');

        /* Trang gặp nhau: nút "Mình sẽ đến!" (nhất là sau khi đồng ý, nút từ chối biến mất
           và nút đồng ý dời xuống) có thể nằm sát ngay trên chóp mũ, gờ nút chạm đầu gấu nhìn
           rất chật. Khi đó thu cả cụm nhỏ lại một chút quanh chỗ cằm tựa (tối đa còn FIT_MIN)
           để luôn chừa 2px thoáng dưới gờ nút. */
        if (it.meet) {
          var fit = 1;
          var bear = null;
          for (var q = 0; q < parts.length; q++) if (parts[q].bear) bear = parts[q];
          if (!shy && bear && restRoom < Infinity) {
            var bh = bear.b - bear.t;
            var visible = bh * (1 - CAP_GAP);      /* chóp mũ nằm hơi thấp hơn mép trên khung vẽ */
            var avail = restRoom + visible - 2;
            if (avail < visible) fit = Math.max(FIT_MIN, avail / visible);
          }
          if (fit < 0.995) el.style.setProperty('--mb-fit', String(Math.floor(fit * 1000) / 1000));
          else el.style.removeProperty('--mb-fit');
        }
        /* Trang gặp nhau mà phải cất gấu thì trả lại số trang cho trang đó */
        it.page.classList.toggle('margin-bears-page--shy', shy);
        return true;
      }

      /* Ghi quãng đường cú nhảy lên phần tử của mình (bản sao lúc lật trang mang theo luôn) */
      function applyStep(it) {
        var a = it.stepA || 0;
        var b = it.stepB || 0;
        it.el.style.setProperty('--mb-step-a', (Math.round(a * 1000) / 1000) + 'em');
        it.el.style.setProperty('--mb-step-b', (Math.round(b * 1000) / 1000) + 'em');
        it.el.classList.toggle('margin-bears--still', !a && !b);
      }

      function measureVisible() {
        for (var k = 0; k < items.length; k++) measure(items[k]);
      }

      /* Lõi vừa đổi nội dung (nút to ra, nút từ chối biến mất, chữ hiện dần...):
         KHÔNG quyết định lúc mọi thứ còn đang chạy, vì hộp đo được lúc đó không phải chỗ
         nội dung sẽ đứng. Đợi nội dung đứng yên (tối đa SETTLE_MAX) rồi mới đo. */
      function settle(it) {
        var started = Date.now();
        var rounds = 0;
        function step() {
          try {
            var left = busyMs(it);
            if (left > 0 && rounds < 4 && Date.now() - started < SETTLE_MAX) {
              rounds++;
              setTimeout(step, Math.min(left, SETTLE_MAX) + 40);
              return;
            }
            measure(it);
          } catch (e) {}
        }
        setTimeout(step, it.inner.getAnimations ? SETTLE_MIN : SETTLE_BLIND);
      }

      /* Thư viện lật trang báo "đã sang trang" có khi trước cả lúc vẽ trang đó ra
         (trang còn display: none, kích thước 0). Đợi tới khi trang có kích thước và đứng yên
         hai khung hình liền rồi mới gọi fn, để đo và nhảy đúng lúc người đọc nhìn thấy.
         Có lật trang khác giữa chừng (ticket đổi) thì thôi. */
      var ticket = 0;

      function whenSized(it, fn) {
        var mine = ticket;
        var frames = 0;
        var last = null;
        function attempt() {
          try {
            if (mine !== ticket) return;
            var r = it.el.getBoundingClientRect();
            var now = r.width && r.height ? r.left + ',' + r.top + ',' + r.width : null;
            var ready = now !== null && now === last;
            last = now;
            if (ready || root.classList.contains('margin-bears-tiny') || ++frames > SIZE_FRAMES) {
              fn();
              return;
            }
            nextFrame(attempt);
          } catch (e) {}
        }
        attempt();
      }

      function stop(el) {
        if (el._mbTimer) {
          clearTimeout(el._mbTimer);
          el._mbTimer = null;
        }
        el.classList.remove('margin-bears--hop');
        el.classList.remove('margin-bears--joy');
      }

      /* Chạy một animation CSS bằng class rồi tự gỡ class.
         Gỡ để bản sao của trang (tạo ra lúc lật) không nhảy lại lần nữa.
         Giảm chuyển động thì không đụng gì cả: hai bạn đứng yên. */
      function play(el, cls, ms) {
        if (!el || ctx.reduce) return;
        stop(el);
        ctx.replay(el, cls);
        el._mbTimer = setTimeout(function () {
          try {
            el._mbTimer = null;
            el.classList.remove(cls);
          } catch (e) {}
        }, ms);
      }

      /* Chỉ đôi gấu ở trang đang đọc mới "thức" (chớp mắt, tim đập). Ở chế độ dự phòng
         mọi trang đều nằm sẵn trên màn hình, không nên để cả chục đôi cùng chuyển động. */
      var awake = null;

      function wake(el) {
        if (awake && awake !== el) awake.classList.remove('margin-bears--awake');
        awake = el;
        if (el && !ctx.reduce) el.classList.add('margin-bears--awake');
      }

      checkTiny();

      /* Sách vừa hiện: đo hết các trang đang bày ra (chế độ cuộn thì là tất cả) */
      ctx.on('start', function () {
        try { checkTiny(); measureVisible(); } catch (e) {}
      });

      /* Trang vừa mở: đợi trang thật sự được vẽ ra, đo (chữ có thể đã được thu nhỏ cho
         vừa trang), rồi hai bạn nhảy một cái, kiểu "tới nơi rồi nè". Khi chữ đã hiện xong
         thì đo lại lần nữa cho chắc. */
      /* Đọc xuôi sang trang mới: hai bạn xuất phát từ chỗ đứng ở trang trước rồi nhảy
         (hoặc lướt, nếu phía trên chật) tới chỗ mới, thấy rõ "lại gần thêm một bước".
         Lật ngược hay mở trang đầu thì nhảy tại chỗ, không có vệt gió (--still).
         Quãng đường (em) để ở it.stepA / it.stepB; measure() kiểm tra đường đi có vướng gì
         không rồi ghi thành biến --mb-step-a / --mb-step-b trên phần tử của mình. */
      function computeStep(it, forward) {
        var el = it.el;
        var prev = forward && it.k > 0 ? items[it.k - 1] : null;
        var a = 0;
        var b = 0;
        if (prev) {
          /* Mỗi trang có thể có cỡ chữ riêng (lõi tự thu nhỏ chữ cho vừa trang) nên tính
             theo px: bề ngang trang như nhau, còn cỡ chữ của trang trước đọc từ chính trang đó
             (getComputedStyle vẫn đọc được khi trang đang ẩn). */
          var em = parseFloat(window.getComputedStyle(el).fontSize) || 16;
          var emPrev = parseFloat(window.getComputedStyle(prev.el).fontSize) || em;
          var halfPx = el.offsetWidth / 2;
          a = (posA(it.t, it.meet, halfPx / em) * em - posA(prev.t, prev.meet, halfPx / emPrev) * emPrev) / em;
          b = (posB(it.t, it.meet, halfPx / em) * em - posB(prev.t, prev.meet, halfPx / emPrev) * emPrev) / em;
          /* chỉ đi tới (lại gần nhau), không bao giờ lùi */
          a = a > 0.05 ? Math.min(a, 8) : 0;
          b = b > 0.05 ? Math.min(b, 8) : 0;
        }
        it.stepA = a;
        it.stepB = b;
      }

      var lastIndex = -1;

      ctx.on('shown', function (d) {
        try {
          var it = d && d.page ? findItem(d.page) : null;
          var forward = d && typeof d.index === 'number' ? d.index > lastIndex : true;
          if (d && typeof d.index === 'number') lastIndex = d.index;
          ticket++;
          wake(it ? it.el : null);
          if (!it) return;
          stop(it.el);
          whenSized(it, function () {
            computeStep(it, forward);
            if (!measure(it)) applyStep(it);
            play(it.el, 'margin-bears--hop', HOP_MS);
            settle(it);
          });
        } catch (e) {}
      });

      /* Bắt đầu lật trang khác: thôi nhảy để trang đang lật không nhảy dở.
         Thư viện có thể đã kịp nhân bản trang (kèm class đang nhảy) trước khi báo
         sự kiện này, nên gỡ class trên cả các bản sao đang nằm trong sách. */
      ctx.on('turn', function () {
        try {
          ticket++;
          for (var k = 0; k < items.length; k++) stop(items[k].el);
          ctx.qsa('.margin-bears--hop, .margin-bears--joy', ctx.bookEl).forEach(function (copy) {
            copy.classList.remove('margin-bears--hop');
            copy.classList.remove('margin-bears--joy');
          });
        } catch (e) {}
      });

      /* Người nhận đồng ý: đôi gấu đang chạm má cười tít mắt, nghiêng sát vào nhau,
         trái tim to hơn một chút, hai đốm lấp lánh, rồi nhảy (hoặc dụi má) ăn mừng.
         Không đo ngay lúc này: nút "Mình sẽ đến!" vừa đổi chữ, đang nhả trạng thái bấm và
         thu từ cỡ phóng to về cỡ thường, nút từ chối vừa biến mất. Đo lúc đó sẽ tưởng nút
         đè lên gấu và giấu mất phần thưởng. Giữ nguyên trạng thái cũ, đợi nút đứng yên rồi đo. */
      ctx.on('rsvp-yes', function () {
        try {
          meetEl.classList.add('margin-bears--happy');
          /* ăn mừng tại chỗ: hai bạn đã đứng cạnh nhau rồi */
          meetItem.stepA = 0;
          meetItem.stepB = 0;
          applyStep(meetItem);
          play(meetEl, 'margin-bears--joy', JOY_MS);
          settle(meetItem);
        } catch (e) {}
      });

      /* Nút từ chối chạy trốn / biến mất, nút đồng ý to ra: đợi yên rồi đo lại trang gặp nhau */
      ctx.on('rsvp-no', function () {
        try { settle(meetItem); } catch (e) {}
      });

      /* Xoay máy, đổi cỡ cửa sổ: lõi đo lại cỡ chữ sau 180 ms, mình đo sau đó */
      var resizeTimer = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          try { checkTiny(); measureVisible(); } catch (e) {}
        }, 320);
      });

      /* Font về muộn làm chữ dài ra: đo lại trang đang đọc */
      if (doc.fonts && doc.fonts.addEventListener) {
        doc.fonts.addEventListener('loadingdone', function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            try { measureVisible(); } catch (e) {}
          }, 320);
        });
      }
    }
  });
})();
