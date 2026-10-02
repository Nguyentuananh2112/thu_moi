/* =====================================================================
   effects.js - linh vật, hạt bay nền, tim nở khi chạm, gõ chữ,
   đếm ngược, màn ăn mừng
   ===================================================================== */
(function () {
  'use strict';

  var Invite = window.Invite = window.Invite || {};
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var reduce = document.documentElement.classList.contains('reduce-motion');
  var LOVE = ['#FF8FAB', '#E8638C', '#F6C453', '#FFB3C6'];

  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* Tạo một icon từ bộ <symbol> trong index.html */
  function icon(name, className) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    var use = document.createElementNS(SVG_NS, 'use');
    if (className) svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  /* Thả một hình vào lớp hiệu ứng, chạy xong tự dọn */
  function fly(layer, el, frames, timing) {
    layer.appendChild(el);
    var anim = el.animate(frames, timing);
    anim.onfinish = function () { el.remove(); };
    anim.oncancel = function () { el.remove(); };
  }

  /* ---------- Linh vật ----------
     data-mascot="wave balloon" sẽ gắn class mascot--wave và mascot--balloon. */

  function mountMascots(root) {
    var tpl = document.getElementById('tpl-mascot');
    if (!tpl || !tpl.content || !tpl.content.firstElementChild) return;
    var slots = (root || document).querySelectorAll('[data-mascot]');
    Array.prototype.forEach.call(slots, function (slot) {
      if (slot.querySelector('.mascot')) return;   /* chỗ này đã có gấu rồi */
      var node = tpl.content.firstElementChild.cloneNode(true);
      var variants = (slot.getAttribute('data-mascot') || '').split(' ');
      variants.forEach(function (v) {
        if (v) node.classList.add('mascot--' + v);
      });
      slot.appendChild(node);
    });
  }

  /* ---------- Hạt bay nền ---------- */

  function initAmbient(container) {
    if (!container || reduce) return;

    var weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
               (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    var count = weak ? 9 : 18;
    var kinds = ['heart', 'heart', 'star', 'heart', 'sparkle', 'cap', 'heart', 'paw', 'sparkle'];
    var colors = ['#FF8FAB', '#FFB3C6', '#F6C453', '#C9B6F5', '#8FD6B8', '#A9D2FA', '#E8638C'];

    for (var i = 0; i < count; i++) {
      var kind = kinds[i % kinds.length];
      var el = icon(kind, 'mote');
      var size = kind === 'cap' ? rand(26, 38) : rand(14, 28);
      var dur = rand(15, 27);
      el.style.setProperty('--x', ((i + rand(0.15, 0.85)) / count * 100).toFixed(2) + 'vw');
      el.style.setProperty('--s', size.toFixed(0) + 'px');
      el.style.setProperty('--d', dur.toFixed(1) + 's');
      el.style.setProperty('--delay', (-rand(0, dur)).toFixed(1) + 's');
      el.style.setProperty('--sway', rand(-46, 46).toFixed(0) + 'px');
      el.style.setProperty('--r', rand(-140, 140).toFixed(0) + 'deg');
      el.style.setProperty('--o', rand(0.45, 0.8).toFixed(2));
      el.style.color = pick(colors);
      container.appendChild(el);
    }

    document.addEventListener('visibilitychange', function () {
      container.classList.toggle('is-paused', document.hidden);
    });
  }

  /* ---------- Tim nở ra ở mỗi chỗ chạm ---------- */

  function initTapHearts(layer) {
    if (!layer || reduce || !layer.animate || !window.PointerEvent) return;
    var last = 0;

    document.addEventListener('pointerdown', function (e) {
      var now = Date.now();
      if (now - last < 140) return;
      last = now;

      for (var i = 0; i < 3; i++) {
        var el = icon(i === 2 ? 'sparkle' : 'heart', 'fx__item');
        var size = rand(11, 21);
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.left = (e.clientX - size / 2 + rand(-8, 8)) + 'px';
        el.style.top = (e.clientY - size / 2 + rand(-8, 8)) + 'px';
        el.style.color = pick(LOVE);
        fly(layer, el, [
          { transform: 'translate3d(0,0,0) scale(.3) rotate(0deg)', opacity: 0.95 },
          { transform: 'translate3d(' + rand(-26, 26) + 'px,' + (-rand(38, 78)) + 'px,0) scale(1) rotate(' + rand(-30, 30) + 'deg)', opacity: 0 }
        ], { duration: rand(620, 920), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
      }
    }, { passive: true });
  }

  /* ---------- Gõ chữ ----------
     Toàn bộ chữ nằm sẵn trong trang, chia làm phần đã hiện và phần còn ẩn,
     nên bố cục không bị xô lệch khi chữ chạy. */

  function prepareTypewriter(el) {
    if (!el || el._tw) return;
    var text = el.textContent || '';
    if (text.normalize) text = text.normalize('NFC');
    var chars = Array.from ? Array.from(text) : text.split('');

    var on = document.createElement('span');
    var caret = document.createElement('span');
    var off = document.createElement('span');
    on.className = 'tw__on';
    caret.className = 'tw__caret';
    off.className = 'tw__off';
    off.textContent = text;

    el.textContent = '';
    el.appendChild(on);
    el.appendChild(caret);
    el.appendChild(off);
    el._tw = { chars: chars, on: on, off: off, started: false };
  }

  function typewriter(el, speed) {
    var st = el && el._tw;
    if (!st || st.started) return;
    st.started = true;

    var full = st.chars.join('');
    if (reduce) {
      st.on.textContent = full;
      st.off.textContent = '';
      return;
    }

    var i = 0;
    el.classList.add('is-typing');
    var timer = setInterval(function () {
      i++;
      st.on.textContent = st.chars.slice(0, i).join('');
      st.off.textContent = st.chars.slice(i).join('');
      if (i >= st.chars.length) {
        clearInterval(timer);
        setTimeout(function () { el.classList.remove('is-typing'); }, 900);
      }
    }, speed || 55);
  }

  /* ---------- Đếm ngược ---------- */

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* when: mili giây (main.js đã đọc sẵn) hoặc chuỗi ngày giờ */
  function initCountdown(page, when) {
    if (!page) return;
    var target = typeof when === 'number' ? when
      : (Invite.parseDate ? Invite.parseDate(when) : new Date(when).getTime());
    if (isNaN(target)) {
      /* Không biết ngày lễ: giấu các ô 00 thay vì để một đồng hồ đứng im */
      var box = page.querySelector('[data-countdown]');
      if (box) box.style.display = 'none';
      return;
    }

    var units = {
      d: page.querySelector('[data-unit="d"]'),
      h: page.querySelector('[data-unit="h"]'),
      m: page.querySelector('[data-unit="m"]'),
      s: page.querySelector('[data-unit="s"]')
    };
    var timer = null;

    function put(el, value) {
      if (!el || el.textContent === value) return;
      el.textContent = value;
      if (reduce) return;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        diff = 0;
        page.classList.add('is-done');
        if (timer) clearInterval(timer);
      }
      var total = Math.floor(diff / 1000);
      put(units.d, pad(Math.floor(total / 86400)));
      put(units.h, pad(Math.floor(total % 86400 / 3600)));
      put(units.m, pad(Math.floor(total % 3600 / 60)));
      put(units.s, pad(total % 60));
    }

    tick();
    timer = setInterval(tick, 1000);
  }

  /* ---------- Chùm tim nở ra từ một phần tử ---------- */

  function hearts(origin, opts) {
    var layer = document.getElementById('fx');
    if (!layer || !layer.animate || reduce) return;
    opts = opts || {};

    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 2;
    if (origin && origin.getBoundingClientRect) {
      var r = origin.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height * (opts.at === undefined ? 0.5 : opts.at);
    }

    var count = opts.count || 14;
    var near = opts.near || 70;
    var far = opts.far || 170;

    for (var i = 0; i < count; i++) {
      var el = icon(i % 4 === 3 ? 'sparkle' : 'heart', 'fx__item');
      var size = rand(16, 30);
      var angle = (i / count) * Math.PI * 2 + rand(-0.25, 0.25);
      var dist = rand(near, far);
      var x = Math.cos(angle) * dist;
      var y = Math.sin(angle) * dist - 40;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.left = (cx - size / 2) + 'px';
      el.style.top = (cy - size / 2) + 'px';
      el.style.color = pick(LOVE);
      fly(layer, el, [
        { transform: 'translate3d(0,0,0) scale(.2)', opacity: 1 },
        { transform: 'translate3d(' + (x * 0.8) + 'px,' + (y * 0.8) + 'px,0) scale(1.15)', opacity: 1, offset: 0.55 },
        { transform: 'translate3d(' + x + 'px,' + (y + 26) + 'px,0) scale(.7)', opacity: 0 }
      ], { duration: rand(850, 1300), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    }
  }

  /* ---------- Màn ăn mừng ---------- */

  var PARTY = ['#FF8FAB', '#FFD6E0', '#FFE9A8', '#CDEFE0', '#CFE8FF', '#E4D7FF', '#F6C453', '#E8638C'];
  var HEART_PATH = 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z';
  var heartShape = null;

  function confettiShow() {
    var confetti = window.confetti;
    if (typeof confetti !== 'function') return;

    var base = { zIndex: 80, disableForReducedMotion: true, colors: PARTY };
    function fire(opts) {
      var o = {};
      var k;
      for (k in base) o[k] = base[k];
      for (k in opts) o[k] = opts[k];
      try { confetti(o); } catch (e) {}
    }

    /* Hai khẩu pháo giấy hai bên */
    fire({ particleCount: 70, angle: 60, spread: 62, startVelocity: 52, origin: { x: 0, y: 0.78 } });
    fire({ particleCount: 70, angle: 120, spread: 62, startVelocity: 52, origin: { x: 1, y: 0.78 } });
    setTimeout(function () {
      fire({ particleCount: 45, angle: 75, spread: 70, startVelocity: 45, origin: { x: 0.1, y: 0.85 } });
      fire({ particleCount: 45, angle: 105, spread: 70, startVelocity: 45, origin: { x: 0.9, y: 0.85 } });
    }, 260);

    /* Mưa trái tim, hai đợt */
    function heartRain(delay, count) {
      setTimeout(function () {
        if (!heartShape && confetti.shapeFromPath) {
          try {
            heartShape = confetti.shapeFromPath({
              path: HEART_PATH,
              matrix: [0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666, -5.533333333333333]
            });
          } catch (e) { heartShape = null; }
        }
        var opts = {
          particleCount: count,
          spread: 150,
          startVelocity: 26,
          gravity: 0.65,
          ticks: 260,
          scalar: 2.3,
          origin: { x: 0.5, y: 0.32 },
          colors: LOVE
        };
        if (heartShape) opts.shapes = [heartShape];
        fire(opts);
      }, delay);
    }
    heartRain(520, 42);
    heartRain(1250, 30);
  }

  /* Tung mũ cử nhân lên trời */
  function throwCaps(layer, count) {
    if (!layer || !layer.animate) return;
    var W = window.innerWidth;
    var H = window.innerHeight;

    for (var i = 0; i < count; i++) {
      var el = icon('cap', 'fx__item');
      var size = rand(40, 62);
      var dx = rand(-W * 0.32, W * 0.32);
      var peak = rand(H * 0.5, H * 0.86);
      var spin = rand(-620, 620);
      el.style.width = size + 'px';
      el.style.height = size * 0.84 + 'px';
      el.style.left = (W / 2 + rand(-W * 0.3, W * 0.3) - size / 2) + 'px';
      el.style.top = H + 'px';
      fly(layer, el, [
        { transform: 'translate3d(0,0,0) rotate(0deg)', easing: 'cubic-bezier(.15,.75,.35,1)' },
        { transform: 'translate3d(' + (dx * 0.6) + 'px,' + (-peak) + 'px,0) rotate(' + (spin * 0.6) + 'deg)', offset: 0.48, easing: 'cubic-bezier(.6,0,.9,.55)' },
        { transform: 'translate3d(' + dx + 'px,90px,0) rotate(' + spin + 'deg)' }
      ], { duration: rand(1500, 2200), delay: i * 70, fill: 'both' });
    }
  }

  function finale(opts) {
    opts = opts || {};
    if (navigator.vibrate) {
      try { navigator.vibrate([30, 60, 30]); } catch (e) {}
    }
    if (reduce) return;

    var page = opts.page;
    if (page) {
      page.classList.remove('is-party');
      void page.offsetWidth;
      page.classList.add('is-party');
      setTimeout(function () { page.classList.remove('is-party'); }, 1500);
    }

    hearts(opts.origin, { count: 14 });
    throwCaps(document.getElementById('fx'), 10);
    confettiShow();
  }

  Invite.effects = {
    reduce: reduce,
    rand: rand,
    pick: pick,
    icon: icon,
    fly: fly,
    mountMascots: mountMascots,
    initAmbient: initAmbient,
    initTapHearts: initTapHearts,
    prepareTypewriter: prepareTypewriter,
    typewriter: typewriter,
    initCountdown: initCountdown,
    hearts: hearts,
    finale: finale
  };
})();
