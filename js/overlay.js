/* =====================================================================
   overlay.js - khung cửa sổ nổi dùng chung cho các tính năng phụ
   (vé mời, trò chơi nhỏ, lời nhắn bí mật...).

   var sheet = Invite.overlay({
     label: 'Tên cửa sổ cho trình đọc màn hình',
     className: 'ten-tinh-nang',      // thêm vào khung ngoài để tự tạo kiểu
     html: '<p>Nội dung tĩnh</p>',    // chữ của người dùng phải gán bằng textContent
     closable: true,                  // có nút đóng, bấm nền mờ hay phím Esc để đóng
     onOpen: function (sheet) {},
     onClose: function (sheet) {}
   });
   sheet.open(); sheet.close(); sheet.isOpen(); sheet.body (vùng nội dung)

   Khi cửa sổ đang mở: phím mũi tên không lật sách, phím Tab đi vòng trong cửa sổ.
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;
  var openCount = 0;
  var NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];

  function create(opts) {
    opts = opts || {};
    var closable = opts.closable !== false;

    var wrap = doc.createElement('div');
    wrap.className = 'sheet' + (opts.className ? ' ' + opts.className : '');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    if (opts.label) wrap.setAttribute('aria-label', opts.label);
    wrap.hidden = true;

    var backdrop = doc.createElement('div');
    backdrop.className = 'sheet__backdrop';

    var card = doc.createElement('div');
    card.className = 'sheet__card';
    card.setAttribute('tabindex', '-1');

    var body = doc.createElement('div');
    body.className = 'sheet__body';
    body.innerHTML = opts.html || '';

    var closeBtn = null;
    if (closable) {
      closeBtn = doc.createElement('button');
      closeBtn.className = 'icon-btn sheet__close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Đóng');
      closeBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-close"/></svg>';
      card.appendChild(closeBtn);
    }

    card.appendChild(body);
    wrap.appendChild(backdrop);
    wrap.appendChild(card);

    var isOpen = false;
    var lastFocus = null;
    var hideTimer = null;

    function focusables() {
      var list = card.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      return Array.prototype.filter.call(list, function (el) {
        return !el.disabled && !el.hidden && el.offsetParent !== null;
      });
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (closable) { e.preventDefault(); api.close(); }
        return;
      }
      if (NAV_KEYS.indexOf(e.key) !== -1) {
        /* Sách nằm bên dưới không được lật khi cửa sổ đang mở */
        var tag = e.target && e.target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') e.preventDefault();
        return;
      }
      if (e.key === 'Tab') {
        var items = focusables();
        if (!items.length) { e.preventDefault(); return; }
        var first = items[0];
        var last = items[items.length - 1];
        var active = doc.activeElement;
        if (e.shiftKey && (active === first || !card.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !card.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    var api = {
      el: wrap,
      card: card,
      body: body,
      isOpen: function () { return isOpen; },

      open: function () {
        if (isOpen) return;
        isOpen = true;
        clearTimeout(hideTimer);
        if (!wrap.parentNode) doc.body.appendChild(wrap);
        lastFocus = doc.activeElement;
        wrap.hidden = false;
        void wrap.offsetWidth;
        wrap.classList.add('is-open');
        doc.addEventListener('keydown', onKey, true);
        openCount++;
        doc.documentElement.classList.add('has-sheet');
        try { (closeBtn || card).focus({ preventScroll: true }); } catch (e) {}
        if (typeof opts.onOpen === 'function') opts.onOpen(api);
      },

      close: function () {
        if (!isOpen) return;
        isOpen = false;
        wrap.classList.remove('is-open');
        doc.removeEventListener('keydown', onKey, true);
        openCount = Math.max(0, openCount - 1);
        if (!openCount) doc.documentElement.classList.remove('has-sheet');
        hideTimer = setTimeout(function () { wrap.hidden = true; }, 280);
        if (lastFocus && lastFocus.focus && doc.contains(lastFocus)) {
          try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
        }
        if (typeof opts.onClose === 'function') opts.onClose(api);
      }
    };

    if (closable) {
      closeBtn.addEventListener('click', api.close);
      backdrop.addEventListener('click', api.close);
    }

    return api;
  }

  Invite.overlay = create;
})();
