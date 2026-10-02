/* =====================================================================
   book.js - lớp bọc quanh thư viện lật trang StPageFlip.

   Đây là file duy nhất được gọi thẳng vào thư viện (window.St). Phần còn
   lại của trang chỉ dùng: next(), prev(), goTo(i), onShown(cb), onTurnStart(cb).
   Nếu không tải được thư viện (mất mạng, CDN bị chặn) thì sách tự chuyển
   sang chế độ dự phòng: vuốt ngang từng trang.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};

  Invite.createBook = function (el, options) {
    options = options || {};

    var reduce = !!options.reduceMotion;
    var pages = Array.prototype.slice.call(el.querySelectorAll('.page'));
    var shownCbs = [];
    var turnCbs = [];
    var current = 0;
    var pf = null;

    function emitShown(i) {
      if (typeof i !== 'number' || i < 0 || i >= pages.length) return;
      current = i;
      shownCbs.forEach(function (cb) { cb(i, pages[i]); });
    }

    function emitTurn() {
      turnCbs.forEach(function (cb) { cb(); });
    }

    var api = {
      mode: 'none',
      pages: pages,
      count: pages.length,
      current: function () { return current; },
      onShown: function (cb) { shownCbs.push(cb); },
      onTurnStart: function (cb) { turnCbs.push(cb); },
      next: function () {},
      prev: function () {},
      goTo: function () {}
    };

    /* ---------- Chế độ lật trang thật ---------- */

    /* Thư viện chỉ nhận ra Safari qua chữ "Version/... Safari/" trong user agent, nên bỏ sót
       Zalo, Messenger, Facebook, Chrome trên iPhone (cùng lõi WebKit) và lại nhận nhầm
       WebView Android (lõi Chrome). Xét theo lõi trình duyệt thật để chúng vẽ trang giống nhau. */
    function isWebKit() {
      var nav = window.navigator || {};
      var ua = nav.userAgent || '';
      /* Mọi trình duyệt trên iPhone, iPad đều chạy WebKit; iPad đời mới tự xưng là Mac */
      if (/iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) return true;
      return /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Android|Edg|OPR/.test(ua);
    }

    function fixSafariFlag() {
      try {
        var render = pf.getRender && pf.getRender();
        if (render && typeof render.safari === 'boolean') render.safari = isWebKit();
      } catch (e) {}
    }

    function initFlip() {
      /* Hiệu ứng góc giấy quăn lên khi rê chuột chỉ hợp với máy có chuột. Trên điện thoại,
         trình duyệt giả lập sự kiện chuột sau mỗi cú chạm, nên chạm gần góc trang là góc giấy
         quăn lên rồi nằm im đó (và làm trang rộng ra quá màn hình). */
      var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

      pf = new window.St.PageFlip(el, {
        width: 360,
        height: 580,
        size: 'stretch',
        minWidth: 215,
        maxWidth: 420,
        minHeight: 200,
        maxHeight: 700,
        usePortrait: true,
        autoSize: true,
        showCover: true,
        drawShadow: true,
        flippingTime: reduce ? 350 : 700,
        maxShadowOpacity: 0.25,
        mobileScrollSupport: true,
        showPageCorners: canHover,
        swipeDistance: 24
      });

      var lastState = 'read';
      pf.on('flip', function (e) { emitShown(e.data); });
      pf.on('changeState', function (e) {
        var moving = e.data === 'flipping' || e.data === 'user_fold';
        var wasMoving = lastState === 'flipping' || lastState === 'user_fold';
        if (moving && !wasMoving) emitTurn();
        lastState = e.data;
      });

      pf.loadFromHTML(pages);
      fixSafariFlag();

      api.mode = 'flip';
      api.next = function () {
        if (current >= pages.length - 1) return;
        if (reduce) { emitTurn(); pf.turnToPage(current + 1); }
        else pf.flipNext('bottom');
      };
      api.prev = function () {
        if (current <= 0) return;
        if (reduce) { emitTurn(); pf.turnToPage(current - 1); }
        else pf.flipPrev('bottom');
      };
      api.goTo = function (i) {
        if (i === current || i < 0 || i >= pages.length) return;
        if (reduce) { emitTurn(); pf.turnToPage(i); }
        else pf.flip(i, 'bottom');
      };
    }

    /* Gỡ những gì thư viện đã gắn vào, phòng khi nó lỗi giữa chừng */
    function undoFlip() {
      pages.forEach(function (p) {
        p.removeAttribute('style');
        p.classList.remove('stf__item', '--soft', '--hard', '--left', '--right', '--simple');
        el.appendChild(p);
      });
      var wrapper = el.querySelector('.stf__wrapper');
      if (wrapper) wrapper.remove();
      el.classList.remove('stf__parent');
      el.removeAttribute('style');
      pf = null;
    }

    /* ---------- Chế độ dự phòng: vuốt ngang ---------- */

    function initScroll() {
      api.mode = 'scroll';
      el.classList.add('no-flip');

      var ticking = false;
      el.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          var w = el.clientWidth || 1;
          var i = Math.round(el.scrollLeft / w);
          if (i !== current) { emitTurn(); emitShown(i); }
        });
      }, { passive: true });

      function scrollToPage(i) {
        if (i < 0 || i >= pages.length) return;
        var left = i * el.clientWidth;
        try {
          el.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
        } catch (e) {
          el.scrollLeft = left;
        }
      }

      window.addEventListener('resize', function () {
        el.scrollLeft = current * el.clientWidth;
      });

      api.next = function () { scrollToPage(current + 1); };
      api.prev = function () { scrollToPage(current - 1); };
      api.goTo = scrollToPage;
    }

    if (window.St && window.St.PageFlip) {
      try {
        initFlip();
      } catch (err) {
        undoFlip();
        initScroll();
      }
    } else {
      initScroll();
    }

    return api;
  };
})();
