/* =====================================================================
   puppy-eyes.js - bạn gấu cử nhân mếu dần mỗi lần nút "Để nghĩ đã…" bị bấm

   Ở trang lời mời cuối có hai bạn gấu: gấu cử nhân (thay cho người gửi) và
   gấu nâu (thay cho người nhận). Mỗi lần người nhận bấm nút từ chối cho vui,
   mặt gấu cử nhân buồn thêm một nấc:
     1. nhíu mày lo lắng, tai cụp xuống
     2. mắt long lanh to tròn, miệng mếu          (gấu nâu liếc sang)
     3. một giọt nước mắt rưng rưng, môi run run   (gấu nâu lo theo)
     4. nước mắt lăn dài hai bên má                (gấu nâu xích lại dỗ)
   Bấm "Mình sẽ đến!" là nín ngay: nước mắt hoá thành mấy trái tim nhỏ.

   Cách làm: thêm các nét mặt buồn vào KHUÔN gấu (chỉ thêm, không sửa nét cũ),
   mặc định ẩn hết. Mức buồn được ghi bằng MỘT class trên trang
   (.page--rsvp.puppy-eyes--1 ... --4), phần còn lại do CSS lo. Nhờ vậy bản sao
   của trang lúc đang lật vẫn hiện đúng mà không cần JS.

   Tuỳ chỉnh trong config.js (không bắt buộc):
     puppyEyes: { sound: true }
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SLUG = 'puppy-eyes';
  var MAX_STAGE = 4;

  var INK = '#5B4A4A';        /* màu nét mũi, miệng của gấu */
  var EYE = '#43384C';        /* màu mắt của gấu */
  var TEAR = '#C4E4FF';       /* nước mắt: xanh da trời nhạt trong bảng màu */
  var TEAR_EDGE = '#6FAEEA';

  /* Làm tròn một chữ số lẻ cho toạ độ khỏi dính đuôi số thập phân */
  function r1(n) { return Math.round(n * 10) / 10; }

  /* Một con mắt long lanh. Vẽ sẵn ở cỡ to; CSS thu nhỏ lại khi cần.
     Lớp ngoài (eye) để phóng to thu nhỏ, lớp trong (lid) để chớp mắt:
     hai chuyển động nằm trên hai phần tử khác nhau nên không giẫm lên nhau. */
  function eye(side, cx) {
    return '<g class="m-puppy-eyes-eye m-puppy-eyes-eye--' + side + '"><g class="m-puppy-eyes-lid">' +
      '<circle cx="' + cx + '" cy="111.5" r="12.6" fill="' + EYE + '"/>' +
      '<ellipse cx="' + cx + '" cy="118.9" rx="7.3" ry="3.2" fill="#9A86B8" opacity=".5"/>' +
      '<g class="m-puppy-eyes-shine">' +
        '<circle cx="' + r1(cx - 4.5) + '" cy="106.4" r="4.7" fill="#fff"/>' +
        '<circle cx="' + r1(cx + 5.1) + '" cy="115.4" r="2.3" fill="#fff"/>' +
        '<circle cx="' + r1(cx - 6.6) + '" cy="114.8" r="1.2" fill="#fff" opacity=".9"/>' +
      '</g>' +
    '</g></g>';
  }

  /* Giọt nước mắt rưng rưng đọng ở khoé mắt ngoài */
  function bead(side, cx) {
    return '<g class="m-puppy-eyes-bead m-puppy-eyes-bead--' + side + '"><g class="m-puppy-eyes-wob">' +
      '<path d="M' + cx + ' 114.8c2.9 3.8 5 6.4 5 9.3a5 5 0 0 1-10 0c0-2.9 2.1-5.5 5-9.3z" fill="' + TEAR + '" stroke="' + TEAR_EDGE + '" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<circle cx="' + r1(cx - 1.7) + '" cy="124.4" r="1.3" fill="#fff"/>' +
    '</g></g>';
  }

  /* Giọt nước mắt đang rơi. Vị trí vẽ sẵn chính là tư thế đứng yên (dùng khi
     giảm chuyển động); lúc có chuyển động thì CSS cho nó chạy từ khoé mắt xuống. */
  function drop(n, x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')">' +
      '<path class="m-puppy-eyes-drop m-puppy-eyes-drop--' + n + '" d="M0-6.5c2.2 3.1 4 5.2 4 7.6a4 4 0 0 1-8 0c0-2.4 1.8-4.5 4-7.6z" fill="' + TEAR + '" stroke="' + TEAR_EDGE + '" stroke-width="1.3" stroke-linejoin="round"/>' +
    '</g>';
  }

  /* Nét mặt buồn: gắn vào trong nhóm đầu gấu để đi theo cái đầu */
  var FACE =
    '<g class="m-puppy-eyes-face">' +
      '<path class="m-puppy-eyes-brow m-puppy-eyes-brow--l" d="M63.6 93.4q9.4-4.4 18.8 0" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path class="m-puppy-eyes-brow m-puppy-eyes-brow--r" d="M117.6 93.4q9.4-4.4 18.8 0" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
      eye('l', 73) +
      eye('r', 127) +
      '<path class="m-puppy-eyes-frown" d="M100 126.5v6.2M93.2 137.4q6.8-7.6 13.6 0" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="m-puppy-eyes-lip" d="M100 126.5v6M90.6 137.6q2.2-5 4.7-3.2t4.7-1.7 4.7 1.7 4.7 3.2" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      bead('l', 63.4) +
      bead('r', 136.6) +
    '</g>';

  /* Nước mắt rơi: gắn ở lớp trên cùng của gấu để không bị tay hay mũ che */
  var TEARS =
    '<g class="m-puppy-eyes-tears">' +
      drop(1, 62, 140) +
      drop(2, 60.4, 158) +
      drop(3, 138, 140) +
      drop(4, 139.6, 158) +
      /* Đệm bàn tay của gấu nâu lúc đưa tay sang dỗ: vẽ theo toạ độ của cánh tay trái
         để CSS cho nó đi cùng một phép dời hình với cánh tay */
      '<ellipse class="m-puppy-eyes-paw" cx="48.2" cy="190.5" rx="5.6" ry="7" fill="#FFC9D4"/>' +
    '</g>';

  /* Biến một đoạn SVG viết tay thành phần tử thật */
  function parse(markup) {
    var holder = document.createElementNS(SVG_NS, 'svg');
    holder.innerHTML = markup;
    return holder.firstElementChild || holder.firstChild;
  }

  var patched = false;

  /* Thêm nét mặt buồn vào khuôn gấu. Chỉ THÊM vào cuối, không đụng nét có sẵn,
     vì các tính năng khác cũng sửa chung cái khuôn này. */
  function patchTemplate() {
    var tpl = document.getElementById('tpl-mascot');
    var svg = tpl && tpl.content && tpl.content.querySelector ? tpl.content.querySelector('.mascot') : null;
    var head = svg ? svg.querySelector('.m-head') : null;
    if (!svg || !head) return false;
    if (svg.querySelector('.m-puppy-eyes-face')) return true;   /* đã thêm rồi */

    var face = parse(FACE);
    var tears = parse(TEARS);
    if (!face || !tears) return false;
    head.appendChild(face);
    svg.appendChild(tears);
    return true;
  }

  (Invite.features = Invite.features || []).push({
    name: SLUG,

    setup: function () {
      patched = patchTemplate();
    },

    ready: function (ctx) {
      if (!patched) return;
      /* Lần trước đã nhận lời rồi thì gấu đang vui sẵn, không làm gì cả */
      if (ctx.saidYes()) return;

      var page = ctx.qs('.page--rsvp', ctx.bookEl);
      var bearA = page ? ctx.qs('.couple__a', page) : null;
      /* Thiếu nét mặt mới trên gấu thì thôi: thà gấu vẫn cười còn hơn gấu mất mắt */
      if (!bearA || !ctx.qs('.m-puppy-eyes-face', bearA)) return;

      var stage = 0;
      var over = false;
      var soundOn = ctx.get('puppyEyes.sound') !== false;

      function paint(n) {
        for (var i = 1; i <= MAX_STAGE; i++) page.classList.remove(SLUG + '--' + i);
        if (n > 0) page.classList.add(SLUG + '--' + n);
      }

      /* Tiếng "ỉ ôi" rất khẽ: hai nốt đi xuống, càng buồn càng trầm.
         ctx.audio tự im khi người xem tắt tiếng hoặc chưa chạm lần nào. */
      function whimper(n) {
        if (!soundOn || !ctx.audio || typeof ctx.audio.tone !== 'function') return;
        var top = [622.25, 587.33, 554.37, 523.25][n - 1] || 523.25;
        ctx.audio.tone(top, 0.12, 0.16, 'sine', 0.035);
        ctx.audio.tone(top * 0.84, 0.27, 0.3, 'sine', 0.03);
      }

      function setStage(n) {
        n = Math.max(0, Math.min(MAX_STAGE, n));
        if (n === stage) return;
        stage = n;
        paint(n);
        if (n > 0) {
          whimper(n);
          /* Gấu rùng mình sụt sịt một cái (chỉ khi được phép chuyển động) */
          if (!ctx.reduce) ctx.replay(bearA, SLUG + '-sniff', 700);
        }
        ctx.emit(SLUG + ':stage', { stage: n });
      }

      /* Người gửi có thể viết ít hay nhiều câu trả lời cho nút từ chối,
         nên quy số lần bấm về đúng 4 nấc buồn. */
      function stageFor(detail) {
        if (detail && detail.gone) return MAX_STAGE;
        var replies = ctx.get('pages.rsvp.noReplies');
        var total = Array.isArray(replies) ? replies.length : 0;
        var count = detail && typeof detail.count === 'number' ? detail.count : 0;
        if (total < 1) return MAX_STAGE;
        if (count < 1) return Math.min(MAX_STAGE, stage + 1);
        return Math.max(1, Math.min(MAX_STAGE, Math.ceil(count / total * MAX_STAGE)));
      }

      ctx.on('rsvp-no', function (detail) {
        try {
          if (over || ctx.saidYes()) return;
          /* Chỉ buồn thêm, không tự nhiên vui lại khi chưa được nhận lời */
          setStage(Math.max(stage, stageFor(detail)));
        } catch (e) {}
      });

      ctx.on('rsvp-yes', function () {
        try {
          if (over) return;
          over = true;
          var wasSad = stage > 0;
          stage = 0;
          paint(0);
          bearA.classList.remove(SLUG + '-sniff');
          if (!wasSad) return;
          /* Nước mắt "bụp" thành tim quanh mặt gấu. Hàm hearts tự bỏ qua khi giảm chuyển động. */
          if (!ctx.reduce && ctx.fx && typeof ctx.fx.hearts === 'function') {
            ctx.fx.hearts(bearA, { count: 6, near: 16, far: 54, at: 0.46 });
          }
          ctx.emit(SLUG + ':stage', { stage: 0 });
        } catch (e) {}
      });
    }
  });
})();
