/* =====================================================================
   diploma.js - trang "Bằng danh dự" trao cho người nhận thư

   Lễ tốt nghiệp là của người gửi, nhưng người thương cũng xứng đáng có một
   tấm bằng vì đã đồng hành qua mọi mùa thi. Trang này nằm ngay trước lời mời cuối:
     A. Bạn gấu ôm một cuộn giấy buộc nơ. Chạm vào thì cuộn giấy mở ra.
     B. Tấm bằng có tên người nhận và bảng điểm. Chạm từng dòng để đóng dấu 10.
        Đủ dấu thì con dấu vàng rơi xuống, hiện xếp loại và chữ ký người gửi.
   Sau đó bạn gấu nâu ở mọi trang cũng được đội mũ cử nhân (class diploma-done trên <html>).

   Trạng thái nằm ở class trên trang (diploma--open, diploma--s1/s2/s3, diploma--done)
   vì thư viện lật trang nhân bản trang khi lật: bản sao phải đúng mà không cần JS.
   Chữ lấy từ config.js, mục "diploma"; thiếu mục nào thì dùng câu mặc định bên dưới.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;
  var root = doc.documentElement;

  var DEFAULTS = {
    lead: 'Khoan đã, còn một tấm bằng nữa…',
    hint: 'Chạm để mở',
    heading: 'BẰNG DANH DỰ',
    awardedTo: 'Trao cho',
    /* Không ghi "xuất sắc" ở đây vì dòng xếp loại bên dưới đã nói "Xuất sắc", lặp lại nghe vụng */
    line: 'đã hoàn thành khoá học',
    course: 'Đồng hành cùng {from}',
    subjects: ['Kiên nhẫn nghe than thở', 'Tiếp sức mùa thi', 'Luôn ở bên'],
    grade: 'Xếp loại: Xuất sắc',
    sign: '{from}',
    stampHint: 'Chạm từng dòng để chấm điểm nhé'
  };

  /* Không có tên người gửi thì "Đồng hành cùng {from}" sẽ cụt lủn, nên đổi sang câu này */
  var COURSE_NO_NAME = 'Đồng hành cùng nhau';
  var MAX_ROWS = 3;

  /* Thời gian (ms) tấm chắn chống chạm đúp còn hiện sau khi mở cuộn giấy.
     Có chuyển động: suốt lúc giấy nở (giống thời lượng class diploma--unrolling).
     Giảm chuyển động: tấm bằng hiện ngay, chỉ cần đủ dài để nuốt cú chạm thứ hai của một lần chạm đúp. */
  var OPENING_MS = 1100;
  var OPENING_MS_CALM = 600;
  /* Chế độ giảm chuyển động: tấm bằng hiện ra ngay khi chạm. Cú chạm tới trong vòng ngần này (ms)
     thì chắc chắn chưa phải phản ứng với tấm bằng (mắt người cần khoảng 200 ms mới kịp thấy và bấm),
     mà là ngón thứ hai của một lần chạm đúp: nuốt đi. Chạm muộn hơn trúng một dòng thì người xem
     đang nhìn thấy dòng đó, nên cứ đóng dấu như bình thường. */
  var DOUBLE_TAP_MS = 200;

  var KEY_OPEN = 'diploma:open';
  var KEY_STAMPS = 'diploma:stamps';   /* danh sách số thứ tự dòng đã đóng dấu, ví dụ "1,3" */
  var KEY_DONE = 'diploma:done';

  /* Lá nguyệt quế nhỏ hai bên tên bằng */
  var LEAF = 'M0 0C2-2.4 5.5-2.4 7.5 0 5.5 2.4 2 2.4 0 0z';
  var LAUREL =
    '<path d="M24 25C13 23 7 15 7 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '<g fill="currentColor">' +
      '<path transform="translate(18 23.1) rotate(160)" d="' + LEAF + '"/>' +
      '<path transform="translate(18 23.1) rotate(236)" d="' + LEAF + '"/>' +
      '<path transform="translate(12.3 18.9) rotate(186)" d="' + LEAF + '"/>' +
      '<path transform="translate(12.3 18.9) rotate(262)" d="' + LEAF + '"/>' +
      '<path transform="translate(8.6 13) rotate(216)" d="' + LEAF + '"/>' +
      '<path transform="translate(8.6 13) rotate(292)" d="' + LEAF + '"/>' +
      '<path transform="translate(7.1 7) rotate(268)" d="' + LEAF + '"/>' +
    '</g>';

  /* Con dấu vàng có trái tim và hai dải ruy băng */
  var HEART = 'M12 21.2c-.4 0-.8-.1-1.1-.4C6.1 17 2 13.4 2 8.9 2 6 4.2 3.8 7 3.8c1.9 0 3.6 1 5 2.9 1.4-1.9 3.1-2.9 5-2.9 2.8 0 5 2.2 5 5.1 0 4.5-4.1 8.1-8.9 11.9-.3.3-.7.4-1.1.4z';
  var SEAL =
    '<path d="M17 33l-6 21 7.5-4 3.5 6 5-19z" fill="#E8638C"/>' +
    '<path d="M31 33l6 21-7.5-4-3.5 6-5-19z" fill="#D9537E"/>' +
    '<circle cx="24" cy="22" r="18" fill="#F6C453"/>' +
    '<circle cx="24" cy="22" r="18" fill="none" stroke="#F6C453" stroke-width="5.4" stroke-linecap="round" stroke-dasharray="0.1 7.0586"/>' +
    '<circle cx="24" cy="22" r="14.2" fill="#FBD978"/>' +
    '<circle cx="24" cy="22" r="14.2" fill="none" stroke="#EFB32E" stroke-width="1.4"/>' +
    '<path transform="translate(14.4 12.9) scale(.8)" fill="#E8638C" d="' + HEART + '"/>';

  /* Cuộn giấy buộc nơ, vẽ trên cùng khung toạ độ với bạn gấu (200 x 244) để nằm đúng trong tay gấu */
  var ROLL =
    '<svg class="diploma__rollart" viewBox="0 0 200 244" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<g transform="rotate(-5 100 192)">' +
        '<g class="diploma__roll">' +
          '<rect x="12" y="171" width="176" height="42" rx="6" fill="#FFF6DC"/>' +
          '<path d="M12 199h176v8a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" fill="#F8E4A6"/>' +
          '<rect x="20" y="175.5" width="160" height="4" rx="2" fill="#fff" opacity=".75"/>' +
          '<ellipse cx="13" cy="192" rx="9.5" ry="21.5" fill="#F8DC8A"/>' +
          '<ellipse cx="13" cy="192" rx="5" ry="12" fill="none" stroke="#EFB32E" stroke-width="2"/>' +
          '<ellipse cx="13" cy="192" rx="1.3" ry="3.2" fill="#EFB32E"/>' +
          '<ellipse cx="187" cy="192" rx="9.5" ry="21.5" fill="#F8DC8A"/>' +
          '<ellipse cx="187" cy="192" rx="5" ry="12" fill="none" stroke="#EFB32E" stroke-width="2"/>' +
          '<ellipse cx="187" cy="192" rx="1.3" ry="3.2" fill="#EFB32E"/>' +
          '<rect x="90" y="171" width="20" height="42" fill="#E8638C"/>' +
          '<rect x="90" y="199" width="20" height="14" fill="#D9537E"/>' +
          '<ellipse cx="48" cy="181" rx="13.5" ry="11" fill="#E0AE84"/>' +
          '<ellipse cx="152" cy="181" rx="13.5" ry="11" fill="#E0AE84"/>' +
          '<g class="diploma__bowg">' +
            '<g transform="translate(58 156) scale(1.5)">' +
              '<path fill="#D9537E" d="M24 20l-8 14 7-3 3 4 4-13zM32 20l8 14-7-3-3 4-4-13z"/>' +
              '<path fill="#E8638C" d="M27 17C19 5 7 3 5 11.5S13 26 27 19zM29 17C37 5 49 3 51 11.5S43 26 29 19z"/>' +
              '<rect x="23.5" y="12" width="9" height="11" rx="4" fill="#F58AA8"/>' +
            '</g>' +
          '</g>' +
        '</g>' +
      '</g>' +
    '</svg>';

  function icon(name, className) {
    return '<svg class="' + className + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  }

  /* Toàn bộ khung trang là chữ tĩnh; chữ của người gửi được gán sau bằng textContent */
  var HTML =
    '<div class="diploma">' +
      '<div class="diploma__closed">' +
        '<h2 class="title title--center diploma__lead" data-reveal style="--i:0"><span class="hl" data-diploma="lead"></span></h2>' +
        '<div class="diploma__art" data-reveal style="--i:1">' +
          '<button class="diploma__scroll" type="button" aria-label="Mở tấm bằng">' +
            '<span class="diploma__bob">' +
              /* data-mascot rỗng: gấu kem mặc định, không gắn biến thể nào (không thêm class lạ vào không gian chung) */
              '<span class="diploma__bear" data-mascot=""></span>' +
              ROLL +
            '</span>' +
          '</button>' +
          icon('star', 'spark spark--a') +
          icon('heart', 'spark spark--b') +
          icon('sparkle', 'spark spark--d') +
        '</div>' +
        '<p class="diploma__hint" data-reveal style="--i:2">' + icon('hand', 'diploma__hand') + '<span data-diploma="hint"></span></p>' +
      '</div>' +
      '<div class="diploma__cert" data-reveal style="--i:0">' +
        '<div class="diploma__clip">' +
          '<div class="diploma__clip2">' +
            '<div class="diploma__paper">' +
              icon('sparkle', 'diploma__corner diploma__corner--tl') +
              icon('sparkle', 'diploma__corner diploma__corner--tr') +
              icon('sparkle', 'diploma__corner diploma__corner--bl') +
              icon('sparkle', 'diploma__corner diploma__corner--br') +
              '<div class="diploma__head">' +
                '<p class="diploma__heading">' + icon('diploma-laurel', 'diploma__laurel') +
                  '<span data-diploma="heading"></span>' + icon('diploma-laurel', 'diploma__laurel diploma__laurel--r') + '</p>' +
                '<p class="diploma__to" data-diploma="awardedTo"></p>' +
                '<p class="diploma__name" data-diploma="name"></p>' +
                '<p class="diploma__line" data-diploma="line"></p>' +
                '<p class="diploma__course"><span data-diploma="course"></span></p>' +
              '</div>' +
              '<div class="diploma__divider" aria-hidden="true">' + icon('star', '') + icon('heart', '') + icon('star', '') + '</div>' +
              '<div class="diploma__rows"></div>' +
              '<div class="diploma__foot">' +
                '<span class="diploma__seal">' + icon('diploma-seal', '') + '</span>' +
                '<span class="diploma__result">' +
                  '<span class="diploma__grade" data-diploma="grade"></span>' +
                  '<span class="diploma__sign"><span class="diploma__signtxt" data-diploma="sign"></span></span>' +
                '</span>' +
                '<p class="diploma__tip"><span class="diploma__tipin">' + icon('heart', '') + '<span data-diploma="stampHint"></span></span></p>' +
              '</div>' +
            '</div>' +
            '<span class="diploma__rod diploma__rod--b"></span>' +
          '</div>' +
          '<span class="diploma__rod diploma__rod--t"></span>' +
        '</div>' +
      '</div>' +
      /* Tấm chắn vô hình phủ kín vùng tấm bằng, chỉ hiện trong lúc giấy đang mở (class diploma--opening).
         Người xem hay chạm hai lần liên tiếp vào "Chạm để mở": lần chạm thứ hai rơi xuống tờ giấy
         đang nở (không phải nút) thì thư viện LẬT TRANG, hoặc rơi trúng một dòng điểm và đóng dấu
         khi người xem còn chưa kịp nhìn thấy. Tấm chắn là một nút: chạm vào là "nuốt" mất (xem onShield),
         còn vuốt bắt đầu trên nút vẫn được lõi chuyển thành lật trang như thường. */
      '<button class="diploma__shield" type="button" tabindex="-1" aria-hidden="true"></button>' +
    '</div>';

  /* ---------- Trạng thái trong lúc chạy ---------- */

  var ctx = null;
  var page = null;
  var rows = [];        /* các nút dòng điểm (nút gốc, không phải bản sao lúc lật) */
  var stamped = [];     /* dòng nào đã có dấu 10 */
  var isOpen = false;
  var isDone = false;
  var sealEl = null;
  var openedAt = -1e9;  /* thời điểm (event.timeStamp) của cú chạm mở cuộn giấy */
  var turning = false;  /* một lượt lật trang đang diễn ra */
  var turnTimer = null;

  function complain(where, err) {
    if (window.console && console.error) console.error('[thu-moi] diploma ' + where + ':', err);
  }

  /* Lỗi trong lúc người xem bấm không được phép làm hỏng phần còn lại của lá thư */
  function safe(where, fn) {
    return function (e) {
      try { fn(e); } catch (err) { complain(where, err); }
    };
  }

  function part(key) {
    return page ? page.querySelector('[data-diploma="' + key + '"]') : null;
  }

  function countChars(text) {
    return (Array.from ? Array.from(text) : text.split('')).length;
  }

  /* Lấy một câu từ config. Thiếu thì dùng mặc định; để trống '' thì chủ ý muốn ẩn. */
  function conf(key) {
    var v = ctx.get('diploma.' + key);
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    return DEFAULTS[key];
  }

  /* Gán chữ bằng textContent (không bao giờ dựng HTML từ chữ của người gửi).
     Chữ rỗng thì ẩn luôn "box" để không chừa khoảng trống vô nghĩa. */
  function put(key, text, box) {
    var el = part(key);
    if (!el) return '';
    var s = ctx.fill(text).replace(/\s+/g, ' ').replace(/^ | $/g, '');
    el.textContent = s;
    if (!s) (box || el).hidden = true;
    return s;
  }

  function readSubjects() {
    var list = ctx.get('diploma.subjects');
    if (!Array.isArray(list)) list = DEFAULTS.subjects;
    var out = [];
    for (var i = 0; i < list.length && out.length < MAX_ROWS; i++) {
      var v = list[i];
      if (typeof v !== 'string' && typeof v !== 'number') continue;
      var s = ctx.fill(String(v)).replace(/\s+/g, ' ').replace(/^ | $/g, '');
      if (s) out.push(s);
    }
    return out;
  }

  function fillTexts() {
    put('lead', conf('lead'), page.querySelector('.diploma__lead'));
    put('hint', conf('hint'), page.querySelector('.diploma__hint'));
    put('heading', conf('heading'), page.querySelector('.diploma__heading'));
    put('awardedTo', conf('awardedTo'));
    put('line', conf('line'));
    put('grade', conf('grade'));
    put('stampHint', conf('stampHint'), page.querySelector('.diploma__tip'));

    /* Tên người nhận: càng dài chữ càng nhỏ, và được phép xuống dòng */
    var nameEl = part('name');
    var name = String((ctx.names && ctx.names.to) || '').replace(/\s+/g, ' ').replace(/^ | $/g, '');
    nameEl.textContent = name;
    if (!name) nameEl.hidden = true;
    var len = countChars(name);
    if (len > 18) nameEl.classList.add('diploma__name--sm');
    else if (len > 12) nameEl.classList.add('diploma__name--md');

    /* Tên khoá học: thiếu tên người gửi thì dùng câu không cần tên */
    var from = String((ctx.names && ctx.names.from) || '').replace(/\s+/g, '');
    var course = conf('course');
    if (!from && course.indexOf('{from}') !== -1) course = COURSE_NO_NAME;
    put('course', course, page.querySelector('.diploma__course'));

    var sign = put('sign', conf('sign'), page.querySelector('.diploma__sign'));
    if (countChars(sign) > 12) part('sign').classList.add('diploma__signtxt--sm');
  }

  function buildRows() {
    var box = page.querySelector('.diploma__rows');
    var list = readSubjects();
    rows = [];
    stamped = [];

    for (var i = 0; i < list.length; i++) {
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'diploma__row diploma__row--' + (i + 1);
      btn.setAttribute('aria-pressed', 'false');

      /* Tấm thẻ trắng nằm BÊN TRONG nút. Các nút xếp sát nhau (không có khe), khoảng cách giữa
         các thẻ chỉ là phần đệm của nút: chạm trúng chỗ "hở" giữa hai thẻ vẫn là chạm vào nút,
         không lỡ tay lật trang giữa lúc đang chấm điểm. */
      var card = doc.createElement('span');
      card.className = 'diploma__card';

      var subject = doc.createElement('span');
      subject.className = 'diploma__subject';
      subject.textContent = list[i];

      /* Số 10 nằm sẵn trong nút, chỉ hiện khi trang có class diploma--sN.
         Nhờ vậy tên nút cho trình đọc màn hình tự đổi thành "<môn> 10" sau khi đóng dấu. */
      var ring = doc.createElement('span');
      ring.className = 'diploma__ring';
      var ten = doc.createElement('span');
      ten.className = 'diploma__ten';
      ten.textContent = '10';
      ring.appendChild(ten);

      card.appendChild(subject);
      card.appendChild(ring);
      btn.appendChild(card);
      box.appendChild(btn);
      rows.push(btn);
      stamped.push(false);
    }

    if (!rows.length) {
      box.hidden = true;
      /* Không có bảng điểm thì gom tấm bằng vào giữa cho khỏi một khoảng trống lớn.
         Class này chỉ phụ thuộc config (không đổi khi xem), nên đặt trên khối con cũng an toàn khi nhân bản trang. */
      var wrap = page.querySelector('.diploma');
      if (wrap) wrap.classList.add('diploma--norows');
      var tip = page.querySelector('.diploma__tip');
      if (tip) tip.hidden = true;
    }
  }

  function allStamped() {
    for (var i = 0; i < stamped.length; i++) {
      if (!stamped[i]) return false;
    }
    return true;
  }

  function saveStamps() {
    var list = [];
    for (var i = 0; i < stamped.length; i++) {
      if (stamped[i]) list.push(i + 1);
    }
    ctx.store.set(KEY_STAMPS, list.join(','));
  }

  /* Tô lại một dòng đã có dấu (không chuyển động, không tiếng) */
  function paintStamp(i) {
    stamped[i] = true;
    page.classList.add('diploma--s' + (i + 1));
    rows[i].setAttribute('aria-pressed', 'true');
  }

  function paintDone() {
    isDone = true;
    page.classList.add('diploma--done');
    root.classList.add('diploma-done');
  }

  /* Mở lại đúng trạng thái đã lưu, lặng lẽ: không chạy lại chuyển động hay âm thanh */
  function restore() {
    var savedOpen = ctx.store.get(KEY_OPEN) === '1';
    var savedDone = ctx.store.get(KEY_DONE) === '1';
    var savedStamps = String(ctx.store.get(KEY_STAMPS) || '').split(',');
    var i;

    for (i = 0; i < savedStamps.length; i++) {
      var n = parseInt(savedStamps[i], 10);
      if (n >= 1 && n <= rows.length) {
        paintStamp(n - 1);
        savedOpen = true;
      }
    }

    if (savedDone) {
      savedOpen = true;
      for (i = 0; i < rows.length; i++) paintStamp(i);
    }

    if (savedOpen) {
      isOpen = true;
      page.classList.add('diploma--open');
      /* Đã mở và không còn dòng nào chờ chấm (kể cả khi người gửi vừa bớt dòng) thì coi như xong */
      if (savedDone || allStamped()) paintDone();
    }
  }

  /* ---------- Hành động của người xem ---------- */

  /* Trang bằng có đang là trang được đọc và con dấu có đo được vị trí không.
     Trong lúc trang đang lật, book.current() vẫn chỉ trang cũ cho tới khi lật xong,
     nên phải tự nhớ là "đang lật" để không ăn mừng trên một trang đang bay đi. */
  function isOnScreen() {
    if (turning || !sealEl || !ctx.book) return false;
    if (ctx.book.pages[ctx.book.current()] !== page) return false;
    var r = sealEl.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function finish(delay) {
    if (isDone) return;
    isDone = true;
    /* Lưu ngay, phòng khi người xem tải lại trang giữa lúc con dấu đang rơi */
    ctx.store.set(KEY_DONE, '1');

    function land() {
      paintDone();

      /* Người xem có thể đã lật sang trang khác trong lúc chờ con dấu rơi. Khi đó trang này
         đang ẩn (không đo được vị trí con dấu), nên chỉ đổi trạng thái lặng lẽ, không ăn mừng. */
      var onScreen = isOnScreen();
      if (onScreen && !ctx.reduce) {
        ctx.replay(page, 'diploma--sealing', 1700);
        if (ctx.fx && ctx.fx.hearts) ctx.fx.hearts(sealEl, { count: 12, near: 44, far: 120 });
      }
      if (onScreen) {
        ctx.audio.chime();
        if (navigator.vibrate) {
          try { navigator.vibrate([20, 50, 20]); } catch (e) {}
        }
      }
      ctx.refit();
      ctx.emit('diploma:done', {});
    }

    if (delay > 0) setTimeout(safe('done', land), delay);
    else land();
  }

  /* Mốc thời gian của một cú chạm. Dùng event.timeStamp (giờ của chính cú chạm) chứ không dùng
     hẹn giờ: máy yếu làm setTimeout trễ, nhưng khoảng cách giữa hai cú chạm thì vẫn đo đúng. */
  function when(e) {
    return e && e.timeStamp > 0 ? e.timeStamp : (window.performance && performance.now ? performance.now() : Date.now());
  }

  /* Cú chạm rơi vào tấm chắn trong lúc giấy đang mở.
     - Có chuyển động: tấm bằng chưa hiện hết, nuốt cú chạm (không lật trang, không đóng dấu).
     - Giảm chuyển động: tấm bằng đã hiện ngay. Cú chạm quá nhanh (ngón thứ hai của chạm đúp) thì nuốt,
       cú chạm tới sau đó trúng một dòng điểm thì chuyển cho dòng đó; chạm ra ngoài các dòng thì vẫn
       nuốt, để tấm chắn còn đó thì không có cú chạm nào lật nhầm trang. */
  function onShield(e) {
    if (!ctx.reduce || !isOpen) return;
    if (when(e) - openedAt < DOUBLE_TAP_MS) return;
    var x = e.clientX, y = e.clientY;
    if (!(x > 0 || y > 0)) return;   /* không có toạ độ (bàn phím): tấm chắn không nhận tiêu điểm nên không xảy ra */
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        stamp(i);
        return;
      }
    }
  }

  function open(e) {
    if (isOpen) return;
    isOpen = true;
    openedAt = when(e);
    ctx.store.set(KEY_OPEN, '1');
    page.classList.add('diploma--open');

    /* Đo lại cỡ chữ TRƯỚC khi chạy chuyển động, lúc các lớp giấy còn đứng yên */
    ctx.refit();

    ctx.audio.flip();
    ctx.audio.pop();
    /* Bật tấm chắn chống chạm đúp (xem .diploma__shield) ở cả hai chế độ chuyển động */
    ctx.replay(page, 'diploma--opening', ctx.reduce ? OPENING_MS_CALM : OPENING_MS);
    if (!ctx.reduce) ctx.replay(page, 'diploma--unrolling', OPENING_MS);

    ctx.emit('diploma:open', {});

    /* Mở bằng bàn phím thì nút vừa bấm biến mất: đưa tiêu điểm sang dòng điểm đầu tiên */
    if (e && e.detail === 0 && rows.length) {
      try { rows[0].focus({ preventScroll: true }); } catch (err) {}
    }

    /* Không có dòng điểm nào: con dấu rơi ngay sau khi giấy mở xong */
    if (!rows.length) finish(ctx.reduce ? 0 : 1050);
  }

  function stamp(i, e) {
    if (!isOpen || !rows[i]) return;
    /* Phòng hờ: cú chạm (chuột / ngón tay, e.detail > 0) tới trong lúc giấy còn đang mở thì bỏ qua,
       để không có dòng nào bị đóng dấu khi người xem chưa thấy tấm bằng. Bàn phím (detail 0) vẫn
       chấm được ngay, vì người dùng bàn phím đã được đưa tiêu điểm tới dòng đầu một cách chủ ý. */
    if (e && e.detail > 0 && page.classList.contains('diploma--opening')) return;
    var row = rows[i];

    if (stamped[i]) {
      /* Đã có điểm rồi thì chỉ lắc nhẹ cho vui */
      if (!ctx.reduce) ctx.replay(row, 'diploma-is-wiggle', 460);
      return;
    }

    paintStamp(i);
    saveStamps();
    ctx.audio.pop();
    if (navigator.vibrate) {
      try { navigator.vibrate(14); } catch (e) {}
    }
    if (!ctx.reduce) ctx.replay(row, 'diploma-is-thump', 520);

    var count = 0;
    for (var k = 0; k < stamped.length; k++) {
      if (stamped[k]) count++;
    }
    ctx.emit('diploma:stamp', { index: i, count: count, total: rows.length });

    if (allStamped()) finish(ctx.reduce ? 0 : 430);
  }

  /* Gỡ các class chuyển động tạm khi trang bắt đầu lật. Thư viện nhân bản trang đúng lúc đó
     (bản sao mang theo cả class tạm và sẽ chạy lại chuyển động mở giấy, rơi dấu từ đầu),
     nên gỡ trên mọi bản của trang đang có trong sách, không riêng bản gốc. */
  function calm() {
    if (!page) return;
    var copies = ctx.qsa('.page--diploma', ctx.bookEl);
    if (copies.indexOf(page) === -1) copies.push(page);
    copies.forEach(function (p) {
      p.classList.remove('diploma--unrolling');
      p.classList.remove('diploma--opening');
      p.classList.remove('diploma--sealing');
      ctx.qsa('.diploma__row', p).forEach(function (row) {
        row.classList.remove('diploma-is-thump');
        row.classList.remove('diploma-is-wiggle');
      });
    });
  }

  /* ---------- Đăng ký với lá thư ---------- */

  (Invite.features = Invite.features || []).push({
    name: 'diploma',

    setup: function (c) {
      ctx = c;
      ctx.symbol('i-diploma-laurel', '0 0 28 28', LAUREL);
      ctx.symbol('i-diploma-seal', '0 0 48 58', SEAL);

      page = ctx.addPage({
        className: 'page--diploma',
        label: 'Bằng danh dự',
        before: '.page--rsvp',
        html: HTML
      });

      sealEl = page.querySelector('.diploma__seal');
      fillTexts();
      buildRows();
      restore();

      /* Gắn vào nút gốc. Bản sao lúc lật trang không có trình nghe, đúng như mong muốn. */
      var scrollBtn = page.querySelector('.diploma__scroll');
      if (scrollBtn) scrollBtn.addEventListener('click', safe('open', open));
      var shield = page.querySelector('.diploma__shield');
      if (shield) shield.addEventListener('click', safe('shield', onShield));
      rows.forEach(function (row, i) {
        row.addEventListener('click', safe('stamp', function (e) { stamp(i, e); }));
      });
    },

    ready: function (c) {
      c.on('turn', safe('turn', function () {
        turning = true;
        /* Người xem kéo góc trang rồi buông (trang không lật) thì không có sự kiện "shown":
           tự hết "đang lật" sau một lúc để lần chấm sau vẫn được ăn mừng */
        clearTimeout(turnTimer);
        turnTimer = setTimeout(function () { turning = false; }, 1600);
        calm();
      }));
      c.on('shown', function () {
        turning = false;
        clearTimeout(turnTimer);
      });
    }
  });
})();
