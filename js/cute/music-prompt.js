/* =====================================================================
   music-prompt.js - lời nhắn "thư có nhạc" hiện ngay khi mở link.

   Trang web không được phép tự tắt chế độ im lặng hay chỉnh âm lượng của
   điện thoại. Nên thư nhắc người nhận tự làm việc đó, rồi chạm "Đồng ý":
   chính cú chạm ấy là sự cho phép mà trình duyệt đòi hỏi, nhạc phát ngay
   (cả khi tải lại trang, lúc không còn phong bì để chạm).
   "Để sau" thì tắt tiếng; người nhận bấm nút loa ở góc trên khi muốn nghe.

   Chỉnh trong config.js, mục "musicPrompt": title, text, yes, later.
   Hiện mỗi lần mở link (vì mỗi lần mở trình duyệt lại đòi một cú chạm).
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var doc = document;

  var DEFAULTS = {
    title: 'Thư này có nhạc nè',
    text: 'Tắt chế độ im lặng và mở âm lượng lên một chút để nghe trọn vẹn nha.',
    yes: 'Đồng ý, bật nhạc',
    later: 'Để sau'
  };

  function textOf(ctx, key) {
    var v = ctx.get('musicPrompt.' + key);
    return typeof v === 'string' && v.replace(/\s+/g, '') ? v : DEFAULTS[key];
  }

  Invite.features = Invite.features || [];
  Invite.features.push({
    name: 'music-prompt',

    setup: function (ctx) {
      var A = ctx.audio || Invite.audio;
      if (!A || typeof A.hasMusic !== 'function' || !A.hasMusic()) return;   /* không có nhạc nền thì không nhắc */

      var layer = doc.createElement('div');
      layer.className = 'music-prompt';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-modal', 'true');
      layer.innerHTML =
        '<div class="music-prompt__card">' +
          '<span class="music-prompt__icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" focusable="false"><circle cx="8.6" cy="17.6" r="4"/><path d="M10.6 17.6V3.2l8.6 1.9v3.8l-6.6-1.4v10.1z"/></svg>' +
          '</span>' +
          '<h2 class="music-prompt__title"></h2>' +
          '<p class="music-prompt__text"></p>' +
          '<div class="music-prompt__tips" aria-hidden="true">' +
            '<span class="music-prompt__tip">🔕 Tắt im lặng</span>' +
            '<span class="music-prompt__tip">🔊 Mở âm lượng</span>' +
          '</div>' +
          '<button class="btn music-prompt__yes" type="button"></button>' +
          '<button class="music-prompt__later" type="button" data-no-music></button>' +
        '</div>';
      var title = layer.querySelector('.music-prompt__title');
      var yes = layer.querySelector('.music-prompt__yes');
      var later = layer.querySelector('.music-prompt__later');
      title.id = 'music-prompt-title';
      layer.setAttribute('aria-labelledby', title.id);
      title.textContent = ctx.fill(textOf(ctx, 'title'));
      layer.querySelector('.music-prompt__text').textContent = ctx.fill(textOf(ctx, 'text'));
      yes.textContent = ctx.fill(textOf(ctx, 'yes'));
      later.textContent = ctx.fill(textOf(ctx, 'later'));
      doc.body.appendChild(layer);

      var closed = false;
      function close() {
        if (closed) return;
        closed = true;
        layer.classList.add('is-leaving');
        setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, ctx.reduce ? 150 : 320);
        /* Trả tiêu điểm cho phong bì (nếu có) hoặc bìa sách */
        var next = doc.querySelector('.envelope__btn') || doc.getElementById('btn-next');
        if (next && next.focus) { try { next.focus({ preventScroll: true }); } catch (e) {} }
        ctx.emit('music-prompt:closed', { music: A.isEnabled() });
      }

      yes.addEventListener('click', function () {
        /* Ngay trong cú chạm: bật tiếng (nếu lần trước đã tắt) và phát nhạc */
        if (!A.isEnabled()) A.setEnabled(true);
        else if (A.music && A.music() && A.music().paused) A.setEnabled(true);
        if (A.pop) A.pop();
        close();
      });
      later.addEventListener('click', function () {
        A.setEnabled(false);
        close();
      });
      layer.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); later.click(); }
      });

      /* Hiện khi màn chờ vừa tắt, đưa tiêu điểm vào nút Đồng ý */
      ctx.on('loader-closed', function () {
        if (closed) return;
        layer.classList.add('is-in');
        try { yes.focus({ preventScroll: true }); } catch (e) {}
      });
    }
  });
})();
