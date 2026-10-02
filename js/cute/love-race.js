/* =====================================================================
   love-race.js - trang trò chơi "Ai thương nhiều hơn?"

   Người nhận chạm thật nhanh vào trái tim trong vài giây để "thả tim".
   Trò chơi bị "gài" sẵn cho dễ thương: chạm nhanh cỡ nào thì người gửi
   cũng thương nhiều hơn đúng 1 tim. Tới hiệp thứ ba thì gấu chịu hòa
   và cộng tim của hai đứa lại.

   Chữ và số giây sửa trong config.js, mục "loveRace". Không lưu gì lại
   trên máy người xem: tải lại trang là chơi từ đầu.

   Vì trang sách bị nhân bản trong lúc lật nên mọi trạng thái đều nằm ở
   chữ và ở class gắn trên trang (love-race--running, love-race--frozen,
   love-race--over, love-race--win, love-race--tie, love-race--sum).
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};

  /* Cùng hình trái tim với icon i-heart, vẽ lại ở đây để có thêm viền đậm và vệt bóng */
  var HEART = 'M12 21.2c-.4 0-.8-.1-1.1-.4C6.1 17 2 13.4 2 8.9 2 6 4.2 3.8 7 3.8c1.9 0 3.6 1 5 2.9 ' +
    '1.4-1.9 3.1-2.9 5-2.9 2.8 0 5 2.2 5 5.1 0 4.5-4.1 8.1-8.9 11.9-.3.3-.7.4-1.1.4z';

  var DEFAULTS = {
    title: 'Ai thương nhiều hơn?',
    hint: 'Chạm vào tim thật nhanh trong {seconds} giây!',
    tap: 'Chạm!',
    faster: 'Nhanh nữa lên!',
    almost: 'Sắp hết giờ!',
    win: '{from} thương nhiều hơn đúng 1 tim!',
    again: 'Lại hơn 1 tim. Lần nào cũng vậy á!',
    tie: 'Hòa rồi! Thôi, thương bằng nhau nha',
    sum: 'Cộng lại là {sum} tim của hai đứa',
    zero: '{to} không chạm mà vẫn được thương 1 tim nè',
    rematch: 'Phục thù',
    replay: 'Chơi lại',
    left: 'Còn {n} giây',
    round: 'Hiệp {n}/{rounds}'
  };

  var DEFAULT_SECONDS = 8;
  var SUSPENSE_MS = 500;     /* nín thở nửa giây trước khi công bố */
  var SUM_MS = 1700;         /* đủ lâu để đọc xong câu "hòa rồi" trước khi cộng tim */
  var GRACE_MS = 800;        /* hết giờ rồi mà ngón tay vẫn còn đà bấm thêm vài cái */
  var ROUNDS = 3;

  /* Dùng chung giữa setup() và ready() */
  var page = null;
  var text = null;
  var seconds = DEFAULT_SECONDS;

  /* Chữ của người gửi: chỉ nhận chuỗi (hoặc số), bỏ trống thì dùng câu mặc định */
  function readConfig(ctx) {
    var raw = ctx.get('loveRace');
    var out = {};
    var key, v;
    if (!raw || typeof raw !== 'object') raw = {};
    for (key in DEFAULTS) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) continue;
      v = raw[key];
      if (typeof v === 'number' && isFinite(v)) v = String(v);
      out[key] = (typeof v === 'string' && v.replace(/\s+/g, '') !== '') ? v : DEFAULTS[key];
    }
    return out;
  }

  /* Số giây: chấp nhận 1 đến 60, lỡ viết sai thì về 8 */
  function readSeconds(ctx) {
    var s = parseFloat(ctx.get('loveRace.seconds'));
    if (!isFinite(s) || s <= 0) return DEFAULT_SECONDS;
    return Math.max(1, Math.min(60, Math.round(s * 10) / 10));
  }

  (Invite.features = Invite.features || []).push({
    name: 'love-race',
    /* Trò chơi này mặc định tắt: chỉ bật khi config.js ghi rõ features['love-race'] = true.
       Lỡ xóa mất dòng đó trong config thì trang cũng không tự hiện ra. */
    defaultOn: false,

    /* ---------- Trước khi dựng sách: thêm trang ---------- */
    setup: function (ctx) {
      text = readConfig(ctx);
      seconds = readSeconds(ctx);

      var heartArt =
        '<svg class="love-race__art" viewBox="1 2.8 22 20.4" aria-hidden="true" focusable="false">' +
          '<path fill="#E8638C" transform="translate(0 1.1)" d="' + HEART + '"/>' +
          '<path fill="#FF8FAB" d="' + HEART + '"/>' +
          '<ellipse cx="7.3" cy="8.2" rx="1.5" ry="2.4" transform="rotate(-32 7.3 8.2)" fill="#fff" opacity=".6"/>' +
          '<circle cx="5.5" cy="11.9" r=".55" fill="#fff" opacity=".55"/>' +
        '</svg>';

      /* Khung trang chỉ là HTML tĩnh. Chữ của người gửi được gán sau bằng textContent. */
      var html =
        '<h2 class="title title--center love-race__title" data-reveal style="--i:0">' +
          '<span class="hl love-race__title-text"></span>' +
        '</h2>' +

        '<div class="love-race__board" data-reveal style="--i:1">' +
          '<span class="love-race__chip love-race__chip--to">' +
            '<span class="love-race__face" data-mascot="choco"></span>' +
            '<b class="love-race__num love-race__num--to">0</b>' +
            /* Lúc cộng tim con số bay đi, chỗ trống đó hiện một trái tim nhỏ */
            '<svg class="love-race__mini" aria-hidden="true"><use href="#i-heart"/></svg>' +
            '<span class="love-race__name love-race__name--to"></span>' +
          '</span>' +
          '<span class="love-race__vs" aria-hidden="true">' +
            '<svg class="love-race__vs-ic"><use href="#i-heart"/></svg>' +
          '</span>' +
          '<span class="love-race__chip love-race__chip--from">' +
            '<b class="love-race__num love-race__num--from">0</b>' +
            '<svg class="love-race__mini" aria-hidden="true"><use href="#i-heart"/></svg>' +
            '<span class="love-race__face" data-mascot="love"></span>' +
            '<span class="love-race__name love-race__name--from"></span>' +
            '<span class="love-race__plus" aria-hidden="true">+1</span>' +
          '</span>' +
        '</div>' +

        '<div class="love-race__arena" data-reveal style="--i:2">' +
          '<span class="love-race__ring" aria-hidden="true"></span>' +
          '<svg class="spark love-race__spark love-race__spark--a" aria-hidden="true"><use href="#i-sparkle"/></svg>' +
          '<svg class="spark love-race__spark love-race__spark--b" aria-hidden="true"><use href="#i-star"/></svg>' +
          '<svg class="spark love-race__spark love-race__spark--c" aria-hidden="true"><use href="#i-heart"/></svg>' +
          '<button class="love-race__heart" type="button" data-no-swipe aria-label="Trái tim: chạm thật nhanh để thả tim">' +
            '<span class="love-race__pulse">' +
              heartArt +
              '<span class="love-race__tap"></span>' +
              /* Màn kết: tổng tim của hai đứa hiện to giữa trái tim lớn */
              '<b class="love-race__total"></b>' +
            '</span>' +
          '</button>' +
        '</div>' +

        '<div class="love-race__timer" data-reveal style="--i:3">' +
          '<span class="love-race__bar" aria-hidden="true"><i class="love-race__fill"></i></span>' +
          '<span class="love-race__runner" aria-hidden="true"><svg><use href="#i-heart"/></svg></span>' +
          '<span class="love-race__left"></span>' +
        '</div>' +

        '<div class="love-race__foot" data-reveal style="--i:4">' +
          '<p class="love-race__msg" aria-live="polite"></p>' +
          '<button class="btn love-race__again" type="button">' +
            '<svg class="ic" aria-hidden="true"><use href="#i-replay"/></svg>' +
            '<span class="love-race__again-label"></span>' +
          '</button>' +
          /* Chưa có kết quả thì chỗ của nút hiện viên "Hiệp 1/3" cho phần dưới trang khỏi trống */
          '<span class="love-race__round">' +
            '<svg class="ic" aria-hidden="true"><use href="#i-paw"/></svg>' +
            '<span class="love-race__round-label"></span>' +
          '</span>' +
        '</div>';

      page = ctx.addPage({
        className: 'page--love-race',
        label: 'Trò chơi: ai thương nhiều hơn',
        before: '.page--rsvp',
        html: html
      });
    },

    /* ---------- Sau khi dựng sách: nối trò chơi ---------- */
    ready: function (ctx) {
      if (!page) return;

      var qs = ctx.qs;
      var inner = qs('.page__inner', page);
      var board = qs('.love-race__board', page);
      var chipFrom = qs('.love-race__chip--from', page);
      var numTo = qs('.love-race__num--to', page);
      var numFrom = qs('.love-race__num--from', page);
      var vs = qs('.love-race__vs', page);
      var total = qs('.love-race__total', page);
      var arena = qs('.love-race__arena', page);
      var heart = qs('.love-race__heart', page);
      var pulse = qs('.love-race__pulse', page);
      var timer = qs('.love-race__timer', page);
      var left = qs('.love-race__left', page);
      var foot = qs('.love-race__foot', page);
      var msg = qs('.love-race__msg', page);
      var again = qs('.love-race__again', page);
      var againLabel = qs('.love-race__again-label', page);
      var roundLabel = qs('.love-race__round-label', page);

      var reduce = !!ctx.reduce;
      var audio = ctx.audio || {};
      var senderName = String(ctx.names.from || '').replace(/^\s+|\s+$/g, '');
      var senderShown = senderName || 'Gấu';
      var secondsText = String(seconds).replace('.', ',');

      /* idle: chờ cú chạm đầu | running: đang đua | suspense: hết giờ, nín thở
         tie: hiệp cuối vừa hòa, sắp cộng tim | over: đã có kết quả, hiện nút chơi tiếp */
      var state = 'idle';
      var round = 1;
      var finished = false;     /* đã chơi hết ba hiệp, nút đang là "Chơi lại" */
      var mine = 0;             /* số tim của người nhận */
      var theirs = 0;           /* số tim của người gửi (do gấu "bấm hộ") */
      var endAt = 0;
      var shieldUntil = 0;
      var lastTone = 0;
      var lastKey = 0;
      var lastTouch = 0;
      var lastNudge = 0;
      var squishAnim = null;
      var timers = {};

      /* Sau khi bấm "Phục thù" mà không chạm cái nào suốt chừng này thì tính là một hiệp 0 tim */
      var waitMs = Math.max(seconds, 6) * 1000;

      /* Điền {seconds}, {sum}, {n} rồi tới {to}, {from}. Người gửi không ghi tên thì gọi là "Gấu". */
      function fmt(template, extra) {
        var out = String(template);
        var key;
        if (extra) {
          for (key in extra) {
            if (Object.prototype.hasOwnProperty.call(extra, key)) {
              out = out.split('{' + key + '}').join(String(extra[key]));
            }
          }
        }
        if (!senderName) out = out.split('{from}').join(senderShown);
        return ctx.fill(out);
      }

      /* Lỗi trong hàm hẹn giờ hay hàm bắt sự kiện không được làm hỏng phần còn lại của trang */
      function safe(fn) {
        return function (e) {
          try {
            return fn(e);
          } catch (err) {
            if (window.console && console.error) console.error('[thu-moi] love-race:', err);
          }
        };
      }

      function clearTimers() {
        var key;
        for (key in timers) {
          if (Object.prototype.hasOwnProperty.call(timers, key)) {
            clearTimeout(timers[key]);
            clearInterval(timers[key]);
          }
        }
        timers = {};
      }

      function setClass(name, on) {
        if (on) page.classList.add('love-race--' + name);
        else page.classList.remove('love-race--' + name);
      }

      function setMsg(value) {
        if (msg.textContent !== value) msg.textContent = value;
      }

      /* Số giây còn lại bằng chữ: chỉ hiện ở chế độ giảm chuyển động, thay cho thanh thời gian */
      function setLeft(n) {
        var value = fmt(text.left, { n: String(n).replace('.', ',') });
        if (left.textContent !== value) left.textContent = value;
      }

      function paintNums() {
        numTo.textContent = String(mine);
        numFrom.textContent = String(theirs);
        /* Số có 3, 4 chữ số thì thu nhỏ lại cho vừa thẻ */
        var top = Math.max(mine, theirs);
        var wide = top >= 1000 ? 'love-race__board--xwide' : (top >= 100 ? 'love-race__board--wide' : '');
        board.classList.remove('love-race__board--wide');
        board.classList.remove('love-race__board--xwide');
        if (wide) board.classList.add(wide);
      }

      /* Mép dưới của khối lời nhắn, tính từ mép trên của khung trang, theo bố cục thật.
         Không dùng getBoundingClientRect vì nó cộng cả hiệu ứng hiện dần (data-reveal đang
         đẩy khối xuống 14px lúc trang vừa mở), làm tưởng là tràn trong khi không hề tràn.
         offsetTop/offsetHeight bỏ qua transform nên đo đúng chỗ của khối. */
      function footBottom() {
        var y = foot.offsetHeight;
        var el = foot;
        var guard = 0;
        while (el && el !== inner && guard < 20) {
          y += el.offsetTop;
          el = el.offsetParent;
          guard++;
        }
        /* Lỡ chuỗi offsetParent không đi qua khung trang (bố cục lạ): trừ vị trí của khung đi */
        if (el !== inner) {
          el = inner;
          guard = 0;
          while (el && guard < 20) {
            y -= el.offsetTop;
            el = el.offsetParent;
            guard++;
          }
        }
        return y;
      }

      /* Câu tự viết quá dài sẽ đẩy nút xuống đè lên số trang. Lõi chỉ nhận ra khi chữ tràn hẳn
         khỏi trang, nên ở đây tự thu nhỏ lời nhắn trước (không dưới 13px), và chỉ khi tràn thật. */
      function fitMsg() {
        var limit, size, guard;
        msg.style.fontSize = '';
        if (!inner.clientHeight || !foot.offsetHeight) return;   /* trang đang ẩn, không đo được */
        limit = inner.clientHeight - (parseFloat(window.getComputedStyle(inner).paddingBottom) || 0) + 0.5;
        size = parseFloat(window.getComputedStyle(msg).fontSize) || 15;
        guard = 0;
        while (footBottom() > limit && size > 13 && guard < 12) {
          size = Math.max(13, size - 0.5);
          msg.style.fontSize = size + 'px';
          guard++;
        }
      }

      /* Vẫn còn tràn (hoặc lõi đã thu nhỏ chữ từ trước) thì nhờ lõi đo lại cả trang.
         Bình thường bố cục đã chừa sẵn chỗ nên không tốn công gì. */
      function maybeRefit() {
        if (!inner) return;
        fitMsg();
        if (inner.scrollHeight > inner.clientHeight + 1 || inner.style.fontSize) ctx.refit();
      }

      /* ----- Hiệu ứng nhỏ (bỏ hết khi giảm chuyển động) ----- */

      function squish() {
        if (reduce || !pulse.animate) return;
        try {
          if (squishAnim) squishAnim.cancel();
          squishAnim = pulse.animate([
            { transform: 'scale(.86)' },
            { transform: 'scale(1.07)', offset: 0.55 },
            { transform: 'scale(1)' }
          ], { duration: 180, easing: 'ease-out' });
        } catch (e) {}
      }

      function pop(el, from, ms) {
        if (reduce || !el || !el.animate) return;
        try {
          el.animate([
            { transform: 'scale(' + from + ')' },
            { transform: 'scale(1)' }
          ], { duration: ms, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
        } catch (e) {}
      }

      function buzz(pattern) {
        if (!navigator.vibrate) return;
        try { navigator.vibrate(pattern); } catch (e) {}
      }

      function tone(freq, delay, dur, type, peak) {
        if (typeof audio.tone !== 'function') return;
        try { audio.tone(freq, delay, dur, type, peak); } catch (e) {}
      }

      /* ----- Các trạng thái ----- */

      function toIdle() {
        clearTimers();
        state = 'idle';
        mine = 0;
        theirs = 0;
        setClass('running', false);
        setClass('hurry', false);
        setClass('frozen', false);
        setClass('over', false);
        setClass('win', false);
        setClass('tie', false);
        setClass('sum', false);
        heart.removeAttribute('aria-disabled');
        total.textContent = '';
        paintNums();
        setLeft(seconds);
        roundLabel.textContent = fmt(text.round, { n: round, rounds: ROUNDS });
        setMsg(fmt(text.hint, { seconds: secondsText }));
        maybeRefit();
      }

      function tickLeft() {
        if (state !== 'running') return;
        setLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
      }

      function start() {
        clearTimers();
        state = 'running';
        mine = 0;
        theirs = 0;
        endAt = Date.now() + seconds * 1000;
        setClass('running', true);

        /* Đồng hồ thật là một cái hẹn giờ; thanh thời gian chỉ là transition CSS chạy song song */
        timers.end = setTimeout(safe(timeUp), seconds * 1000);
        if (seconds >= 3) {
          timers.half = setTimeout(safe(function () {
            if (state === 'running') setMsg(fmt(text.faster));
          }), seconds * 500);
        }
        if (seconds >= 1.5) {
          timers.almost = setTimeout(safe(function () {
            if (state !== 'running') return;
            setMsg(fmt(text.almost));
            setClass('hurry', true);
          }), (seconds - 1) * 1000);
        }
        if (reduce) timers.tick = setInterval(safe(tickLeft), 200);
      }

      /* Hết giờ: khóa số lại, cho hai bên "bằng nhau" nửa giây cho hồi hộp */
      function timeUp() {
        clearTimers();
        state = 'suspense';
        theirs = mine;
        setClass('running', false);
        setClass('hurry', false);
        setClass('frozen', true);
        heart.setAttribute('aria-disabled', 'true');
        paintNums();
        setLeft(0);
        setMsg('…');
        timers.reveal = setTimeout(safe(reveal), SUSPENSE_MS);
      }

      function showButton(label, animated) {
        againLabel.textContent = fmt(label);
        setClass('over', true);
        if (animated) pop(again, 0.6, 420);
      }

      function reveal() {
        var zero = mine === 0;
        var tie = !zero && round >= ROUNDS;
        shieldUntil = Date.now() + GRACE_MS;

        if (tie) {
          /* Hiệp cuối: gấu chịu hòa, rồi cộng tim hai đứa lại */
          state = 'tie';
          theirs = mine;
          setClass('tie', true);
          setMsg(fmt(text.tie));
          paintNums();
          pop(numTo, 1.35, 380);
          pop(numFrom, 1.35, 380);
          timers.sum = setTimeout(safe(function () { showSum(true); }), SUM_MS);
        } else {
          /* Chạm nhanh cỡ nào thì người gửi cũng hơn đúng 1 tim */
          state = 'over';
          theirs = mine + 1;
          setClass('win', true);
          setMsg(fmt(zero ? text.zero : (round === 1 ? text.win : text.again)));
          paintNums();
          pop(numFrom, 1.6, 450);
          showButton(text.rematch, true);
          /* Hiệp không chạm cái nào thì không tính, để hiệp hòa luôn có số tim thật */
          if (!zero) round++;
        }

        if (typeof audio.chime === 'function') audio.chime();
        buzz([20, 40, 20]);
        if (!reduce) ctx.fx.hearts(tie ? vs : chipFrom, { count: 10, near: 36, far: 104 });
        maybeRefit();
      }

      /* Hai con số chập lại thành một trái tim chung */
      function showSum(animated) {
        clearTimers();
        state = 'over';
        finished = true;
        total.textContent = String(mine + theirs);
        setClass('tie', true);
        setClass('sum', true);
        setMsg(fmt(text.sum, { sum: mine + theirs }));
        showButton(text.replay, animated);
        if (animated) {
          tone(783.99, 0, 0.25, 'triangle', 0.08);
          tone(1046.5, 0.13, 0.45, 'triangle', 0.08);
          /* Tim bung ra từ trái tim lớn, nơi tổng tim của hai đứa vừa hiện lên */
          if (!reduce) ctx.fx.hearts(pulse, { count: 14, near: 50, far: 140 });
        }
        maybeRefit();
      }

      /* Lật sang trang khác hoặc rời khỏi tab: bỏ hiệp đang chơi, lặng lẽ về trạng thái chờ */
      function cancel() {
        if (state === 'running' || state === 'suspense') toIdle();
        else if (state === 'tie') showSum(false);
        else if (state === 'idle') clearTimers();
      }

      /* ----- Một cú chạm vào trái tim ----- */

      function hit() {
        var now = Date.now();

        if (state === 'idle') start();
        if (state !== 'running') {
          /* Đã có kết quả mà vẫn chạm vào tim: lắc nhẹ nút bên dưới để chỉ đường */
          if (state === 'over' && now > shieldUntil && now - lastNudge > 900) {
            lastNudge = now;
            if (!reduce) ctx.replay(again, 'love-race__again--nudge', 520);
          }
          return;
        }

        mine++;
        /* Người gửi "đuổi theo": lúc bằng, lúc hơn 1, nhấp nháy giữa hai số */
        theirs = mine + (Math.random() < 0.5 ? 0 : 1);
        paintNums();
        squish();
        pop(numTo, 1.25, 140);

        /* Tiếng "pop" cao dần sau mỗi 5 cú chạm, tối đa khoảng 12 nốt mỗi giây */
        if (now - lastTone >= 83) {
          lastTone = now;
          tone(520 * Math.pow(2, Math.min(24, Math.floor(mine / 5)) / 12), 0, 0.1, 'sine', 0.05);
        }
      }

      /* ----- Vuốt ngang để lật trang ngay trên vùng chơi -----
         Tim có data-no-swipe (lõi không lật trang khi vuốt trên nó) và lúc đua vùng chơi chặn
         cú chạm khỏi tới thư viện lật trang. Như vậy người chỉ muốn vuốt qua trang mà đặt ngón
         tay lên trái tim to giữa trang sẽ vô tình bắt đầu một hiệp và bị "nhốt" lại. Nên ở đây
         tự nhận ra cú vuốt ngang rõ ràng rồi tự lật trang:
         - bắt đầu trên tim lúc đang chờ (cú chạm đó vừa mở hiệp) hoặc lúc đã có kết quả;
         - bắt đầu ở vùng chơi ngoài tim trong lúc vùng chơi đang chặn cú chạm.
         Cú chạm bắt đầu trên tim GIỮA hiệp thì không bao giờ lật: đó là lúc đang bấm liên tục.
         Ngưỡng 72px cao hơn hẳn độ trượt của ngón tay khi bấm nhanh (thường dưới 40px). */
      var SWIPE_PX = 72;
      var SWIPE_MS = 700;
      var gesture = null;

      /* Vùng chơi đang chặn cú chạm (xem shield bên dưới) */
      function shielding() {
        return state === 'running' || state === 'suspense' || Date.now() < shieldUntil;
      }

      function track(x, y, onHeart, kind) {
        var now = Date.now();
        var ok;
        if (onHeart) ok = state === 'idle' || (state === 'over' && now >= shieldUntil);
        /* Ở chế độ dự phòng, sau khi công bố thì trình duyệt tự cuộn được ở vùng chơi (ngoài tim):
           không tự lật thêm, kẻo một cú vuốt bị tính hai lần */
        else ok = state === 'running' || state === 'suspense' || (ctx.book && ctx.book.mode === 'flip' && now < shieldUntil);
        gesture = ok ? {
          x: x, y: y, t: now, kind: kind,
          from: ctx.book ? ctx.book.current() : -1,
          idle: onHeart && state === 'idle', over: onHeart && state === 'over'
        } : null;
      }

      function release(x, y, kind) {
        var g = gesture;
        var dx, dy;
        /* Chuột giả mà trình duyệt gửi theo sau một cú chạm không được "ăn" mất cú vuốt bằng tay */
        if (!g || g.kind !== kind) return;
        gesture = null;
        if (!ctx.book) return;
        dx = x - g.x;
        dy = y - g.y;
        if (Math.abs(dx) < SWIPE_PX || Math.abs(dy) * 2 > Math.abs(dx) || Date.now() - g.t > SWIPE_MS) return;
        /* Cú vuốt mở hiệp: chỉ khi chưa có cú chạm nào khác (ngón thứ hai đang chơi thật thì thôi) */
        if (g.idle && !(state === 'running' && mine <= 1)) return;
        if (g.over && state !== 'over') return;
        /* Dọn hiệp trước khi lật, để bản sao của trang lúc lật đã ở trạng thái chờ */
        if (state === 'running' || state === 'suspense') toIdle();
        /* Ở chế độ dự phòng, nhắm thẳng tới trang kề trang lúc ngón tay chạm xuống: lỡ trình duyệt
           cũng tự cuộn theo cú vuốt (có đà) thì vẫn chỉ dừng ở đúng một trang, không bị lật hai lần */
        if (ctx.book.mode === 'scroll' && g.from >= 0) ctx.book.goTo(g.from + (dx < 0 ? 1 : -1));
        else if (dx < 0) ctx.book.next();
        else ctx.book.prev();
      }

      function point(e) {
        var t = e.changedTouches && e.changedTouches[0];
        return t || e;
      }

      window.addEventListener('touchend', safe(function (e) {
        var p = point(e);
        if (gesture) release(p.clientX, p.clientY, 'touch');
      }), { passive: true });
      window.addEventListener('touchcancel', function () { gesture = null; }, { passive: true });
      window.addEventListener('mouseup', safe(function (e) {
        if (gesture && e.button === 0) release(e.clientX, e.clientY, 'mouse');
      }));

      /* Đếm ở pointerdown chứ không chờ click, để 10 cú chạm mỗi giây vẫn được tính đủ */
      if (window.PointerEvent) {
        heart.addEventListener('pointerdown', safe(function (e) {
          if (e.pointerType === 'mouse' && e.button > 0) return;
          if (e.isPrimary !== false) track(e.clientX, e.clientY, true, e.pointerType === 'touch' ? 'touch' : 'mouse');
          hit();
        }));
      } else {
        heart.addEventListener('touchstart', safe(function (e) {
          var n = (e.changedTouches && e.changedTouches.length) || 1;
          var p = point(e);
          lastTouch = Date.now();
          if (!e.touches || e.touches.length <= 1) track(p.clientX, p.clientY, true, 'touch');
          while (n-- > 0) hit();
        }), { passive: true });
        heart.addEventListener('mousedown', safe(function (e) {
          /* Sau cú chạm, trình duyệt còn gửi thêm một mousedown giả: bỏ qua nó */
          if (e.button > 0 || Date.now() - lastTouch < 700) return;
          track(e.clientX, e.clientY, true, 'mouse');
          hit();
        }));
      }

      function isTapKey(e) {
        return e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar';
      }

      /* Bàn phím: Enter hoặc phím cách trên trái tim tính là một cú chạm (giữ phím không tính thêm).
         Chặn hành vi mặc định để trình duyệt khỏi tự sinh thêm một cú click cho mỗi lần phím
         tự lặp (Enter) hay lúc nhả phím (phím cách): cú chạm bằng phím chỉ đếm ở đây.
         Ghi giờ phím TRƯỚC khi bỏ qua phím lặp, để cú click lỡ lọt qua cũng bị nhận ra là của phím. */
      heart.addEventListener('keydown', safe(function (e) {
        if (!isTapKey(e)) return;
        lastKey = Date.now();
        if (e.preventDefault) e.preventDefault();
        if (e.repeat) return;
        hit();
      }));
      heart.addEventListener('keyup', safe(function (e) {
        if (!isTapKey(e)) return;
        lastKey = Date.now();
        if (e.preventDefault) e.preventDefault();
      }));

      /* Trình đọc màn hình có thể chỉ gửi click (detail = 0) mà không có phím hay pointerdown nào */
      heart.addEventListener('click', safe(function (e) {
        if (e.detail !== 0 || Date.now() - lastKey < 500) return;
        hit();
      }));

      /* Trong lúc đua, ngón tay bấm trượt ra cạnh trái tim không được làm lật trang.
         Lõi và thư viện lật trang nghe touchstart/mousedown ở khung sách, nên chặn ngay tại vùng chơi. */
      function shield(e) {
        var p;
        if (!shielding()) return;
        e.stopPropagation();
        /* Cú chạm ngoài tim: ghi lại chỗ bắt đầu để cú vuốt ngang rõ ràng vẫn lật được trang
           (tự lật ở release). Cú chạm trên tim đã được ghi ở pointerdown/touchstart của tim. */
        if (heart.contains(e.target)) return;
        if (e.type === 'mousedown' && (e.button > 0 || Date.now() - lastTouch < 700)) return;
        if (e.type === 'touchstart') {
          lastTouch = Date.now();
          if (e.touches && e.touches.length > 1) { gesture = null; return; }
        }
        p = point(e);
        track(p.clientX, p.clientY, false, e.type === 'touchstart' ? 'touch' : 'mouse');
      }
      arena.addEventListener('touchstart', shield, { passive: true });
      arena.addEventListener('mousedown', shield);

      /* Nút "Phục thù" / "Chơi lại": dọn bàn, cú chạm đầu tiên vào tim sẽ bắt đầu hiệp mới */
      again.addEventListener('click', safe(function () {
        if (state !== 'over') return;
        if (typeof audio.pop === 'function') audio.pop();
        if (finished) {
          finished = false;
          round = 1;
        }
        toIdle();
        /* Đòi phục thù mà rồi không chạm cái nào: vẫn được thương 1 tim */
        timers.wait = setTimeout(safe(function () {
          if (state === 'idle') timeUp();
        }), waitMs);
        /* Nút vừa bấm sẽ ẩn đi, đưa tiêu điểm về trái tim cho người dùng bàn phím */
        try { heart.focus({ preventScroll: true }); } catch (e) {}
      }));

      ctx.on('turn', safe(cancel));

      /* Trạng thái có thể đã đổi lúc trang đang khuất (không đo được): đo lại khi trang hiện ra, khi xoay máy */
      ctx.on('shown', safe(function (d) {
        if (d && d.page === page) maybeRefit();
      }));
      var resizeTimer = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(safe(maybeRefit), 260);
      });
      document.addEventListener('visibilitychange', safe(function () {
        if (document.hidden) cancel();
      }));

      /* ----- Đổ chữ lần đầu (luôn bằng textContent) ----- */

      qs('.love-race__title-text', page).textContent = fmt(text.title);
      qs('.love-race__name--to', page).textContent = ctx.names.to;
      qs('.love-race__name--from', page).textContent = senderShown;
      qs('.love-race__tap', page).textContent = fmt(text.tap);
      againLabel.textContent = fmt(text.rematch);
      timer.style.setProperty('--love-race-s', seconds + 's');
      toIdle();
    }
  });
})();
