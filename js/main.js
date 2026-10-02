/* =====================================================================
   main.js - đổ nội dung từ config.js vào trang và nối các phần lại

   TÍNH NĂNG PHỤ (thư mục js/cute)
   Mỗi tính năng là một file riêng, tự đăng ký trước khi main.js chạy:

     Invite.features.push({
       name: 'ten-tinh-nang',
       setup: function (ctx) {},   // chạy TRƯỚC khi dựng sách: được thêm trang, sửa khuôn gấu
       ready: function (ctx) {}    // chạy sau khi sách dựng xong
     });

   Tắt một tính năng: đặt features['ten-tinh-nang'] = false trong config.js.
   Một tính năng bị lỗi sẽ tự bị bỏ qua, không làm hỏng phần còn lại.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;
  var root = doc.documentElement;
  var reduce = root.classList.contains('reduce-motion');
  var cfg = window.INVITE_CONFIG || {};
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function qs(sel, scope) { return (scope || doc).querySelector(sel); }
  function qsa(sel, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(sel)); }

  function get(obj, path) {
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (obj === null || obj === undefined) return undefined;
      obj = obj[parts[i]];
    }
    return obj;
  }

  /* Chạy lại một animation CSS bằng cách gỡ rồi gắn lại class */
  function replay(el, cls, ms) {
    el.classList.remove(cls);
    /* Ép trình duyệt tính lại bố cục để animation chạy lại từ đầu.
       Dùng getBoundingClientRect vì phần tử SVG không có offsetWidth. */
    void el.getBoundingClientRect().width;
    el.classList.add(cls);
    if (ms) setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  function complain(where, err) {
    if (window.console && console.error) console.error('[thu-moi] ' + where + ':', err);
  }

  /* ---------- Bộ nhớ nhỏ trên máy người xem ---------- */

  var store = {
    get: function (key) {
      try { return localStorage.getItem('invite:' + key); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { localStorage.setItem('invite:' + key, String(value)); } catch (e) {}
    },
    remove: function (key) {
      try { localStorage.removeItem('invite:' + key); } catch (e) {}
    }
  };

  /* ---------- Sự kiện giữa các phần ---------- */

  var listeners = {};

  function on(name, cb) {
    if (typeof cb !== 'function') return;
    (listeners[name] = listeners[name] || []).push(cb);
  }

  function emit(name, detail) {
    var list = (listeners[name] || []).slice();
    for (var i = 0; i < list.length; i++) {
      try { list[i](detail || {}); } catch (e) { complain('sự kiện ' + name, e); }
    }
  }

  /* ---------- Tên người nhận, người gửi ---------- */

  function readRecipient() {
    var name = (cfg.recipient && cfg.recipient.name) || 'bạn';
    try {
      var q = new URLSearchParams(location.search).get('to');
      if (q) {
        q = q.replace(/[\u0000-\u001F\u007F]/g, '').trim();
        q = (Array.from ? Array.from(q) : q.split('')).slice(0, 30).join('');
        if (q) name = q;
      }
    } catch (e) {}
    return name;
  }

  var toName = readRecipient();
  var fromName = (cfg.sender && cfg.sender.name) || '';

  function fill(text) {
    return String(text).split('{to}').join(toName).split('{from}').join(fromName);
  }

  /* ---------- Đọc ngày giờ người gửi viết ----------
     new Date('2026-12-20 09:00') chạy trên Chrome nhưng Safari (iPhone, Zalo, Messenger)
     trả về ngày hỏng, nên tự đọc các kiểu hay gặp:
       2026-11-15T08:00:00+07:00, 2026-11-15 08:00, 2026-11-15, 15/11/2026 08:00, 15/11/2026 8h30
     Không ghi múi giờ thì hiểu là giờ Việt Nam (+07:00) chứ không theo máy người xem. */

  var VN_OFFSET = 420;   /* phút */
  var ISO_DATE_RE = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:(?:[T\s]+|,\s*)(\d{1,2})(?:[:hH](\d{2})?)(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
  var VN_DATE_RE = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?:(?:[T\s]+|,\s*)(\d{1,2})(?:[:hH](\d{2})?)(?::(\d{2}))?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function readOffset(s) {
    if (!s) return null;
    if (/^z$/i.test(s)) return 0;
    var sign = s.charAt(0) === '-' ? -1 : 1;
    var digits = s.slice(1).replace(':', '');
    var h = parseInt(digits.slice(0, 2), 10);
    var m = digits.length > 2 ? parseInt(digits.slice(2), 10) : 0;
    if (h > 14 || m > 59) return NaN;
    return sign * (h * 60 + m);
  }

  function offsetText(min) {
    var a = Math.abs(min);
    return (min < 0 ? '-' : '+') + pad2(Math.floor(a / 60)) + ':' + pad2(a % 60);
  }

  /* Trả về { ms, iso, hasTime } hoặc null khi không đọc được.
     iso luôn có dạng chuẩn 2026-11-15T08:00:00+07:00 mà trình duyệt nào cũng hiểu. */
  function parseDateParts(value) {
    if (value instanceof Date) value = value.getTime();
    if (typeof value === 'number') {
      if (!isFinite(value)) return null;
      return { ms: value, iso: isoAt(value, VN_OFFSET), hasTime: true };
    }
    if (typeof value !== 'string') return null;
    var s = value.replace(/^\s+|\s+$/g, '');
    if (!s) return null;

    var m = ISO_DATE_RE.exec(s);
    var y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else {
      m = VN_DATE_RE.exec(s);
      if (m) { y = +m[3]; mo = +m[2]; d = +m[1]; }
    }

    if (!m) {
      /* Kiểu lạ: để trình duyệt thử đọc, đọc được thì đổi sang dạng chuẩn */
      var t = new Date(s).getTime();
      return isNaN(t) ? null : { ms: t, iso: isoAt(t, VN_OFFSET), hasTime: true };
    }

    var hasTime = m[4] !== undefined;
    var hh = hasTime ? +m[4] : 0;
    var mi = hasTime && m[5] ? +m[5] : 0;
    var ss = hasTime && m[6] ? +m[6] : 0;
    var off = m[7] ? readOffset(m[7]) : VN_OFFSET;
    if (isNaN(off) || mo < 1 || mo > 12 || d < 1 || hh > 23 || mi > 59 || ss > 59) return null;

    /* Ngày không có thật (31/02) thì Date.UTC tự lăn sang tháng sau: coi là sai */
    var utc = Date.UTC(y, mo - 1, d, hh, mi, ss);
    var check = new Date(utc);
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;

    var ms = utc - off * 60000;
    var iso = y + '-' + pad2(mo) + '-' + pad2(d) + 'T' + pad2(hh) + ':' + pad2(mi) + ':' + pad2(ss) +
      (m[7] && /^z$/i.test(m[7]) ? 'Z' : offsetText(off));
    return { ms: ms, iso: iso, hasTime: hasTime };
  }

  /* Thời điểm ms viết theo múi giờ off (phút) */
  function isoAt(ms, off) {
    var t = new Date(ms + off * 60000);
    return t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate()) + 'T' +
      pad2(t.getUTCHours()) + ':' + pad2(t.getUTCMinutes()) + ':' + pad2(t.getUTCSeconds()) + offsetText(off);
  }

  /* Cho các tính năng phụ: chuỗi ngày giờ -> mili giây (NaN khi không đọc được) */
  function parseDate(value) {
    var p = parseDateParts(value);
    return p ? p.ms : NaN;
  }
  Invite.parseDate = parseDate;

  /* Ghi lại ngày đã chuẩn hoá vào config, để mọi chỗ khác (kể cả new Date(...) trong các
     tính năng phụ) đọc đúng trên Safari. Trả về phần đã đọc, hoặc null kèm ghi chú lỗi. */
  var dateProblems = [];

  function normalizeDate(obj, key, label) {
    var raw = obj[key];
    if (raw === undefined || raw === null || raw === '') return null;
    var p = parseDateParts(raw);
    if (!p) {
      dateProblems.push(label);
      complain('ngày giờ', label + " = '" + raw + "' viết chưa đúng dạng, ví dụ đúng: '2026-11-15T08:00:00+07:00'");
      return null;
    }
    obj[key] = p.iso;
    return p;
  }

  var WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

  /* ---------- Ngày giờ, link bản đồ, link lịch ---------- */

  function prepareEvent() {
    var ev = cfg.event = cfg.event || {};
    var tz = ev.timeZone || 'Asia/Ho_Chi_Minh';
    var startRaw = ev.start;
    var startP = normalizeDate(ev, 'start', 'event.start');
    var endP = normalizeDate(ev, 'end', 'event.end');
    if (!startP && (startRaw === undefined || startRaw === null || startRaw === '')) {
      dateProblems.push('event.start');
      complain('ngày giờ', 'event.start đang trống: trang không biết ngày diễn ra buổi lễ');
    }
    var valid = !!startP;
    var start = valid ? new Date(startP.ms) : null;
    var end = endP ? new Date(endP.ms) : null;

    if (valid && !ev.dateText) {
      try {
        var d = new Intl.DateTimeFormat('vi-VN', {
          weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz
        }).format(start);
        ev.dateText = d.charAt(0).toUpperCase() + d.slice(1);
        /* Intl viết "Chủ Nhật"; tiếng Việt (và ví dụ trong config.js) viết "Chủ nhật" */
        ev.dateText = ev.dateText.replace(/^Chủ Nhật/, 'Chủ nhật');
      } catch (e) {
        /* Máy cũ không có Intl hay múi giờ: tự viết theo giờ Việt Nam */
        var vn = new Date(startP.ms + VN_OFFSET * 60000);
        ev.dateText = WEEKDAYS[vn.getUTCDay()] + ', ' + pad2(vn.getUTCDate()) + '/' +
          pad2(vn.getUTCMonth() + 1) + '/' + vn.getUTCFullYear();
      }
    }
    /* Chỉ ghi ngày, không ghi giờ: đừng tự viết "07:00" hay "00:00", để trống cho dòng giờ ẩn đi */
    if (valid && !ev.timeText && startP.hasTime) {
      try {
        ev.timeText = new Intl.DateTimeFormat('vi-VN', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz
        }).format(start);
      } catch (e) {
        var vt = new Date(startP.ms + VN_OFFSET * 60000);
        ev.timeText = pad2(vt.getUTCHours()) + ':' + pad2(vt.getUTCMinutes());
      }
    }
    /* Không có chữ ngày giờ thật thì để trống (dòng đó tự ẩn), không để lộ ngày mẫu trong index.html */
    if (!ev.dateText) ev.dateText = '';
    if (!ev.timeText) ev.timeText = '';

    var place = [ev.venue, ev.address].filter(Boolean).join(', ');
    if (!ev.mapUrl) {
      ev.mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place);
    }

    if (valid) {
      var dates;
      if (startP.hasTime) {
        if (!end || end <= start) end = new Date(start.getTime() + 2 * 3600 * 1000);
        var stamp = function (date) {
          return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        };
        dates = stamp(start) + '/' + stamp(end);
      } else {
        /* Chỉ có ngày: thêm vào lịch thành sự kiện cả ngày */
        var day = function (ms) { return isoAt(ms, VN_OFFSET).slice(0, 10).replace(/-/g, ''); };
        dates = day(startP.ms) + '/' + day(startP.ms + 86400000);
      }
      ev.calendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text=' + encodeURIComponent(ev.title || 'Lễ tốt nghiệp') +
        '&dates=' + dates +
        '&location=' + encodeURIComponent(place);
    }

    if (cfg.together && typeof cfg.together === 'object') normalizeDate(cfg.together, 'since', 'together.since');
  }

  /* Ngày giờ hỏng: báo nhỏ cho người gửi (không chặn trang) thay vì lặng lẽ hiện chữ mẫu */
  function showDateNotice() {
    if (!dateProblems.length || qs('.sender-note')) return;
    var box = doc.createElement('div');
    box.className = 'sender-note';
    box.setAttribute('role', 'status');
    /* Chừa góc phải cho nút âm thanh */
    box.style.cssText = 'position:fixed;left:12px;right:64px;top:calc(env(safe-area-inset-top, 0px) + 8px);' +
      'z-index:95;max-width:420px;margin:0 auto;box-sizing:border-box;padding:10px 44px 10px 14px;' +
      'background:#FFFDF9;border:2px solid #E8638C;border-radius:16px;box-shadow:0 6px 20px rgba(91,42,60,.18);' +
      'font:600 14px/1.4 "Baloo 2","Quicksand",system-ui,sans-serif;color:#5B4A4A;transition:opacity .4s ease;';
    var p = doc.createElement('p');
    p.style.cssText = 'margin:0;';
    p.textContent = 'Người gửi ơi: ngày giờ ở ' + dateProblems.join(', ') +
      ' trong config.js chưa đúng dạng nên đang tạm ẩn. Viết như mẫu ';
    var sample = doc.createElement('span');
    sample.style.whiteSpace = 'nowrap';   /* mẫu ngày giờ không bị ngắt đôi giữa dòng */
    sample.textContent = "'2026-11-15T08:00:00+07:00'";
    p.appendChild(sample);
    p.appendChild(doc.createTextNode(' nhé.'));
    var close = doc.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng');
    close.textContent = '×';
    close.style.cssText = 'position:absolute;top:2px;right:2px;width:44px;height:44px;border:0;background:none;' +
      'font:700 24px/1 system-ui,sans-serif;color:#E8638C;cursor:pointer;';
    function gone() {
      box.style.opacity = '0';
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 450);
    }
    close.addEventListener('click', gone);
    box.appendChild(p);
    box.appendChild(close);
    doc.body.appendChild(box);
    setTimeout(gone, 15000);
  }

  /* Dòng ngày hay giờ không có chữ thì ẩn cả dòng (cả nhãn "Ngày"/"Giờ" và biểu tượng).
     Không có link lịch thật thì ẩn nút "Thêm vào lịch". */
  function tidyEventBlocks() {
    ['event.dateText', 'event.timeText'].forEach(function (key) {
      qsa('[data-bind="' + key + '"]').forEach(function (el) {
        var row = el.closest ? el.closest('.info__row') : null;
        if (row && el.hidden) { row.hidden = true; row.style.display = 'none'; }
      });
    });
    if (!isWebUrl(get(cfg, 'event.calendarUrl'))) {
      qsa('a[data-bind-href="event.calendarUrl"]').forEach(function (a) {
        var box = a.closest && a.closest('.page__cta') || a;
        box.hidden = true;
        box.style.display = 'none';
      });
    }
  }

  /* ---------- Đổ chữ vào trang (chỉ dùng textContent) ----------
     Gọi lại được cho một vùng mới thêm; phần tử đã đổ rồi thì bỏ qua. */

  function isWebUrl(v) { return typeof v === 'string' && /^https?:\/\//i.test(v); }

  /* Bong bóng trống (mascot.hint = ''): tàng hình nhưng vẫn "có mặt", để chạm gấu hay
     tính năng lời chào viết chữ vào là hiện ra. Theo dõi chữ vì tính năng phụ có thể tự gán. */
  function unmuteBubble(el) {
    if (el && el.style) el.style.removeProperty('visibility');
  }

  function muteBubble(el) {
    el.style.visibility = 'hidden';
    if (!window.MutationObserver) return;
    var watch = new MutationObserver(function () {
      if (!el.textContent.trim()) return;
      unmuteBubble(el);
      watch.disconnect();
    });
    watch.observe(el, { childList: true, characterData: true, subtree: true });
  }

  function bindContent(scope) {
    qsa('[data-bind]', scope).forEach(function (el) {
      if (el.hasAttribute('data-bound')) return;
      el.setAttribute('data-bound', '');
      var v = get(cfg, el.getAttribute('data-bind'));
      el.textContent = fill(v === undefined || v === null ? el.textContent : v);
      if (!el.textContent.trim()) {
        /* Bong bóng lời gấu còn được viết chữ vào sau (chạm gấu, lời chào): chỉ tàng hình
           lúc trống chứ không ẩn hẳn, có chữ là tự hiện lại */
        if (el.hasAttribute('data-bubble')) muteBubble(el);
        else el.hidden = true;
      }
    });

    qsa('[data-bind-href]', scope).forEach(function (el) {
      var v = get(cfg, el.getAttribute('data-bind-href'));
      if (isWebUrl(v)) el.setAttribute('href', v);
    });

    qsa('[data-bind-src]', scope).forEach(function (el) {
      var v = get(cfg, el.getAttribute('data-bind-src'));
      if (typeof v === 'string' && v) el.setAttribute('src', v);
    });

    qsa('[data-bind-list]', scope).forEach(function (box) {
      if (box.hasAttribute('data-bound')) return;
      box.setAttribute('data-bound', '');
      var list = get(cfg, box.getAttribute('data-bind-list'));
      if (list === undefined || list === null) return;
      /* Lỡ viết lời thư thành một chuỗi (thiếu dấu [ ]) thì vẫn dùng chữ đó, không để lộ chữ mẫu */
      if (typeof list === 'string') list = [list];
      if (!Array.isArray(list)) return;
      list = list.filter(function (t) { return typeof t === 'string' && t.trim(); });
      box.textContent = '';
      if (!list.length) { box.hidden = true; return; }
      list.forEach(function (text, i) {
        var p = doc.createElement('p');
        p.className = 'text';
        p.setAttribute('data-reveal', '');
        p.style.setProperty('--i', String(i + 1));
        p.textContent = fill(text);
        box.appendChild(p);
      });
    });

    var img = qs('.polaroid__img', scope);
    var alt = get(cfg, 'pages.photo.alt');
    if (img && alt) img.setAttribute('alt', fill(alt));
  }

  /* Đếm số ngày bên nhau (chỉ hiện khi config có ngày bắt đầu) */
  function bindTogether() {
    var el = qs('[data-together]');
    var since = get(cfg, 'together.since');
    if (!el || !since) return;

    /* prepareEvent đã chuẩn hoá ngày (chỉ có ngày thì là 0 giờ, giờ Việt Nam) */
    var began = parseDate(since);
    if (isNaN(began)) return;

    var days = Math.floor((Date.now() - began) / 86400000);
    if (days < 0) return;

    var text = get(cfg, 'together.text') || 'Bên nhau {days} ngày rồi đó';
    qs('span', el).textContent = fill(text).split('{days}').join(String(days));
    el.hidden = false;
  }

  /* Thêm một icon vào bộ <symbol> dùng chung (cho các tính năng phụ) */
  function addSymbol(id, viewBox, markup) {
    var sprite = qs('.sprite');
    if (!sprite || doc.getElementById(id)) return;
    var holder = doc.createElementNS(SVG_NS, 'svg');
    holder.innerHTML = '<symbol id="' + id + '" viewBox="' + viewBox + '">' + markup + '</symbol>';
    if (holder.firstChild) sprite.appendChild(holder.firstChild);
  }

  /* ---------- Khởi động ---------- */

  /* Thiếu một file phụ (mạng chập chờn làm rơi đúng một file) thì dùng bản thay thế tối giản,
     để lá thư vẫn mở được thay vì kẹt mãi ở màn chờ. */

  function noop() {}

  /* audio.js chỉ lo âm thanh: thiếu thì im lặng */
  function silentAudio() {
    return {
      flip: noop, pop: noop, chime: noop, tone: noop, duck: noop, setEnabled: noop,
      isEnabled: function () { return false; },
      context: function () { return null; }
    };
  }

  /* effects.js lo hiệu ứng: thiếu thì vẫn có gấu, chữ hiện ngay, không bay nhảy */
  function plainEffects() {
    var api = {
      reduce: true,
      rand: function (a, b) { return a + Math.random() * (b - a); },
      pick: function (list) { return list[Math.floor(Math.random() * list.length)]; },
      icon: function (name, className) {
        var svg = doc.createElementNS(SVG_NS, 'svg');
        var use = doc.createElementNS(SVG_NS, 'use');
        if (className) svg.setAttribute('class', className);
        svg.setAttribute('aria-hidden', 'true');
        use.setAttribute('href', '#i-' + name);
        svg.appendChild(use);
        return svg;
      },
      fly: function (layer, el) { if (el && el.parentNode) el.parentNode.removeChild(el); },
      mountMascots: function (scope) {
        var tpl = doc.getElementById('tpl-mascot');
        if (!tpl || !tpl.content || !tpl.content.firstElementChild) return;
        qsa('[data-mascot]', scope).forEach(function (slot) {
          if (qs('.mascot', slot)) return;
          var node = tpl.content.firstElementChild.cloneNode(true);
          (slot.getAttribute('data-mascot') || '').split(' ').forEach(function (v) {
            if (v) node.classList.add('mascot--' + v);
          });
          slot.appendChild(node);
        });
      },
      initAmbient: noop,
      initTapHearts: noop,
      prepareTypewriter: noop,
      typewriter: noop,
      /* Không chạy được đồng hồ thì giấu các ô 00, đừng để đồng hồ đứng im */
      initCountdown: function (page) {
        var box = page && qs('[data-countdown]', page);
        if (box) box.style.display = 'none';
      },
      hearts: noop,
      finale: noop
    };
    return api;
  }

  /* book.js thiếu: sách vuốt ngang từng trang (giống chế độ dự phòng của book.js) */
  function scrollBook(el) {
    var pages = qsa('.page', el);
    var shownCbs = [];
    var turnCbs = [];
    var current = 0;
    el.classList.add('no-flip');

    function goTo(i) {
      if (i < 0 || i >= pages.length) return;
      var left = i * el.clientWidth;
      try { el.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { el.scrollLeft = left; }
    }

    el.addEventListener('scroll', function () {
      var i = Math.round(el.scrollLeft / (el.clientWidth || 1));
      if (i === current || i < 0 || i >= pages.length) return;
      current = i;
      turnCbs.forEach(function (cb) { cb(); });
      shownCbs.forEach(function (cb) { cb(i, pages[i]); });
    }, { passive: true });

    return {
      mode: 'scroll',
      pages: pages,
      count: pages.length,
      current: function () { return current; },
      onShown: function (cb) { shownCbs.push(cb); },
      onTurnStart: function (cb) { turnCbs.push(cb); },
      next: function () { goTo(current + 1); },
      prev: function () { goTo(current - 1); },
      goTo: goTo
    };
  }

  /* Tính năng phụ có được chạy không:
     - features['ten'] = false: tắt; = true: bật.
     - Không có dòng đó: theo mặc định của tính năng (defaultOn: false là tắt).
     - File css/cute/<ten>.css không tải được: bỏ qua, kẻo hình vẽ không có kiểu che hết chữ. */
  function featureWanted(f) {
    if (!f || !f.name) return false;
    var sw = cfg.features && typeof cfg.features === 'object' ? cfg.features[f.name] : undefined;
    if (sw === false) return false;
    if (sw === undefined && f.defaultOn === false) return false;
    if (!styleLoaded(f.name)) {
      complain(f.name, 'không tải được css/cute/' + f.name + '.css nên tạm tắt tính năng này');
      return false;
    }
    return true;
  }

  function styleLoaded(name) {
    var link = qs('link[href*="css/cute/' + name + '.css"]');
    if (!link) return true;   /* tính năng không có file kiểu riêng */
    /* "Người canh" trong index.html ghi lại các file không tải được */
    var href = link.getAttribute('href');
    if ((Invite.failedFiles || []).indexOf(href) !== -1) return false;
    var sheet = link.sheet;
    if (!sheet) return false;
    try {
      return !!(sheet.cssRules && sheet.cssRules.length);
    } catch (e) {
      /* File tải hỏng thì Chrome cấm đọc luật. Nhưng mở thẳng file trên máy (file://) thì
         trình duyệt cũng cấm đọc dù đã tải được, nên trường hợp đó cứ coi là có. */
      return location.protocol === 'file:';
    }
  }

  function init() {
    var bookEl = qs('#book');
    var stageEl = qs('#stage');
    if (!bookEl || !stageEl) return;

    /* config.js gõ lỗi (thường là thiếu dấu phẩy hay dấu ' nằm trong chữ): báo rõ cho người gửi,
       không dựng sách bằng chữ mẫu. Bảng báo lỗi nằm trong index.html để vẫn hiện khi main.js hỏng. */
    if (!window.INVITE_CONFIG) {
      if (typeof Invite.showConfigError === 'function') Invite.showConfigError();
      complain('config.js', 'không đọc được window.INVITE_CONFIG');
      return;
    }

    var fx = Invite.effects || plainEffects();
    var audio = Invite.audio || silentAudio();
    if (!Invite.effects) complain('effects.js', 'không tải được, dùng bản tối giản');
    if (!Invite.audio) complain('audio.js', 'không tải được, tắt âm thanh');
    if (!Invite.createBook) complain('book.js', 'không tải được, dùng sách vuốt ngang');

    var book = null;
    var ready = false;        /* sách đã được phép hiện nội dung chưa */
    var loaderGone = false;
    var isYes = store.get('rsvp') === '1';   /* người nhận đã bấm đồng ý chưa (nhớ từ lần trước) */

    /* ----- Tính năng phụ ----- */

    var features = (Invite.features || []).filter(featureWanted);
    var running = null;
    var gates = [];

    /* "Cổng chờ": một tính năng mở đầu (ví dụ phong bì) giữ sách lại cho tới khi
       nó gọi hàm trả về. Tính năng lỗi thì cổng của nó tự mở. */
    function gate() {
      var g = { open: false, owner: running };
      gates.push(g);
      return function release() {
        if (g.open) return;
        g.open = true;
        maybeStart();
      };
    }

    function runHook(hook) {
      features.forEach(function (f) {
        if (f.failed || typeof f[hook] !== 'function') return;
        running = f;
        try {
          f[hook](ctx);
        } catch (e) {
          f.failed = true;
          gates.forEach(function (g) { if (g.owner === f) g.open = true; });
          complain(f.name + '.' + hook, e);
        }
        running = null;
      });
    }

    /* Thêm một trang vào sách. Chỉ gọi được trong setup(). */
    function addPage(opts) {
      if (book) throw new Error('addPage chỉ dùng được trong setup()');
      opts = opts || {};
      var sec = doc.createElement('section');
      sec.className = 'page ' + (opts.className || '');
      if (opts.label) sec.setAttribute('aria-label', opts.label);

      var inner = doc.createElement('div');
      inner.className = 'page__inner';
      inner.innerHTML = opts.html || '';
      var num = doc.createElement('span');
      num.className = 'page__num';
      inner.appendChild(num);
      sec.appendChild(inner);

      var ref = (opts.before && qs(opts.before, bookEl)) || qs('.page--back', bookEl);
      bookEl.insertBefore(sec, ref && ref.parentNode === bookEl ? ref : null);
      return sec;
    }

    var ctx = {
      cfg: cfg,
      reduce: reduce,
      audio: audio,
      fx: fx,
      store: store,
      names: { to: toName, from: fromName },
      bookEl: bookEl,
      stageEl: stageEl,
      book: null,
      get: function (path) { return get(cfg, path); },
      /* chuỗi ngày giờ -> mili giây, đọc được cả '2026-11-15 08:00' và '15/11/2026 08:00' trên Safari */
      parseDate: parseDate,
      fill: fill,
      qs: qs,
      qsa: qsa,
      replay: replay,
      on: on,
      emit: emit,
      symbol: addSymbol,
      overlay: Invite.overlay,
      bind: bindContent,
      addPage: addPage,
      gate: gate,
      refit: function () { if (book) fitPages(); },
      /* Cho bạn gấu nói một câu: scope là nút gấu (hoặc vùng chứa nó) có bong bóng [data-bubble] */
      say: function (scope, text) {
        var bubble = scope && (scope.matches && scope.matches('[data-bubble]') ? scope : qs('[data-bubble]', scope));
        if (!bubble) return false;
        unmuteBubble(bubble);
        bubble.textContent = fill(text);
        if (!reduce) replay(bubble, 'is-pop', 450);
        return true;
      },
      started: function () { return ready; },
      saidYes: function () { return isYes; },
      pageIndex: function (selector) {
        if (!book) return -1;
        for (var i = 0; i < book.pages.length; i++) {
          if (book.pages[i].matches(selector)) return i;
        }
        return -1;
      }
    };
    Invite.ctx = ctx;

    prepareEvent();
    runHook('setup');
    bindContent(doc);
    tidyEventBlocks();
    bindTogether();
    showDateNotice();

    /* Đánh số trang theo thứ tự thật (bìa là trang 0) */
    qsa('.page', bookEl).forEach(function (page, i) {
      var num = qs('.page__num', page);
      if (num) num.textContent = String(i);
    });

    fx.mountMascots(doc);
    qsa('[data-typewriter]').forEach(fx.prepareTypewriter);
    fx.initAmbient(qs('#ambient'));
    fx.initTapHearts(qs('#fx'));
    /* Truyền thẳng mili giây đã đọc, để đồng hồ không phụ thuộc cách trình duyệt đọc chuỗi */
    fx.initCountdown(qs('.page--count'), parseDate(cfg.event && cfg.event.start));

    book = Invite.createBook ? Invite.createBook(bookEl, { reduceMotion: reduce }) : scrollBook(bookEl);
    ctx.book = book;
    Invite.book = book;

    /* Lời thư dài hơn trang thì tự thu nhỏ chữ cho vừa, không để bị cắt mất.
       Trang đang ẩn được bày tạm ra (vô hình) để đo rồi trả lại như cũ. */
    var MIN_FONT = 11;

    /* Chữ trên nút bị xuống dòng (máy nhỏ hoặc chữ dài) thì thu gọn lề và cỡ chữ của nút đó.
       Vẫn không vừa thì để hai dòng, cân đối. */
    function wraps(btn) {
      var label = btn.lastElementChild;
      if (!label || label.tagName === 'svg') return false;
      var lh = parseFloat(getComputedStyle(label).lineHeight) || parseFloat(getComputedStyle(label).fontSize) * 1.2;
      return label.getBoundingClientRect().height > lh * 1.5;
    }

    function fitButtons(scope) {
      qsa('.btn', scope).forEach(function (btn) {
        btn.classList.remove('btn--tight', 'btn--tighter');
        if (btn.offsetParent === null || !wraps(btn)) return;
        btn.classList.add('btn--tight');
        /* Gọn rồi mà vẫn hai dòng: bỏ biểu tượng trong nút để chữ có thêm chỗ */
        if (wraps(btn)) btn.classList.add('btn--tighter');
      });
    }

    function fitPages() {
      var w = stageEl.clientWidth;
      var h = stageEl.clientHeight;
      if (!w || !h) return;

      book.pages.forEach(function (page) {
        var inner = qs('.page__inner', page);
        if (!inner) return;

        var hidden = getComputedStyle(page).display === 'none';
        var saved = page.style.cssText;
        if (hidden) {
          page.style.cssText = 'display:block;visibility:hidden;position:absolute;left:0;top:0;' +
            'width:' + w + 'px;height:' + h + 'px;';
        }

        inner.style.fontSize = '';
        fitButtons(inner);
        var size = parseFloat(getComputedStyle(inner).fontSize) || 16;
        var guard = 0;
        while (inner.scrollHeight > inner.clientHeight + 1 && size > MIN_FONT && guard < 30) {
          size -= 0.5;
          inner.style.fontSize = size + 'px';
          guard++;
        }

        if (hidden) page.style.cssText = saved;
      });
    }

    var fitTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(fitPages, 180);
    });

    /* Chấm chỉ trang (hình trái tim), mũi tên */
    var dotsEl = qs('#dots');
    var prevBtn = qs('#btn-prev');
    var nextBtn = qs('#btn-next');
    var statusEl = qs('#page-status');
    var dots = book.pages.map(function () {
      var li = doc.createElement('li');
      var svg = doc.createElementNS(SVG_NS, 'svg');
      var use = doc.createElementNS(SVG_NS, 'use');
      use.setAttribute('href', '#i-heart');
      svg.appendChild(use);
      li.appendChild(svg);
      dotsEl.appendChild(li);
      return li;
    });
    if (book.count > 8) dotsEl.classList.add('dots--many');

    var focusNextOnCover = false;   /* vừa bấm "Đọc lại từ đầu" bằng bàn phím */

    function updateChrome(i) {
      dots.forEach(function (d, n) { d.classList.toggle('is-on', n === i); });
      prevBtn.disabled = i <= 0;
      nextBtn.disabled = i >= book.count - 1;
      if (focusNextOnCover && i === 0) {
        focusNextOnCover = false;
        try { nextBtn.focus({ preventScroll: true }); } catch (e) { nextBtn.focus(); }
      }
      var label = 'Trang ' + (i + 1) + ' trên ' + book.count;
      if (statusEl.textContent !== label) statusEl.textContent = label;
      root.setAttribute('data-page', String(i));
    }

    function showPage(i) {
      updateChrome(i);
      if (!ready) return;
      var page = book.pages[i];
      if (!page) return;
      var first = !page.classList.contains('is-seen');
      page.classList.add('is-seen');
      var tw = qs('[data-typewriter]', page);
      if (tw) setTimeout(function () { fx.typewriter(tw); }, 420);
      emit('shown', { index: i, page: page, first: first });
    }

    /* Sách chỉ "lên đèn" khi màn chờ đã tắt và mọi cổng chờ đã mở */
    function maybeStart() {
      if (ready || !loaderGone || !book) return;
      for (var i = 0; i < gates.length; i++) {
        if (!gates[i].open) return;
      }
      ready = true;
      showPage(book.current());
      emit('start', { book: book });
    }

    book.onShown(showPage);
    book.onTurnStart(function () {
      audio.flip();
      emit('turn');
    });
    updateChrome(book.current());

    prevBtn.addEventListener('click', function () { book.prev(); });
    nextBtn.addEventListener('click', function () { book.next(); });

    doc.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); book.next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); book.prev(); }
      else if (e.key === 'Home') { e.preventDefault(); book.goTo(0); }
    });

    /* Thư viện lật trang bỏ qua cú chạm bắt đầu trên nút, nên vuốt ngang
       qua bạn gấu hay tấm ảnh sẽ không lật. Tự bắt cú vuốt đó ở đây.
       Nút nào cần chạm nhanh liên tục hoặc giữ lâu (trò chơi) thì gắn data-no-swipe
       để ngón tay lỡ trượt ngang cũng không làm lật trang. */
    if (book.mode === 'flip') {
      var swipe = null;
      bookEl.addEventListener('touchstart', function (e) {
        var onButton = e.target && e.target.closest ? e.target.closest('button, a') : null;
        if (!onButton || onButton.closest('[data-no-swipe]') || !e.changedTouches.length) { swipe = null; return; }
        var p = e.changedTouches[0];
        swipe = { x: p.clientX, y: p.clientY, t: Date.now() };
      }, { passive: true });
      bookEl.addEventListener('touchend', function (e) {
        if (!swipe || !e.changedTouches.length) return;
        var p = e.changedTouches[0];
        var dx = p.clientX - swipe.x;
        var dy = p.clientY - swipe.y;
        var dt = Date.now() - swipe.t;
        swipe = null;
        if (Math.abs(dx) > 30 && Math.abs(dy) < 60 && dt < 600) {
          if (dx < 0) book.next(); else book.prev();
        }
      }, { passive: true });
    }

    /* Nút âm thanh */
    var soundBtn = qs('#btn-sound');
    function paintSound() {
      var soundOn = audio.isEnabled();
      soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      soundBtn.setAttribute('aria-label', soundOn ? 'Tắt âm thanh' : 'Bật âm thanh');
    }
    paintSound();
    soundBtn.addEventListener('click', function () {
      audio.setEnabled(!audio.isEnabled());
      paintSound();
      audio.pop();
      emit('sound', { enabled: audio.isEnabled() });
    });

    /* ---------- Chạm vào bạn gấu ---------- */

    function pet(btn, e) {
      audio.pop();
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }

      var bubble = qs('[data-bubble]', btn);
      var says = get(cfg, 'mascot.says');
      if (bubble && Array.isArray(says) && says.length) {
        var n = btn._say || 0;
        unmuteBubble(bubble);
        bubble.textContent = fill(says[n % says.length]);
        btn._say = n + 1;
        if (!reduce) replay(bubble, 'is-pop', 450);
      }

      if (!reduce) {
        replay(btn, 'is-pet', 650);
        fx.hearts(btn, { count: 7, near: 46, far: 96, at: 0.45 });
      }
      /* x, y là toạ độ màn hình của cú chạm (0, 0 nếu bấm bằng bàn phím) */
      emit('pet', { button: btn, x: e ? e.clientX : 0, y: e ? e.clientY : 0 });
    }

    /* ---------- Trang lời mời cuối ---------- */

    var rsvpPage = qs('.page--rsvp');
    var yesBtn = rsvpPage ? qs('[data-action="rsvp"]', rsvpPage) : null;
    var noBtn = rsvpPage ? qs('[data-action="rsvp-no"]', rsvpPage) : null;
    var noCount = 0;

    function paintRsvpYes() {
      isYes = true;
      if (!rsvpPage) return;
      var q = qs('[data-rsvp-question]', rsvpPage);
      var label = qs('[data-rsvp-label]', rsvpPage);
      var after = get(cfg, 'pages.rsvp.after') || 'Yay! Hẹn gặp nhé!';
      var again = get(cfg, 'pages.rsvp.again') || 'Ăn mừng lần nữa';
      rsvpPage.classList.add('is-yes');
      if (q) q.textContent = fill(after);
      if (label) label.textContent = fill(again);
      if (yesBtn) yesBtn.style.removeProperty('--grow');
      if (noBtn) noBtn.hidden = true;
      /* Nhãn mới dài hơn: đo lại cho nút và trang (lúc mới mở thư thì sách chưa dựng, bỏ qua) */
      if (book) fitPages();
    }
    if (store.get('rsvp') === '1') paintRsvpYes();

    /* Nút từ chối cho vui: nhảy đi, nhỏ lại, đổi câu. Nút đồng ý thì to dần. */
    function rsvpNo() {
      if (!noBtn || !yesBtn) return;
      var replies = get(cfg, 'pages.rsvp.noReplies');
      if (!Array.isArray(replies)) replies = [];

      audio.pop();
      if (noCount >= replies.length) {
        /* Nút đang được chọn (bàn phím, trình đọc màn hình) mà biến mất thì tiêu điểm rơi về
           đầu trang: chuyển sang nút đồng ý trước khi ẩn */
        if (doc.activeElement === noBtn) {
          try { yesBtn.focus({ preventScroll: true }); } catch (e) { yesBtn.focus(); }
        }
        noBtn.hidden = true;
        yesBtn.style.setProperty('--grow', '1');
        if (!reduce) fx.hearts(yesBtn, { count: 6, near: 40, far: 90 });
        emit('rsvp-no', { count: noCount, gone: true });
        return;
      }

      var label = qs('[data-rsvp-no]', noBtn);
      if (label) label.textContent = fill(replies[noCount]);
      noCount++;

      var room = (yesBtn.parentNode.clientWidth - 6) / yesBtn.offsetWidth;
      var grow = Math.max(1, Math.min(1.28, room, 1 + noCount * 0.07));
      yesBtn.style.setProperty('--grow', grow.toFixed(3));

      var shrink = Math.max(0.72, 1 - noCount * 0.07);
      if (reduce) {
        noBtn.style.transform = 'scale(' + shrink + ')';
      } else {
        var side = noCount % 2 ? 1 : -1;
        var dx = side * fx.rand(16, 30);
        noBtn.style.transform = 'translateX(' + dx.toFixed(0) + '%) rotate(' + (dx / 4).toFixed(1) + 'deg) scale(' + shrink + ')';
      }
      emit('rsvp-no', { count: noCount, gone: false });
    }

    /* ---------- Các nút nằm trong trang sách ---------- */

    doc.addEventListener('click', function (e) {
      var target = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
      if (!target) return;
      var action = target.getAttribute('data-action');

      if (action === 'rsvp') {
        var again = isYes;
        paintRsvpYes();
        store.set('rsvp', '1');
        audio.chime();
        fx.finale({ page: rsvpPage, origin: target });
        emit('rsvp-yes', { button: target, page: rsvpPage, again: again });
      } else if (action === 'rsvp-no') {
        rsvpNo();
      } else if (action === 'pet') {
        pet(target, e);
      } else if (action === 'restart') {
        audio.pop();
        /* Bìa sau quay đi thì nút này khuất: tới bìa trước, đưa tiêu điểm sang nút "Trang sau" */
        if (doc.activeElement === target) focusNextOnCover = true;
        book.goTo(0);
      } else if (action === 'wobble') {
        audio.pop();
        if (!reduce) {
          replay(target, 'is-wobble');
          fx.hearts(target, { count: 5, near: 60, far: 110, at: 0.4 });
        }
        emit('wobble', { button: target });
      }
    });

    /* Giúp hiệu ứng nhấn nút (:active) chạy trên iOS */
    doc.addEventListener('touchstart', function () {}, { passive: true });

    runHook('ready');

    /* Ẩn màn chờ khi font và trang đã tải, tối đa 2,5 giây */
    var loader = qs('#loader');
    var began = Date.now();
    var closed = false;

    function closeLoader() {
      if (closed) return;
      closed = true;
      var wait = Math.max(0, 900 - (Date.now() - began));
      setTimeout(function () {
        if (loader) {
          loader.classList.add('is-done');
          setTimeout(function () { loader.remove(); }, 800);
        }
        loaderGone = true;
        /* Mở được rồi: lần sau lỡ kẹt thì "người canh" trong index.html lại được tải lại trang một lần */
        try { sessionStorage.removeItem('invite:reloaded'); } catch (e) {}
        fitPages();
        emit('loader-closed');
        maybeStart();
      }, wait);
    }

    /* Font nằm sẵn trong dự án (css/fonts.css). Gọi tải đúng các font đang dùng để lúc chữ
       hiện ra đã đúng font. Quá 2,5 giây thì hiện luôn bằng font có sẵn của máy. */
    var fontsReady = Promise.resolve();
    if (doc.fonts && doc.fonts.load) {
      var sample = 'Thư mời dự Lễ tốt nghiệp ặ ữ';
      var faces = ['700 1em "Baloo 2"', '500 1em "Mali"', '400 1em "Pacifico"', '500 1em "Quicksand"'];
      fontsReady = Promise.all(faces.map(function (face) {
        return doc.fonts.load(face, sample).then(null, function () {});
      }));
    }

    /* Font về muộn (sau khi sách đã hiện) thì đo lại cho chữ vừa trang */
    if (doc.fonts && doc.fonts.addEventListener) {
      doc.fonts.addEventListener('loadingdone', function () {
        clearTimeout(fitTimer);
        fitTimer = setTimeout(fitPages, 150);
      });
    }
    var pageLoaded = new Promise(function (resolve) {
      if (doc.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });
    Promise.all([fontsReady, pageLoaded]).then(closeLoader, closeLoader);
    setTimeout(closeLoader, 2500);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
