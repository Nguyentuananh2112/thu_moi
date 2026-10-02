/* =====================================================================
   ticket.js - Vé mời độc bản số 0001/0001

   Sau khi người nhận bấm "Mình sẽ đến!", một nút tròn có hình tấm vé nảy
   vào góc trái thanh trên. Tấm vé tự mở ra đúng một lần sau màn ăn mừng
   (hoặc sau khi ngoéo tay xong, nếu có tính năng pinky-promise), "in" ra
   từ khe máy in vé rồi được đóng dấu. Vé là món kỷ niệm để chụp màn hình.

   Chữ trên vé đổi được trong config.js, mục "ticket". Mọi chữ của người
   gửi đều được gán bằng textContent, không bao giờ ghép thành HTML.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;

  /* Chữ mặc định, dùng khi config thiếu mục "ticket" hoặc thiếu từng dòng */
  var DEFAULTS = {
    heading: 'VÉ MỜI',
    guest: 'Khách danh dự',
    seat: 'Chỗ ngồi: Sát bên {from}',
    seatNoName: 'Chỗ ngồi: Hàng ghế đầu',
    number: 'Số vé: 0001/0001',
    gate: 'Vào cổng bằng một nụ cười',
    stampPromise: 'ĐÃ NGOÉO TAY',
    stampYes: 'ĐÃ NHẬN LỜI',
    keep: 'Chụp màn hình lại làm kỷ niệm nha',
    clerk: 'Vé xinh ra lò nè!'
  };

  var ISSUED_KEY = 'ticket:issued';            /* ngày phát hành vé (mili giây) */
  var STAMPED_KEY = 'ticket:stamped';          /* con dấu nào đã được đóng: 'yes' hoặc 'promise' */
  var PROMISE_KEY = 'pinky-promise:sealed';    /* do tính năng ngoéo tay ghi lại */

  var AUTO_AFTER_YES = 2200;     /* chờ màn ăn mừng lắng xuống rồi mới đưa vé */
  var AUTO_AFTER_SEAL = 1200;    /* ngoéo tay xong thì đưa vé nhanh hơn */

  /* Hình tấm vé nhỏ cho nút trên thanh trên: nét tròn giống các icon sẵn có */
  var ICON =
    '<g transform="rotate(-12 12 12)">' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
        'd="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v1.8a2.2 2.2 0 0 0 0 4.4V16a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16v-1.8a2.2 2.2 0 0 0 0-4.4V8A1.5 1.5 0 0 1 5 6.5z"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M15 9.2v.3M15 11.9v.3M15 14.6v.3"/>' +
      '<path fill="currentColor" transform="translate(-2.6 -2.8)" d="M12 17.6s-2.9-1.8-2.9-3.7c0-1 .8-1.7 1.6-1.7.5 0 1 .3 1.3.8.3-.5.8-.8 1.3-.8.8 0 1.6.7 1.6 1.7 0 1.9-2.9 3.7-2.9 3.7z"/>' +
    '</g>';

  /* Khung tĩnh của tấm vé. Không có chữ nào của người gửi ở đây: các chỗ
     data-ticket được đổ chữ sau bằng textContent. */
  var SHEET_HTML =
    '<div class="ticket">' +
      '<div class="ticket__top">' +
        '<span class="ticket__clerk is-pet" aria-hidden="true"><span class="ticket__bear" data-mascot=""></span></span>' +
        '<p class="ticket__say"><span data-ticket="clerk"></span></p>' +
      '</div>' +
      '<div class="ticket__slot" aria-hidden="true"></div>' +
      '<div class="ticket__window">' +
        '<div class="ticket__slip">' +
          '<div class="ticket__shade" aria-hidden="true"></div>' +
          '<div class="ticket__paper">' +
            '<div class="ticket__head">' +
              '<svg class="ticket__star" aria-hidden="true"><use href="#i-star"/></svg>' +
              '<div class="ticket__headtext">' +
                '<h2 class="ticket__heading" data-ticket="heading"></h2>' +
                '<p class="ticket__event" data-ticket="event"></p>' +
              '</div>' +
              '<svg class="ticket__star ticket__star--b" aria-hidden="true"><use href="#i-star"/></svg>' +
            '</div>' +
            '<div class="ticket__main">' +
              '<p class="ticket__guest" data-ticket="guest"></p>' +
              '<p class="ticket__namebox"><span class="ticket__name" data-ticket="name"></span></p>' +
              '<ul class="ticket__rows">' +
                '<li class="ticket__row"><svg class="ic" aria-hidden="true"><use href="#i-calendar"/></svg><span data-ticket="date"></span></li>' +
                '<li class="ticket__row"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg><span data-ticket="time"></span></li>' +
                '<li class="ticket__row"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg><span data-ticket="place"></span></li>' +
              '</ul>' +
              '<div class="ticket__seat">' +
                '<p class="ticket__line" data-ticket="seat"></p>' +
                '<p class="ticket__line" data-ticket="number"></p>' +
              '</div>' +
            '</div>' +
            '<div class="ticket__tear" aria-hidden="true"></div>' +
            '<div class="ticket__stub">' +
              '<div class="ticket__codes" aria-hidden="true">' +
                '<span class="ticket__barcode"></span>' +
                '<svg class="ticket__codeheart"><use href="#i-heart"/></svg>' +
              '</div>' +
              '<p class="ticket__gate" data-ticket="gate"></p>' +
            '</div>' +
            '<p class="ticket__stamp"><span class="ticket__ink">' +
              '<span class="ticket__stamptext" data-ticket="stamp"></span>' +
              '<span class="ticket__sep"> · </span>' +
              '<span class="ticket__stampdate">' +
                '<svg aria-hidden="true"><use href="#i-heart"/></svg>' +
                '<span data-ticket="stamp-date"></span>' +
                '<svg aria-hidden="true"><use href="#i-heart"/></svg>' +
              '</span>' +
            '</span></p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="ticket__keep">' +
        '<svg class="ic" aria-hidden="true"><use href="#i-sparkle"/></svg>' +
        '<span data-ticket="keep"></span>' +
        '<svg class="ic" aria-hidden="true"><use href="#i-sparkle"/></svg>' +
      '</p>' +
    '</div>';

  /* Cỡ chữ tên khách (đơn vị em): thử một dòng trước, không vừa mới cho xuống dòng */
  var NAME_ONE_LINE = [2.05, 1.85, 1.65, 1.45, 1.3];
  var NAME_WRAPPED = [1.3, 1.15, 1, 0.9, 0.8, 0.7, 0.6];

  function complain(where, err) {
    if (window.console && console.error) console.error('[thu-moi] ticket ' + where + ':', err);
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* Đổi chuỗi trong bộ nhớ thành mốc thời gian; chuỗi lạ thì trả về 0 */
  function toTime(value) {
    var n = parseInt(value, 10);
    return isFinite(n) && n > 100000000000 ? n : 0;
  }

  function dayMonth(ms) {
    var d = new Date(ms);
    if (isNaN(d.getTime())) d = new Date();
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1);
  }

  function start(ctx) {
    var topbar = ctx.qs('.topbar');
    if (!topbar) return;                 /* không có thanh trên thì không có chỗ đặt nút */

    var reduce = !!ctx.reduce;
    var root = doc.documentElement;
    var sheet = null;                    /* cửa sổ nổi, dựng khi cần lần đầu */
    var parts = null;
    var issuedAt = 0;
    var stampedKind = ctx.store.get(STAMPED_KEY) || '';
    /* Mốc ngoéo tay nghe được từ sự kiện trong lần ghé này. Trình duyệt chặn bộ
       nhớ (chế độ ẩn danh, chặn dữ liệu trang) thì đây là nguồn duy nhất cho biết
       vừa ngoéo tay xong, kẻo vé đóng nhầm dấu "đã nhận lời". */
    var sealedAt = 0;
    var waitingSeal = false;             /* đang chờ ngoéo tay xong mới đưa vé */
    var autoTimer = null;
    var autoTries = 0;
    var fxTimers = [];
    var resizeTimer = null;

    /* ---------- Chữ lấy từ config ---------- */

    /* Thiếu dòng nào thì dùng chữ mặc định; để trống '' thì chỗ đó ẩn đi */
    function text(key) {
      var v = ctx.get('ticket.' + key);
      if (v === undefined || v === null || typeof v === 'object') v = DEFAULTS[key];
      return ctx.fill(String(v));
    }

    function eventText(key, fallback) {
      var v = ctx.get('event.' + key);
      if (v === undefined || v === null || typeof v === 'object' || v === '') v = fallback || '';
      return ctx.fill(String(v));
    }

    function put(el, value) {
      if (!el) return;
      el.textContent = value;
      el.hidden = !String(value).trim();
    }

    /* "Chỗ ngồi: Sát bên X" được tách ở dấu hai chấm đầu tiên để phần nhãn nhạt,
       phần giá trị đậm. Vẫn chỉ dùng textContent, và ghép lại đúng nguyên văn. */
    function putPair(el, value) {
      if (!el) return;
      el.textContent = '';
      var m = /^([^:]*:)(\s*)([\s\S]+)$/.exec(value);
      if (m) {
        var k = doc.createElement('span');
        var v = doc.createElement('span');
        k.className = 'ticket__k';
        v.className = 'ticket__v';
        k.textContent = m[1];
        v.textContent = m[3];
        el.appendChild(k);
        el.appendChild(doc.createTextNode(m[2]));
        el.appendChild(v);
      } else {
        el.textContent = value;
      }
      el.hidden = !value.trim();
    }

    /* Khối chỉ còn ý nghĩa khi có ít nhất một dòng con đang hiện */
    function hideIfEmpty(box) {
      if (!box) return;
      var kids = box.children;
      var any = false;
      for (var i = 0; i < kids.length; i++) {
        if (!kids[i].hidden) { any = true; break; }
      }
      box.hidden = !any;
    }

    /* ---------- Ngày phát hành và con dấu ---------- */

    /* Vé chỉ phát hành một lần: lần đầu ghi lại, các lần sau đọc đúng ngày cũ */
    function issued() {
      if (issuedAt) return issuedAt;
      var n = toTime(ctx.store.get(ISSUED_KEY));
      if (!n) {
        n = Date.now();
        ctx.store.set(ISSUED_KEY, String(n));
      }
      issuedAt = n;
      return n;
    }

    /* Đã ngoéo tay thì dấu ghi ngày ngoéo tay, chưa thì ghi ngày nhận lời.
       Đọc lại mỗi lần mở vì có thể vừa ngoéo tay xong. Trả về loại dấu.
       Ưu tiên mốc vừa nghe từ sự kiện, không có thì mới đọc bộ nhớ (lần ghé sau). */
    function paintStamp() {
      var sealed = ctx.store.get(PROMISE_KEY);
      var promise = !!sealedAt || (sealed !== null && sealed !== undefined);
      var when = promise ? (sealedAt || toTime(sealed) || issued()) : issued();
      var label = text(promise ? 'stampPromise' : 'stampYes');
      put(parts.stamp, label);
      parts.sep.hidden = !label.trim();
      parts.stampDate.textContent = dayMonth(when);
      return promise ? 'promise' : 'yes';
    }

    /* ---------- Mã vạch ----------
       Sinh từ tên hai người nên mỗi cặp đôi có một dãy vạch riêng, và lần nào
       mở cũng ra đúng dãy đó. */
    function buildBarcode(box) {
      var source = ctx.names.to + '|' + ctx.names.from;
      var seed = 7;
      var i;
      for (i = 0; i < source.length; i++) seed = (seed * 31 + source.charCodeAt(i)) % 2147483647;
      if (seed < 1) seed = 20261115;
      for (i = 0; i < 22; i++) {
        seed = (seed * 48271) % 2147483647;
        var r = seed / 2147483647;
        var bar = doc.createElement('span');
        bar.className = 'ticket__bar' + (r > 0.72 ? ' ticket__bar--thick' : r > 0.4 ? ' ticket__bar--mid' : '');
        box.appendChild(bar);
      }
    }

    /* ---------- Dựng cửa sổ vé (một lần) ---------- */

    function build() {
      sheet = ctx.overlay({
        label: ctx.fill('Vé mời của {to}'),
        className: 'ticket-sheet',
        html: SHEET_HTML,
        onOpen: function () {
          try { onOpen(); } catch (e) { complain('lúc mở', e); }
        },
        onClose: function () {
          try { onClose(); } catch (e) { complain('lúc đóng', e); }
        }
      });

      var body = sheet.body;
      function part(name) { return ctx.qs('[data-ticket="' + name + '"]', body); }

      parts = {
        root: ctx.qs('.ticket', body),
        slip: ctx.qs('.ticket__slip', body),
        paper: ctx.qs('.ticket__paper', body),
        stub: ctx.qs('.ticket__stub', body),
        nameBox: ctx.qs('.ticket__namebox', body),
        name: part('name'),
        stampBox: ctx.qs('.ticket__stamp', body),
        stamp: part('stamp'),
        sep: ctx.qs('.ticket__sep', body),
        stampDate: part('stamp-date')
      };

      put(part('clerk'), text('clerk'));
      part('clerk').parentNode.hidden = !text('clerk').trim();
      put(part('heading'), text('heading'));
      put(part('event'), eventText('title', 'Lễ tốt nghiệp'));
      put(part('guest'), text('guest'));
      parts.name.textContent = ctx.names.to;

      /* Ngày, giờ, nơi: lõi đã tính sẵn dateText và timeText. Dòng nào trống thì ẩn cả hàng. */
      ['date', 'time', 'place'].forEach(function (name) {
        var el = part(name);
        var value = eventText(name === 'date' ? 'dateText' : name === 'time' ? 'timeText' : 'venue');
        el.textContent = value;
        el.parentNode.hidden = !value.trim();
      });

      /* Chưa điền tên người gửi thì "Sát bên {from}" sẽ cụt lủn, nên đổi sang câu dự phòng */
      var seatRaw = ctx.get('ticket.seat');
      if (seatRaw === undefined || seatRaw === null || typeof seatRaw === 'object') seatRaw = DEFAULTS.seat;
      var noSender = !String(ctx.names.from || '').trim();
      var seat = noSender && String(seatRaw).indexOf('{from}') !== -1 ? text('seatNoName') : text('seat');
      putPair(part('seat'), seat);
      putPair(part('number'), text('number'));
      put(part('gate'), text('gate'));

      /* Khối ngày-giờ-nơi và khối chỗ ngồi-số vé có đường gạch vàng phía trên.
         Mọi dòng trong khối đều ẩn thì ẩn luôn cả khối, kẻo còn trơ lại một
         đường gạch với khoảng trống bên dưới. */
      hideIfEmpty(ctx.qs('.ticket__rows', body));
      hideIfEmpty(ctx.qs('.ticket__seat', body));

      var keep = text('keep');
      part('keep').textContent = keep;
      part('keep').parentNode.hidden = !keep.trim();

      buildBarcode(ctx.qs('.ticket__barcode', body));
      ctx.fx.mountMascots(body);          /* bạn gấu soát vé ló đầu sau khe in */

      /* Font về muộn làm chữ rộng hẹp khác đi: đo lại nếu vé đang mở */
      if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) {
        doc.fonts.ready.then(function () {
          try { fit(); } catch (e) { complain('đo lại', e); }
        }, function () {});
      }
    }

    /* ---------- Cho vừa khung ---------- */

    /* Tên dài thì nhỏ dần; quá dài nữa thì xuống dòng trong đúng khung cao cố định,
       để tấm vé không bao giờ cao thêm vì một cái tên. */
    function fitName() {
      var box = parts.nameBox;
      var el = parts.name;
      var room = box.clientWidth - 4;     /* chừa chỗ cho nét đá của chữ viết tay */
      var i;
      if (room <= 0) return;

      el.classList.remove('is-wrap');
      for (i = 0; i < NAME_ONE_LINE.length; i++) {
        el.style.fontSize = NAME_ONE_LINE[i] + 'em';
        if (el.offsetWidth <= room) return;
      }
      el.classList.add('is-wrap');
      for (i = 0; i < NAME_WRAPPED.length; i++) {
        el.style.fontSize = NAME_WRAPPED[i] + 'em';
        if (el.offsetHeight <= box.clientHeight + 1 && el.scrollWidth <= box.clientWidth + 1) return;
      }
    }

    function fit() {
      if (!sheet || !sheet.isOpen() || !parts) return;
      var card = sheet.card;
      var body = sheet.body;

      card.style.fontSize = '';
      fitName();

      /* Hai lỗ khuyết phải nằm đúng trên đường xé, mà cuống vé cao thấp theo lời
         người gửi viết: đo cuống rồi báo cho CSS qua một biến. */
      function notch() {
        var f = parseFloat(getComputedStyle(parts.slip).fontSize) || 0;
        var h = parts.stub.offsetHeight;
        if (f && h) parts.slip.style.setProperty('--tk-stub', (h / f).toFixed(3) + 'em');
      }
      notch();

      /* Vé là để chụp màn hình nên phải hiện trọn, không cuộn. CSS đã tính cỡ chữ
         theo màn hình; lời quá dài hay màn hình quá thấp thì thu nhỏ thêm ở đây. */
      /* Khung ngoài là lưới căn giữa nên max-height của thẻ không phải lúc nào cũng
         chặn được: tự so chiều cao thẻ với phần màn hình còn lại (trừ lề an toàn). */
      var wrap = sheet.el;
      var ws = getComputedStyle(wrap);
      var room = wrap.clientHeight - (parseFloat(ws.paddingTop) || 0) - (parseFloat(ws.paddingBottom) || 0);
      function tooTall() {
        return body.scrollHeight > body.clientHeight + 0.5 || (room > 0 && card.offsetHeight > room + 0.5);
      }
      var size = parseFloat(getComputedStyle(card).fontSize) || 15;
      var guard = 0;
      while (tooTall() && size > 9 && guard < 30) {
        size -= 0.5;
        card.style.fontSize = size + 'px';
        guard++;
      }
      if (guard) {
        fitName();
        notch();
      }
    }

    /* ---------- In vé, đóng dấu ---------- */

    function later(fn, ms) {
      fxTimers.push(setTimeout(function () {
        try { fn(); } catch (e) { complain('hiệu ứng', e); }
      }, ms));
    }

    function clearFx() {
      for (var i = 0; i < fxTimers.length; i++) clearTimeout(fxTimers[i]);
      fxTimers = [];
      if (parts) parts.root.classList.remove('is-printing', 'is-stamping', 'is-restamp');
    }

    function tick(freq) {
      return function () { ctx.audio.tone(freq, 0, 0.05, 'triangle', 0.04); };
    }

    /* Tiếng "cộp" và chùm tim nhỏ đúng lúc con dấu chạm giấy */
    function thump() {
      ctx.audio.tone(128, 0, 0.16, 'sine', 0.12);
      ctx.audio.tone(74, 0, 0.2, 'sine', 0.09);
      if (navigator.vibrate) { try { navigator.vibrate(16); } catch (e) {} }
      ctx.fx.hearts(parts.stampBox, { count: 6, near: 28, far: 66 });
    }

    function onOpen() {
      var kind = paintStamp();
      fit();

      btn.classList.remove('has-badge');
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }

      /* Dấu chỉ "cộp" xuống lần đầu tiên nó xuất hiện; các lần sau nằm sẵn trên vé */
      var first = stampedKind !== kind;
      stampedKind = kind;
      ctx.store.set(STAMPED_KEY, kind);

      clearFx();
      if (reduce) return;                 /* giảm chuyển động: vé nằm sẵn, không trượt, không đóng dấu */

      void parts.root.offsetWidth;
      parts.root.classList.add('is-printing');
      if (first) parts.root.classList.add('is-stamping');

      /* Ba tiếng tích khớp với ba nhịp đẩy giấy trong @keyframes ticket-print */
      later(tick(1180), 40);
      later(tick(1180), 370);
      later(tick(1320), 700);
      if (first) later(thump, 1400);
      later(function () {
        parts.root.classList.remove('is-printing', 'is-stamping');
      }, 2100);
    }

    function onClose() {
      clearFx();
    }

    function openTicket() {
      if (!sheet) build();
      sheet.open();
    }

    /* Vé đang mở mà con dấu vừa đổi (vừa ngoéo tay xong): đóng lại dấu mới tại chỗ */
    function restamp() {
      var kind = paintStamp();
      if (kind === stampedKind) return;
      stampedKind = kind;
      ctx.store.set(STAMPED_KEY, kind);
      if (reduce) return;
      ctx.replay(parts.root, 'is-restamp', 900);
      later(thump, 200);
    }

    /* ---------- Tự mở đúng một lần ---------- */

    function scheduleAuto(ms) {
      clearTimeout(autoTimer);
      autoTries = 0;
      autoTimer = setTimeout(autoOpen, ms);
    }

    function autoOpen() {
      autoTimer = null;
      try {
        if (sheet && sheet.isOpen()) { restamp(); return; }
        /* Đang có cửa sổ khác mở thì đợi nó đóng, không chen ngang. Đợi mãi không
           được thì thôi: nút vé và chấm báo vẫn nằm trên thanh trên. */
        if (root.classList.contains('has-sheet')) {
          if (autoTries < 45) {
            autoTries++;
            autoTimer = setTimeout(autoOpen, 700);
          }
          return;
        }
        openTicket();
      } catch (e) {
        complain('tự mở', e);
      }
    }

    function hasPinkyPromise() {
      if (ctx.cfg.features && ctx.cfg.features['pinky-promise'] === false) return false;
      var list = Invite.features || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].name === 'pinky-promise' && !list[i].failed) return true;
      }
      return false;
    }

    /* ---------- Nút vé trên thanh trên ---------- */

    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn icon-btn--sm ticket-btn';
    btn.hidden = true;
    btn.setAttribute('aria-label', ctx.fill('Xem vé mời của {to}'));
    btn.innerHTML =
      '<svg class="ic" aria-hidden="true"><use href="#i-ticket-ticket"/></svg>' +
      '<span class="ticket-btn__badge" aria-hidden="true"></span>';
    topbar.insertBefore(btn, topbar.firstChild);

    function showButton(fresh) {
      btn.hidden = false;
      if (!fresh) return;
      btn.classList.add('has-badge');
      if (!reduce) ctx.replay(btn, 'is-new', 900);
    }

    btn.addEventListener('click', function () {
      try {
        ctx.audio.pop();
        openTicket();
      } catch (e) {
        complain('mở vé', e);
      }
    });

    /* Lần ghé lại: đã nhận lời từ trước thì nút nằm sẵn, không nảy, không chấm báo, không tự mở */
    if (ctx.saidYes()) showButton(false);

    ctx.on('rsvp-yes', function (d) {
      if (d && d.again) return;           /* "Ăn mừng lần nữa" không phát vé lại */
      issued();
      showButton(true);
      /* Có ngoéo tay thì nhường cho nghi thức đó xong đã. Nếu lời hứa đã có sẵn
         trong bộ nhớ thì sự kiện sẽ không tới nữa, nên đưa vé theo giờ thường. */
      if (hasPinkyPromise() && ctx.store.get(PROMISE_KEY) === null) waitingSeal = true;
      else scheduleAuto(AUTO_AFTER_YES);
    });

    ctx.on('pinky-promise:sealed', function (d) {
      /* Sự kiện tới nghĩa là đã ngoéo tay, kể cả khi không kèm mốc giờ */
      sealedAt = (d && toTime(d.at)) || sealedAt || Date.now();
      if (waitingSeal) {
        waitingSeal = false;
        scheduleAuto(AUTO_AFTER_SEAL);
      } else if (sheet && sheet.isOpen()) {
        restamp();
      } else if (!btn.hidden) {
        /* Ngoéo tay ở lần ghé sau: không tự mở, chỉ nháy nút báo vé có dấu mới */
        showButton(true);
      }
    });

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        try { fit(); } catch (e) { complain('đo lại', e); }
      }, 160);
    });
  }

  (Invite.features = Invite.features || []).push({
    name: 'ticket',
    setup: function (ctx) {
      ctx.symbol('i-ticket-ticket', '0 0 24 24', ICON);
    },
    ready: function (ctx) {
      start(ctx);
    }
  });
})();
