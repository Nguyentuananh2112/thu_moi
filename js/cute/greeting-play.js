/* =====================================================================
   greeting-play.js - trang lời chào sống động (tính năng phụ)

   Bốn phần nhỏ diễn chung một cảnh trên trang lời chào, bật tắt riêng
   trong config.js, mục "greetingPlay":

   1. "Viết rồi xoá": lần đầu mở thư, tiêu đề gõ nhầm một dòng thật trịnh
      trọng, bạn gấu kêu lên, dòng đó bị xoá đi rồi lời chào thật mới hiện.
   2. Dấu bưu điện "đã đến tay": đóng cộp lên góc con tem, ghi ngày giờ
      người nhận mở thư lần đầu.
   3. Câu chào đầu tiên của gấu: theo giờ trong ngày, hoặc trêu khi mở lại.
   4. Đêm khuya gấu ngủ gật (đội mũ ngủ), chạm vào thì tỉnh.

   Xem thử từng khung giờ: thêm ?hour=23 (0 đến 23) vào cuối link.
   Không gửi gì đi đâu cả, mọi ghi nhớ nằm trên máy người xem.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var KEY_GAG = 'greeting-play:gag';        /* đã xem trò viết rồi xoá chưa */
  var KEY_FIRST = 'greeting-play:first';    /* thời điểm mở thư lần đầu (mili giây) */
  var KEY_VISITS = 'greeting-play:visits';  /* số lần đã mở thư */

  var NIGHT = 'greeting-play--night';
  var LONG = 'greeting-play__bubble--long';
  var ZZZ = 'Zzz…';
  var HINT = 'Chạm vào gấu nè!';
  var TEASE_NO_NAME = 'Lần thứ {n} mở thư rồi nha!';
  var PET_LABEL_ASLEEP = 'Bạn gấu đang ngủ, chạm để gọi dậy';
  var LABEL_MAX = 96;                       /* bề ngang tối đa của nhãn trong vòng dấu (đơn vị SVG) */

  var DEFAULTS = {
    wrong: 'Kính gửi Quý khách,',
    oops: 'Ấy, nghiêm túc quá!',
    postmarkLabel: 'ĐÃ ĐẾN TAY',
    helloLines: {
      morning: 'Chào buổi sáng, {to}!',
      noon: '{to} ăn cơm chưa?',
      afternoon: 'Chiều rồi, uống miếng nước đi nha',
      evening: 'Buổi tối vui vẻ nha {to}',
      night: 'Khuya rồi, đọc xong ngủ sớm nha'
    },
    wakeLine: 'Ơ… {to} tới rồi hả?',
    teaseLine: 'Lần thứ {n} mở thư rồi nha. Nhớ {from} hả?'
  };

  /* Dấu bưu điện: vòng mực, ba dòng chữ thẳng, hai trái tim nhỏ và ba vạch sóng huỷ tem.
     Chữ được gán sau bằng textContent, ở đây chỉ có hình tĩnh. Độ nghiêng -14 độ nằm ngay trong
     hình vẽ (không xoay bằng CSS) để khung bao của dấu đúng bằng phần mực nhìn thấy.
     Trái tim hồng của con tem nằm ở nửa trên vòng mực, nên ba dòng chữ dồn xuống nửa dưới: ngày
     tháng (phần đáng nhớ nhất) nằm ngay dưới mũi trái tim, trên nền giấy trắng của tem.
     Nét vẽ và chữ là hai lớp mực riêng: chữ đậm hơn một chút và có viền màu giấy mỏng
     (xem CSS) để vẫn đọc được chỗ chữ chạm vào trái tim hồng. */
  var HEART_D = 'M12 21.2c-.4 0-.8-.1-1.1-.4C6.1 17 2 13.4 2 8.9 2 6 4.2 3.8 7 3.8c1.9 0 3.6 1 5 2.9 1.4-1.9 3.1-2.9 5-2.9 2.8 0 5 2.2 5 5.1 0 4.5-4.1 8.1-8.9 11.9-.3.3-.7.4-1.1.4z';
  var MARK_SVG =
    '<svg class="greeting-play__ink" viewBox="0 -13 137.5 143" focusable="false">' +
      '<g transform="rotate(-14 65 65)">' +
        '<g class="greeting-play__ink-lines">' +
          '<circle cx="65" cy="65" r="62" fill="none" stroke="currentColor" stroke-width="5"/>' +
          '<path fill="currentColor" transform="translate(28 94) scale(.46)" d="' + HEART_D + '"/>' +
          '<path fill="currentColor" transform="translate(91 94) scale(.46)" d="' + HEART_D + '"/>' +
          '<path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" ' +
            'd="M106 12q2.75-6.5 5.5 0t5.5 0 5.5 0 5.5 0 5.5 0 5.5 0 5.5 0 5.5 0' +
            'M122.5 25q2.75-6.5 5.5 0t5.5 0 5.5 0 5.5 0 5.5 0' +
            'M128 38q2.75-6.5 5.5 0t5.5 0 5.5 0 5.5 0"/>' +
        '</g>' +
        '<g class="greeting-play__ink-words">' +
          '<text class="greeting-play__mark-label" x="65" y="60"></text>' +
          '<text class="greeting-play__mark-date" x="65" y="86"></text>' +
          '<text class="greeting-play__mark-time" x="65" y="106"></text>' +
        '</g>' +
      '</g>' +
    '</svg>';

  /* Phần vẽ thêm cho bạn gấu lúc ngủ. Chỉ THÊM vào khuôn gấu, mặc định ẩn (xem file CSS),
     vì các tính năng khác cũng vẽ thêm lên cùng cái khuôn này. */
  var SLEEP_EYES =
    '<g class="m-greeting-play-sleep">' +
      '<path d="M65.5 109q7.5 8.5 15 0M119.5 109q7.5 8.5 15 0" fill="none" stroke="#43384C" stroke-width="3.4" stroke-linecap="round"/>' +
    '</g>';
  var NIGHT_CAP =
    '<g class="m-greeting-play-cap">' +
      '<path d="M151 70C150 38 128 11 97 9 64 7 31 30 15 74c13-15 25-22 38-22-3 6-4 12-4 18z" fill="#B7A2EE"/>' +
      '<path d="M128 26c11 11 18 26 20 42M97 9c-9 0-18 2-27 6" fill="none" stroke="#9B7FE0" stroke-width="3" stroke-linecap="round" opacity=".45"/>' +
      '<path transform="translate(88 20) scale(1.05)" fill="#FFE9A8" d="M12 3.5c.7 5.2 3.3 7.8 8.5 8.5-5.2.7-7.8 3.3-8.5 8.5-.7-5.2-3.3-7.8-8.5-8.5 5.2-.7 7.8-3.3 8.5-8.5z"/>' +
      '<path d="M47 72Q100 45 153 72" fill="none" stroke="#E9DEFF" stroke-width="17" stroke-linecap="round"/>' +
      '<path d="M47 70Q100 43 153 70" fill="none" stroke="#FFFDF9" stroke-width="14" stroke-linecap="round"/>' +
      '<circle cx="15" cy="80" r="12.5" fill="#F6C453"/>' +
      '<circle cx="15" cy="78.5" r="11.5" fill="#FFE9A8"/>' +
    '</g>';
  var SLEEP_ZZ =
    '<g class="m-greeting-play-zz" fill="none" stroke="#8A72D6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<g transform="translate(165 26)"><path class="m-greeting-play-z" d="M0 0h8l-8 9h8"/></g>' +
      '<g transform="translate(176 6) scale(1.3)"><path class="m-greeting-play-z m-greeting-play-z--2" d="M0 0h8l-8 9h8"/></g>' +
      '<g transform="translate(190 -19) scale(1.65)"><path class="m-greeting-play-z m-greeting-play-z--3" d="M0 0h8l-8 9h8"/></g>' +
    '</g>';

  /* ---------- Đồ nghề nhỏ ---------- */

  function text(v, fallback) {
    return typeof v === 'string' && v.replace(/\s+/g, '') ? v : fallback;
  }

  /* Tách chữ theo từng ký tự thật (dấu tiếng Việt gộp lại) để không gõ ra chữ thiếu dấu */
  function chars(str) {
    str = String(str);
    if (str.normalize) str = str.normalize('NFC');
    return Array.from ? Array.from(str) : str.split('');
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function span(className) {
    var el = doc.createElement('span');
    el.className = className;
    return el;
  }

  function complain(where, err) {
    if (window.console && console.error) console.error('[thu-moi] greeting-play ' + where + ':', err);
  }

  function readOptions(ctx) {
    var o = ctx.get('greetingPlay');
    if (!o || typeof o !== 'object') o = {};
    var lines = o.helloLines && typeof o.helloLines === 'object' ? o.helloLines : {};
    var names = ['morning', 'noon', 'afternoon', 'evening', 'night'];
    var hello = {};
    for (var i = 0; i < names.length; i++) {
      hello[names[i]] = text(lines[names[i]], DEFAULTS.helloLines[names[i]]);
    }
    return {
      rewrite: o.rewrite !== false,
      rewriteEvery: o.rewriteEvery === true,
      wrong: text(o.wrong, DEFAULTS.wrong),
      oops: text(o.oops, DEFAULTS.oops),
      postmark: o.postmark !== false,
      postmarkLabel: text(o.postmarkLabel, DEFAULTS.postmarkLabel),
      hello: o.hello !== false,
      helloLines: hello,
      sleepy: o.sleepy !== false,
      wakeLine: text(o.wakeLine, DEFAULTS.wakeLine),
      tease: o.tease !== false,
      teaseLine: text(o.teaseLine, DEFAULTS.teaseLine)
    };
  }

  /* Giờ trên máy người xem. Thêm ?hour=23 vào link để xem thử từng khung giờ. */
  function readHour() {
    var hour = new Date().getHours();
    try {
      var q = new URLSearchParams(location.search).get('hour');
      if (q !== null && /^\d{1,2}$/.test(q) && Number(q) <= 23) hour = Number(q);
    } catch (e) {}
    return hour;
  }

  function slotOf(hour) {
    if (hour >= 5 && hour <= 10) return 'morning';
    if (hour >= 11 && hour <= 13) return 'noon';
    if (hour >= 14 && hour <= 17) return 'afternoon';
    if (hour >= 18 && hour <= 21) return 'evening';
    return 'night';
  }

  /* ---------- Trạng thái của cả cảnh ---------- */

  var C = null;            /* ctx của trang */
  var opts = null;
  var page = null;
  var titleEl = null;
  var petBtn = null;
  var bubble = null;
  var markEl = null;
  var labelEl = null;
  var wrongEl = null;      /* lớp chữ viết nhầm, chỉ tồn tại trong lúc diễn */
  var tw = null;           /* tiêu đề thật: { full, chars, on, off } */
  var petLabel = '';
  var live = null;         /* dòng ẩn ngoài trang sách, đọc lời gấu cho trình đọc màn hình */
  var liveTimer = null;
  var wakeFollow = '';     /* giảm chuyển động: câu chào ban đêm để dành cho lần chạm sau khi gấu tỉnh */

  var st = {
    index: -1,
    hour: 12,
    visits: 1,
    firstVisit: true,      /* chưa từng có dấu bưu điện trên máy này */
    firstTs: 0,
    gag: false,            /* lần này có diễn trò viết rồi xoá không */
    seq: 'idle',           /* idle -> running -> done */
    hello: 'pending',      /* pending -> said */
    petted: false,
    asleep: false,
    lastSaid: null         /* câu gần nhất do tính năng này đặt vào bong bóng */
  };

  /* Mọi hẹn giờ của màn diễn gom về đây: khi người đọc lật trang giữa chừng thì huỷ hết
     một lượt rồi nhảy thẳng tới trạng thái cuối. */
  var timers = [];
  var ticker = null;
  var hintTimer = null;

  function later(fn, ms) {
    var id = setTimeout(function () {
      try { fn(); } catch (e) { complain('hẹn giờ', e); settle(); }
    }, ms);
    timers.push(id);
    return id;
  }

  function clearAll() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  /* Chạy "count" bước, mỗi bước cách nhau "ms". Chữ quá dài thì mỗi nhịp đi nhiều bước
     để tổng thời gian không vượt "cap" (trình duyệt không hẹn giờ mau hơn chừng 16 ms). */
  function tick(count, ms, cap, step, done) {
    if (count <= 0) { done(); return; }
    var per = 1;
    if (cap && count * ms > cap) {
      ms = Math.max(16, cap / count);
      per = Math.max(1, Math.ceil(count * ms / cap - 0.001));
    }
    var i = 0;
    ticker = setInterval(function () {
      try {
        i = Math.min(count, i + per);
        step(i);
        if (i >= count) {
          clearInterval(ticker);
          ticker = null;
          done();
        }
      } catch (e) {
        complain('gõ chữ', e);
        settle();
      }
    }, ms);
  }

  function onPage() {
    return !!(C && C.book && C.started() && C.book.current() === st.index);
  }

  /* ---------- Bong bóng lời nói của gấu ---------- */

  function canSpeak() {
    return !!(petBtn && bubble && !bubble.hidden);
  }

  /* Câu dài (tên người nhận dài) thì chữ nhỏ lại một chút cho bong bóng khỏi lấn chỗ của gấu */
  function markLong() {
    if (!bubble) return;
    if (chars(bubble.textContent).length > 30) bubble.classList.add(LONG);
    else bubble.classList.remove(LONG);
  }

  /* Bong bóng nằm trong nút gấu, mà nhãn của nút (aria-label) thay hết chữ bên trong, nên trình đọc
     màn hình không bao giờ đọc được lời gấu nói. Chép câu đó sang một dòng ẩn nằm ngoài trang sách
     (aria-live) để được đọc lên. "Zzz…" thì thôi: nhãn nút đã nói là gấu đang ngủ. */
  function announce(line) {
    if (!live || !line || line === ZZZ || !onPage()) return;
    clearTimeout(liveTimer);
    live.textContent = '';
    /* Xoá trước rồi một nhịp sau mới ghi: câu trùng với câu vừa đọc vẫn được đọc lại */
    liveTimer = setTimeout(function () {
      liveTimer = null;
      if (live) live.textContent = line;
    }, 80);
  }

  function say(line) {
    if (!canSpeak()) return false;
    C.say(petBtn, line);
    st.lastSaid = bubble.textContent;
    markLong();
    announce(bubble.textContent);
    return true;
  }

  /* Đổi chữ trong bong bóng mà không bật nảy (lúc trang chưa hiện hoặc đang bị lật đi) */
  function sayQuietly(line) {
    if (!canSpeak()) return;
    bubble.textContent = C.fill(line);
    st.lastSaid = null;
    markLong();
  }

  function hintLine() {
    return text(C.get('mascot.hint'), HINT);
  }

  /* Bong bóng còn đang hiện đúng câu do tính năng này đặt (chưa bị ai đổi) */
  function bubbleIsOurs() {
    return !!(bubble && st.lastSaid !== null && bubble.textContent === st.lastSaid);
  }

  function firstWords() {
    if (opts.tease && st.visits >= 2) {
      var line = opts.teaseLine;
      /* Chưa điền tên người gửi (hoặc chỉ gõ toàn dấu cách) mà câu lại nhắc tên thì dùng câu không cần tên */
      if (!String(C.names.from || '').replace(/\s+/g, '') && line.indexOf('{from}') !== -1) line = TEASE_NO_NAME;
      return line.split('{n}').join(String(st.visits));
    }
    if (opts.hello) return opts.helloLines[slotOf(st.hour)];
    return '';
  }

  function restoreHint() {
    hintTimer = null;
    if (st.petted || st.asleep || !bubbleIsOurs()) return;
    say(hintLine());
    st.lastSaid = null;
  }

  /* Câu chào đầu tiên: nói một lần, sau khi tiêu đề đã gõ xong và trang đang được đọc */
  function greet() {
    if (st.hello !== 'pending' || st.seq !== 'done' || !onPage()) return;
    st.hello = 'said';

    if (st.asleep) {
      /* Gấu đang ngủ: nếu vừa nói mớ trong trò viết rồi xoá thì ngủ tiếp */
      if (bubbleIsOurs()) { say(ZZZ); st.lastSaid = null; }
      return;
    }
    if (st.petted) return;

    var line = firstWords();
    if (line && say(line)) {
      /* Lát sau nhắc lại rằng gấu chạm được, nếu người đọc chưa chạm. Giảm chuyển động thì giữ
         nguyên câu chào: đổi chữ làm bong bóng đổi cỡ, gấu sẽ tự xê dịch dù không ai chạm. */
      clearTimeout(hintTimer);
      hintTimer = null;
      if (!C.reduce) {
        hintTimer = setTimeout(function () {
          try { restoreHint(); } catch (e) { complain('nhắc chạm gấu', e); }
        }, 4500);
      }
    } else if (bubbleIsOurs()) {
      say(hintLine());
      st.lastSaid = null;
    }
  }

  /* ---------- 1. Tiêu đề: gõ chữ, và trò "viết rồi xoá" ---------- */

  /* Dựng lại đúng cấu trúc ba mảnh của hiệu ứng gõ chữ trong effects.js: phần đã hiện,
     con trỏ, phần còn ẩn. Chữ thật luôn nằm đủ trong trang nên bố cục không xô lệch. */
  function prepareTitle() {
    if (!titleEl || titleEl.hidden) return;
    var full = titleEl.textContent || '';
    if (full.normalize) full = full.normalize('NFC');
    if (!full.replace(/\s+/g, '')) return;

    var on = span('tw__on');
    var caret = span('tw__caret');
    var off = span('tw__off');
    off.textContent = full;
    titleEl.textContent = '';
    titleEl.appendChild(on);
    titleEl.appendChild(caret);
    titleEl.appendChild(off);
    tw = { full: full, chars: chars(full), on: on, off: off };
  }

  function paintTitle(i) {
    if (!tw) return;
    tw.on.textContent = tw.chars.slice(0, i).join('');
    tw.off.textContent = tw.chars.slice(i).join('');
  }

  function showFullTitle() {
    if (!tw) return;
    tw.on.textContent = tw.full;
    tw.off.textContent = '';
  }

  function removeWrong() {
    if (wrongEl && wrongEl.parentNode) wrongEl.parentNode.removeChild(wrongEl);
    wrongEl = null;
  }

  function typeReal(ms, cap, done) {
    titleEl.classList.add('is-typing');
    tick(tw.chars.length, ms, cap, paintTitle, function () {
      /* Con trỏ nhấp nháy thêm một nhịp rồi mới biến mất, giống hiệu ứng gốc */
      later(function () { titleEl.classList.remove('is-typing'); }, 900);
      done();
    });
  }

  /* Bạn gấu ngủ mà vẫn phản đối: "Zzz… ấy, nghiêm túc quá… zzz". Bỏ dấu câu ở cuối, viết thường
     chữ cái đầu cho ra giọng lẩm bẩm; phần còn lại giữ nguyên
     (tên riêng trong câu của người gửi không bị đổi). */
  function sleepTalk(line) {
    var s = String(line).replace(/[\s!?.,;:…]+$/, '');
    var c = chars(s);
    if (!c.length) return ZZZ;
    c[0] = c[0].toLocaleLowerCase ? c[0].toLocaleLowerCase('vi') : c[0].toLowerCase();
    return ZZZ + ' ' + c.join('') + '… zzz';
  }

  /* Trò viết rồi xoá. Dòng viết nhầm nằm trên một lớp nổi đè lên tiêu đề nên không chiếm chỗ. */
  function playGag() {
    C.store.set(KEY_GAG, '1');

    var wrong = chars(C.fill(opts.wrong)).slice(0, 60);
    var n = wrong.length;

    wrongEl = span('greeting-play__wrong');
    wrongEl.setAttribute('aria-hidden', 'true');
    var line = span('greeting-play__wrong-text');
    var caret = span('greeting-play__caret');
    wrongEl.appendChild(line);
    wrongEl.appendChild(caret);
    titleEl.appendChild(wrongEl);

    /* Dòng nhầm dài hơn khung tiêu đề thì thu nhỏ cho vừa một dòng. Đo bằng offsetWidth
       vì nó không bị ảnh hưởng bởi hiệu ứng hiện trang đang chạy dở. */
    line.textContent = wrong.join('');
    var cs = getComputedStyle(titleEl);
    var room = titleEl.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0) - 6;
    var need = line.offsetWidth;
    if (room > 0 && need > room) wrongEl.style.transform = 'scale(' + (room / need).toFixed(3) + ')';
    line.textContent = '';

    tick(n, 50, 950, function (i) {
      line.textContent = wrong.slice(0, i).join('');
    }, function () {
      later(function () {
        /* Gấu kêu lên. Nếu người đọc đã chạm gấu thì để yên bong bóng cho gấu nói câu của nó.
           Gấu đang ngủ (đêm khuya) thì mắt vẫn nhắm, nên câu đó thành câu nói mớ. */
        if (!st.petted && say(st.asleep ? sleepTalk(opts.oops) : opts.oops)) C.audio.pop();
        C.replay(line, 'is-oops', 520);

        later(function () {
          tick(n, 28, 532, function (i) {
            line.textContent = wrong.slice(0, n - i).join('');
          }, function () {
            later(function () {
              removeWrong();
              typeReal(50, 1000, titleDone);
            }, 150);
          });
        }, 600);
      }, 350);
    });
  }

  /* ---------- 2. Dấu bưu điện ---------- */

  function buildMark() {
    var inner = C.qs('.page__inner', page);
    if (!inner) return;

    var d = new Date(st.firstTs);
    markEl = span('greeting-play__mark');
    markEl.setAttribute('aria-hidden', 'true');
    markEl.innerHTML = MARK_SVG;

    var label = chars(C.fill(opts.postmarkLabel)).slice(0, 18).join('');
    labelEl = C.qs('.greeting-play__mark-label', markEl);
    labelEl.textContent = label;
    C.qs('.greeting-play__mark-date', markEl).textContent =
      pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getFullYear() % 100);
    C.qs('.greeting-play__mark-time', markEl).textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());

    /* Trang còn ẩn nên chưa đo được chữ: nhãn dài thì ép tạm theo số ký tự, lúc trang hiện sẽ đo lại */
    if (chars(label).length > 11) squeezeLabel();

    /* Lần đầu thì dấu chờ được đóng "cộp" sau khi tiêu đề gõ xong; các lần sau có sẵn */
    if (!st.firstVisit || C.reduce) markEl.classList.add('is-on');

    var stamp = C.qs('.stamp', inner);
    if (stamp && stamp.parentNode === inner) inner.insertBefore(markEl, stamp.nextSibling);
    else inner.insertBefore(markEl, inner.firstChild);
  }

  function squeezeLabel() {
    labelEl.setAttribute('textLength', String(LABEL_MAX));
    labelEl.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }

  var labelFitted = false;

  /* Đo bề ngang thật của nhãn (khi trang đã hiện, font đã tải) để chữ không tràn khỏi vòng dấu */
  function fitLabel() {
    if (!labelEl || labelFitted || !labelEl.getComputedTextLength) return;
    try {
      labelEl.removeAttribute('textLength');
      labelEl.removeAttribute('lengthAdjust');
      var w = labelEl.getComputedTextLength();
      if (w > 0) labelFitted = true;
      if (!(w > 0) ? chars(labelEl.textContent).length > 11 : w > LABEL_MAX) squeezeLabel();
    } catch (e) {}
  }

  function rememberFirst() {
    if (!st.firstVisit) return;
    C.store.set(KEY_FIRST, String(st.firstTs));
  }

  function thump() {
    if (!markEl || markEl.classList.contains('is-on')) return;
    markEl.classList.add('is-on');
    if (C.reduce || !onPage()) return;
    /* Đóng cộp: con dấu nảy xuống, một vòng mực loang ra và vài giọt mực bắn lên (vẽ bằng CSS
       ngay trong con dấu). Không bắn tim ở đây: con dấu nằm sát góc trên bên phải, tim sẽ rơi
       đè lên ngày tháng vừa in hoặc bay ra ngoài mép giấy. */
    C.replay(markEl, 'is-thump', 620);
    C.audio.pop();
  }

  /* ---------- Trình tự của cả cảnh ---------- */

  function begin() {
    st.seq = 'running';
    rememberFirst();
    /* Phòng khi có gì trục trặc giữa chừng: quá lâu thì nhảy thẳng tới trạng thái cuối */
    later(function () { settle(); greet(); }, 9000);

    if (C.reduce || !tw) { titleDone(); return; }

    later(function () {
      if (st.gag) playGag();
      else typeReal(55, 0, titleDone);
    }, 420);
  }

  function titleDone() {
    var wait = C.reduce ? 0 : 300;
    if (markEl && !markEl.classList.contains('is-on')) {
      later(thump, 260);
      wait = 900;
    }
    later(function () {
      /* Xong màn diễn. Không huỷ các hẹn giờ lặt vặt còn lại (tắt con trỏ), chúng tự chạy nốt. */
      st.seq = 'done';
      greet();
    }, wait);
  }

  /* Nhảy thẳng tới trạng thái cuối: tiêu đề thật đủ chữ, dấu đã đóng, gấu thôi nói dở.
     Gọi khi người đọc lật trang giữa chừng, hoặc khi có lỗi. Gọi nhiều lần cũng không sao. */
  function settle() {
    clearAll();
    removeWrong();
    showFullTitle();
    if (titleEl) titleEl.classList.remove('is-typing');
    if (markEl) {
      markEl.classList.remove('is-thump');
      markEl.classList.add('is-on');
    }
    /* Câu "nghiêm túc quá" còn treo thì trả bong bóng về như cũ; câu chào để dành lần quay lại */
    if (st.hello === 'pending' && !st.petted && bubbleIsOurs()) {
      sayQuietly(st.asleep ? ZZZ : hintLine());
    }
    if (st.seq !== 'idle') st.seq = 'done';
  }

  function onShown(d) {
    if (!d || d.index !== st.index) {
      if (st.seq === 'running') settle();
      return;
    }
    fitLabel();
    if (st.seq === 'idle') begin();
    else if (st.seq === 'done' && st.hello === 'pending') {
      setTimeout(function () {
        try { greet(); } catch (e) { complain('câu chào', e); }
      }, 500);
    }
  }

  /* Người đọc chạm vào trang giữa màn diễn: nhảy tới trạng thái cuối. Nếu rốt cuộc trang không
     lật đi (chỉ nhấc mép giấy rồi thả) thì lát sau gấu vẫn chào như thường. */
  function interrupt() {
    if (st.seq !== 'running') return;
    settle();
    setTimeout(function () {
      try { greet(); } catch (e) { complain('câu chào', e); }
    }, 1600);
  }

  /* Thư viện lật trang chụp lại trang đang đọc ngay khi ngón tay chạm xuống. Bắt cú chạm sớm hơn
     nó một nhịp để bản chụp đó đã là trạng thái cuối, không phải dòng chữ gõ dở.
     Chạm vào nút trong trang (bạn gấu) thì chưa cắt ngang ngay, vì một cú chạm gấu chỉ là vuốt ve.
     Nhưng nếu ngón tay đặt trên gấu rồi vuốt ngang thì phần lõi sẽ lật trang lúc nhấc tay, và bản
     chụp được tạo ngay lúc đó, trước cả sự kiện "turn". Vì vậy nhớ điểm đặt tay để nhận ra cú vuốt
     từ nhịp kéo đầu tiên (onSwipe) và nhảy tới trạng thái cuối trước khi phần lõi kịp lật. */
  var press = null;        /* { x, y } của ngón tay đặt lên nút trong trang lúc màn diễn đang chạy */

  function onPress(e) {
    if (e.type !== 'mousedown') press = null;
    if (st.seq !== 'running') return;
    var t = e.target;
    var btn = t && t.closest ? t.closest('button, a') : null;
    if (btn && page.contains(btn)) {
      /* Nút có data-no-swipe thì phần lõi không lật trang khi vuốt trên nó, khỏi cần canh */
      if (e.type === 'touchstart' && !btn.closest('[data-no-swipe]') && e.changedTouches && e.changedTouches.length) {
        press = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      }
      return;
    }
    interrupt();
  }

  /* Ngón tay đang kéo trên nút: hễ ra dáng một cú vuốt ngang (cùng ngưỡng với phần lõi lúc nhấc
     tay, hoặc sớm hơn ở nhịp kéo) thì cắt màn diễn. Lắng nghe ở pha "capture" của cuốn sách nên
     luôn chạy trước trình xử lý "touchend" của phần lõi (pha nổi bọt), tức là trước book.next(). */
  function onSwipe(e) {
    if (!press) return;
    var end = e.type !== 'touchmove';
    var p = e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : null;
    var start = press;
    if (end) press = null;
    if (!p || st.seq !== 'running') { press = null; return; }
    var dx = Math.abs(p.clientX - start.x);
    var dy = Math.abs(p.clientY - start.y);
    var swiping = end ? (e.type === 'touchend' && dx > 30 && dy < 60) : (dx > 10 && dx > dy);
    if (swiping) {
      press = null;
      interrupt();
    }
  }

  function onKey(e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'PageDown' || k === 'PageUp' || k === 'Home') interrupt();
  }

  /* ---------- 4. Gấu ngủ gật ban đêm ---------- */

  function patchMascot() {
    var tpl = doc.getElementById('tpl-mascot');
    var svg = tpl && tpl.content ? tpl.content.firstElementChild : null;
    if (!svg || svg.querySelector('.m-greeting-play-cap')) return;

    var holder = doc.createElementNS(SVG_NS, 'svg');
    holder.innerHTML = SLEEP_EYES + NIGHT_CAP + SLEEP_ZZ;
    var eyes = holder.querySelector('.m-greeting-play-sleep');
    var cap = holder.querySelector('.m-greeting-play-cap');
    var zz = holder.querySelector('.m-greeting-play-zz');
    if (!eyes || !cap || !zz) return;

    /* Mắt nhắm nằm trong nhóm đầu để đi theo mọi chuyển động của đầu; mũ ngủ và chữ z vẽ trên cùng */
    var head = svg.querySelector('.m-head');
    (head || svg).appendChild(eyes);
    svg.appendChild(cap);
    svg.appendChild(zz);
  }

  function fallAsleep() {
    if (!opts.sleepy || slotOf(st.hour) !== 'night' || !petBtn) return;
    /* Khuôn gấu không vẽ thêm được mũ ngủ thì thôi, để gấu thức như thường */
    if (!C.qs('.m-greeting-play-cap', petBtn)) return;

    st.asleep = true;
    page.classList.add(NIGHT);
    petLabel = petBtn.getAttribute('aria-label') || '';
    petBtn.setAttribute('aria-label', PET_LABEL_ASLEEP);
    sayQuietly(ZZZ);
  }

  function wake() {
    st.asleep = false;
    st.hello = 'said';
    page.classList.remove(NIGHT);
    if (petLabel) petBtn.setAttribute('aria-label', petLabel);
    say(opts.wakeLine);

    /* Tỉnh rồi thì lát sau gấu mới nói câu chào ban đêm (hoặc câu trêu khi mở lại), để câu "night"
       trong config không bị bỏ phí. Người đọc chạm tiếp trước lúc đó thì thôi, câu của phần lõi được
       nói. Giảm chuyển động thì không tự đổi chữ (bong bóng đổi cỡ làm gấu xê dịch): câu đó để dành
       cho lần chạm kế tiếp. */
    var next = firstWords();
    if (!next) { st.lastSaid = null; return; }
    if (C.reduce) { st.lastSaid = null; wakeFollow = next; return; }
    hintTimer = setTimeout(function () {
      hintTimer = null;
      try {
        if (st.asleep || !onPage() || !bubbleIsOurs()) return;
        say(next);
        st.lastSaid = null;
      } catch (e) { complain('câu chào ban đêm', e); }
    }, 2500);
  }

  function onPet(d) {
    if (!d || d.button !== petBtn) return;
    st.petted = true;
    clearTimeout(hintTimer);
    hintTimer = null;
    st.lastSaid = null;
    markLong();
    if (st.asleep) { wake(); return; }
    if (wakeFollow) {
      /* Phần lõi vừa đặt câu của nó; gấu nói câu chào ban đêm đã để dành thay vào */
      var line = wakeFollow;
      wakeFollow = '';
      say(line);
      st.lastSaid = null;
      return;
    }
    if (bubble) announce(bubble.textContent);
  }

  /* ---------- Đăng ký ---------- */

  function setup(ctx) {
    page = ctx.qs('.page--greeting', ctx.bookEl);
    if (!page) return;

    /* Từ đây tiêu đề trang lời chào do tính năng này tự gõ, phần lõi không đụng vào nữa */
    titleEl = ctx.qs('.title', page);
    if (titleEl) {
      titleEl.removeAttribute('data-typewriter');
      titleEl.classList.add('greeting-play__title');
    }

    /* Câu chào của gấu có khi dài hai dòng; giữ cho vùng gấu một chiều cao tối thiểu để bạn gấu
       không bị bóp còn tí xíu khi tên người nhận quá dài. Đặt ngay trong setup để lúc phần lõi
       đo trang (tự thu nhỏ chữ cho vừa) thì chiều cao này đã có. */
    var art = ctx.qs('.page__art', page);
    if (art) art.classList.add('greeting-play__art');

    /* Phải vẽ thêm vào khuôn gấu TRƯỚC khi các bạn gấu được nhân bản ra từng trang */
    if (readOptions(ctx).sleepy) {
      try { patchMascot(); } catch (e) { complain('mũ ngủ', e); }
    }
  }

  function ready(ctx) {
    if (!page) return;
    C = ctx;
    opts = readOptions(ctx);
    st.index = ctx.pageIndex('.page--greeting');
    st.hour = readHour();
    petBtn = ctx.qs('.pet', page);
    bubble = petBtn ? ctx.qs('[data-bubble]', petBtn) : null;
    if (bubble) bubble.classList.add('greeting-play__bubble');
    if (petBtn) petBtn.classList.add('greeting-play__pet');

    /* Dòng đọc lời gấu cho trình đọc màn hình. Nằm ngoài trang sách: trang bị nhân bản lúc lật. */
    if (bubble) {
      live = doc.createElement('p');
      live.className = 'sr-only greeting-play__live';
      live.setAttribute('aria-live', 'polite');
      (ctx.qs('.app') || doc.body).appendChild(live);
    }

    /* Đếm số lần mở thư: mỗi lần tải trang cộng một */
    var visits = parseInt(ctx.store.get(KEY_VISITS), 10);
    st.visits = (visits > 0 ? visits : 0) + 1;
    ctx.store.set(KEY_VISITS, String(st.visits));

    /* Thời điểm mở thư lần đầu. Giá trị hỏng hoặc nằm ở tương lai thì coi như chưa có. */
    var now = Date.now();
    var first = parseInt(ctx.store.get(KEY_FIRST), 10);
    st.firstVisit = !(first > 0 && first <= now + 86400000);
    st.firstTs = st.firstVisit ? now : first;

    /* Từng phần hỏng thì bỏ riêng phần đó, các phần còn lại vẫn chạy */
    if (opts.postmark) {
      try { buildMark(); } catch (e) { markEl = null; labelEl = null; complain('dấu bưu điện', e); }
    }
    try { fallAsleep(); } catch (e) { st.asleep = false; page.classList.remove(NIGHT); complain('gấu ngủ', e); }

    prepareTitle();
    if (ctx.reduce) showFullTitle();   /* giảm chuyển động: tiêu đề hiện đủ ngay, không gõ */
    st.gag = !!tw && !ctx.reduce && opts.rewrite &&
      (opts.rewriteEvery || ctx.store.get(KEY_GAG) !== '1');

    ctx.on('shown', function (d) {
      try { onShown(d); } catch (e) { complain('shown', e); settle(); }
    });
    ctx.on('turn', function () {
      try { interrupt(); } catch (e) { complain('turn', e); }
    });
    ctx.on('pet', function (d) {
      try { onPet(d); } catch (e) { complain('pet', e); }
    });

    if (ctx.book && ctx.book.mode === 'flip') {
      var guard = function (e) {
        try { onPress(e); } catch (err) { complain('chạm', err); }
      };
      ctx.bookEl.addEventListener('pointerdown', guard, true);
      ctx.bookEl.addEventListener('touchstart', guard, { capture: true, passive: true });
      ctx.bookEl.addEventListener('mousedown', guard, true);
      var drag = function (e) {
        try { onSwipe(e); } catch (err) { complain('vuốt', err); }
      };
      ['touchmove', 'touchend', 'touchcancel'].forEach(function (name) {
        ctx.bookEl.addEventListener(name, drag, { capture: true, passive: true });
      });
      ['btn-prev', 'btn-next'].forEach(function (id) {
        var btn = doc.getElementById(id);
        if (btn) btn.addEventListener('click', interrupt, true);
      });
      doc.addEventListener('keydown', function (e) {
        try { onKey(e); } catch (err) { complain('phím', err); }
      }, true);
    }
  }

  (Invite.features = Invite.features || []).push({
    name: 'greeting-play',
    setup: setup,
    ready: ready
  });
})();
