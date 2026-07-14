/* うたがえし UIモック — 画面挙動のデモ用スクリプト（バックエンドなし） */
(function () {
  "use strict";

  /* ===== ログイン状態 ===== */
  var LOGIN_KEY = "utagaeshi_loggedin";
  function isLoggedIn() { return localStorage.getItem(LOGIN_KEY) === "1"; }
  function setLoggedIn(v) {
    if (v) localStorage.setItem(LOGIN_KEY, "1");
    else localStorage.removeItem(LOGIN_KEY);
  }
  function applyAuth() {
    var loggedIn = isLoggedIn();
    document.querySelectorAll("[data-auth]").forEach(function (el) {
      el.hidden = (el.getAttribute("data-auth") === "in") !== loggedIn;
    });
  }

  /* ===== ログイン誘導シート ===== */
  var sheet;
  function ensureSheet() {
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.className = "sheet-overlay";
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="sheet" role="dialog" aria-modal="true">' +
      '  <p class="sheet-msg" data-sheet-msg>返すにはログインが必要です。</p>' +
      '  <a class="btn btn-primary" href="login.html">ログインする</a>' +
      '  <button class="btn btn-ghost" type="button" data-sheet-close>あとで</button>' +
      "</div>";
    document.body.appendChild(sheet);
    var close = function () { sheet.hidden = true; };
    sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
    sheet.querySelector("[data-sheet-close]").addEventListener("click", close);
    return sheet;
  }
  function showLogin(msg) {
    var s = ensureSheet();
    s.querySelector("[data-sheet-msg]").textContent = msg || "この操作にはログインが必要です。";
    s.hidden = false;
  }

  /* ===== トースト ===== */
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2200);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ===== リアクション（ログイン必須） ===== */
  function bindReaction(btn) {
    if (btn.classList.contains("disabled") || btn.__bound) return;
    btn.__bound = true;
    btn.addEventListener("click", function () {
      if (!isLoggedIn()) { showLogin("リアクションするにはログインしてください。"); return; }
      var countEl = btn.querySelector(".count");
      var n = parseInt(countEl.textContent, 10) || 0;
      if (btn.classList.contains("on")) { btn.classList.remove("on"); countEl.textContent = Math.max(0, n - 1); }
      else { btn.classList.add("on"); countEl.textContent = n + 1; }
    });
  }
  function bindReactions(root) {
    (root || document).querySelectorAll(".react").forEach(bindReaction);
  }

  /* ===== 短歌への「このうた好き」（1ユーザー1回・ログイン必須・返しreactionとは別） ===== */
  document.querySelectorAll(".poem-like").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!isLoggedIn()) { showLogin("このうたを好きにするにはログインしてください。"); return; }
      var countEl = btn.querySelector(".count");
      var n = parseInt(countEl.textContent, 10) || 0;
      if (btn.classList.contains("on")) { btn.classList.remove("on"); countEl.textContent = Math.max(0, n - 1); }
      else { btn.classList.add("on"); countEl.textContent = n + 1; }
    });
  });

  /* ===== コメント（返し詳細・ログイン必須・1〜200字） ===== */
  var COMMENT_MAX = 200;
  function initComments(section) {
    var ta = section.querySelector("[data-comment-input]");
    var submit = section.querySelector("[data-comment-submit]");
    var hint = section.querySelector("[data-comment-hint]");
    var list = section.querySelector("[data-comment-list]");
    var totalEl = section.querySelector("[data-comment-total]");
    if (!ta || !submit) return;

    var update = function () {
      var len = ta.value.trim().length;
      var over = ta.value.length > COMMENT_MAX;
      if (over) { hint.textContent = (ta.value.length - COMMENT_MAX) + "字オーバー"; hint.className = "comment-form-hint count-status danger"; }
      else { hint.textContent = "1〜200字"; hint.className = "comment-form-hint"; }
      submit.disabled = over || len < 1;
    };
    ta.addEventListener("input", update);
    update();

    submit.addEventListener("click", function () {
      if (submit.disabled) return;
      var val = ta.value.trim();
      var item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML =
        '<span class="avatar">こ</span>' +
        '<div><span class="comment-user">言葉</span><span class="comment-time">たった今</span>' +
        '<p class="comment-body"></p></div>';
      item.querySelector(".comment-body").textContent = val;
      if (list) list.insertBefore(item, list.firstChild);
      if (totalEl) totalEl.textContent = (parseInt(totalEl.textContent, 10) || 0) + 1;
      ta.value = "";
      update();
      toast("コメントしました");
    });
  }
  document.querySelectorAll(".comments").forEach(initComments);

  /* ===== 投稿モーダル（Xのコンポーズ風） ===== */
  var POEM = {
    text: "春過ぎて 夏来にけらし 白妙の 衣ほすてふ 天の香具山",
    meta: "持統天皇／百人一首・二番",
  };
  var MIN = 10, MAX = 200;
  var composeModal;
  function ensureComposeModal() {
    if (composeModal) return composeModal;
    var m = document.createElement("div");
    m.className = "modal-overlay";
    m.hidden = true;
    m.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '  <div class="modal-head">' +
      '    <button class="modal-close" type="button" data-modal-close aria-label="とじる">✕</button>' +
      '    <span class="modal-title">返す</span>' +
      '    <button class="btn-post" type="button" data-submit disabled>返す</button>' +
      '  </div>' +
      '  <div class="modal-body">' +
      '    <div class="modal-poem">' +
      '      <div class="label">このうたに返す</div>' +
      '      <div class="text">' + POEM.text + '</div>' +
      '      <div class="meta">' + POEM.meta + '</div>' +
      '    </div>' +
      '    <p class="form-note">正解じゃなくて大丈夫。今の自分ならどう言うかを書いてください。</p>' +
      '    <textarea class="textarea" placeholder="今の自分なら、どう返しますか？"></textarea>' +
      '    <div class="count"><span class="hint">10〜200字</span>' +
      '      <span><span data-count-status class="count-status">あと10字</span> ・ <b data-count-num>0</b> / 200</span></div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(m);

    var ta = m.querySelector(".textarea");
    var submit = m.querySelector("[data-submit]");
    var numEl = m.querySelector("[data-count-num]");
    var statusEl = m.querySelector("[data-count-status]");
    var wrap = m.querySelector(".count");

    var update = function () {
      var raw = ta.value.length, len = ta.value.trim().length;
      numEl.textContent = raw;
      var over = raw > MAX, under = len < MIN;
      wrap.classList.toggle("over", over);
      if (over) { statusEl.textContent = (raw - MAX) + "字オーバー"; statusEl.className = "count-status danger"; }
      else if (under) { statusEl.textContent = "あと" + (MIN - len) + "字"; statusEl.className = "count-status"; }
      else { statusEl.textContent = "OK"; statusEl.className = "count-status ok"; }
      submit.disabled = over || under;
    };
    m.__update = update;
    ta.addEventListener("input", update);

    var close = function () { m.hidden = true; };
    m.querySelector("[data-modal-close]").addEventListener("click", close);
    m.addEventListener("click", function (e) { if (e.target === m) close(); });

    submit.addEventListener("click", function () {
      if (submit.disabled) return;
      var val = ta.value.trim();
      close();
      prependMyReply(val);
      toast("返しました");
      ta.value = ""; update();
    });
    composeModal = m;
    return m;
  }

  function openCompose(prefill) {
    if (!isLoggedIn()) { showLogin("返すにはログインが必要です。"); return; }
    var m = ensureComposeModal();
    var ta = m.querySelector(".textarea");
    if (prefill) ta.value = prefill;
    m.hidden = false;
    m.__update();
    setTimeout(function () { ta.focus(); }, 60);
  }

  /* 自分の返しをフィード先頭に差し込む（モック） */
  function prependMyReply(text) {
    var list = document.querySelector("[data-list]");
    if (!list) return;
    var el = document.createElement("article");
    el.className = "post";
    el.setAttribute("data-reactions", "0");
    el.setAttribute("data-time", "9999");
    el.innerHTML =
      '<a class="post-main" href="post-detail.html">' +
      '  <div class="post-head"><span class="avatar">こ</span>' +
      '    <div><div class="post-user">言葉</div><div class="post-time">たった今</div></div></div>' +
      '  <p class="post-body"></p>' +
      '</a>' +
      '<div class="reactions">' +
      '  <button class="react"><span class="emoji">🫧</span>わかる<span class="count">0</span></button>' +
      '  <button class="react"><span class="emoji">🎯</span>刺さった<span class="count">0</span></button>' +
      '  <button class="react"><span class="emoji">🤍</span>好き<span class="count">0</span></button>' +
      '</div>';
    el.querySelector(".post-body").textContent = text;
    list.insertBefore(el, list.firstChild);
    bindReactions(el);
  }

  /* ===== ログイン誘導・実行トリガー ===== */
  document.querySelectorAll("[data-login-msg]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (isLoggedIn()) return;
      e.preventDefault();
      showLogin(el.getAttribute("data-login-msg"));
    });
  });
  document.querySelectorAll("[data-do-login]").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); setLoggedIn(true); location.href = "index.html"; });
  });
  document.querySelectorAll("[data-do-logout]").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); setLoggedIn(false); location.reload(); });
  });

  /* 返す導線・投稿バー・返しの例 → モーダル（未ログインは誘導） */
  document.querySelectorAll("[data-compose]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      openCompose(el.getAttribute("data-text") || "");
    });
  });

  applyAuth();

  /* 下部ナビの現在地ハイライト */
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-item").forEach(function (el) {
    if (el.getAttribute("href") === path) el.classList.add("on");
  });

  bindReactions(document);

  /* 縦書き本文：句読点(。、)を優先して列を折り返す。
     1列あたりの文字数は.book-cardのCSS値(height:460px, padding:26px, font-size:17px,
     セル高さ1.9em)から計算した固定値にしている。非表示(hidden)のエントリは
     clientHeightが0になり測れないため、DOM測定ではなく定数で持つ */
  var BOOK_COL_MAX_CHARS = 12;
  document.querySelectorAll(".book-text").forEach(function (el) {
    var text = el.textContent;
    el.textContent = "";

    /* 句読点の直後で区切ったかたまりに分割し、句読点で終わる形を保つ */
    var chunks = text.match(/[^。、]*[。、]|[^。、]+$/g) || [text];

    var columns = [];
    var current = "";
    chunks.forEach(function (chunk) {
      if (current && current.length + chunk.length > BOOK_COL_MAX_CHARS) {
        columns.push(current);
        current = "";
      }
      current += chunk;
      /* かたまり自体が1列に収まらないときだけ、やむを得ず途中で区切る */
      while (current.length > BOOK_COL_MAX_CHARS) {
        columns.push(current.slice(0, BOOK_COL_MAX_CHARS));
        current = current.slice(BOOK_COL_MAX_CHARS);
      }
    });
    if (current) columns.push(current);

    columns.forEach(function (colText) {
      var col = document.createElement("div");
      col.className = "book-col";
      Array.prototype.forEach.call(colText, function (ch) {
        var span = document.createElement("span");
        span.className = "ch";
        span.textContent = ch;
        col.appendChild(span);
      });
      el.appendChild(col);
    });
  });

  /* ===== 1枚ずつめくるカード体験の共通実装（返し帳のbook / トップのdeckで共有） =====
     スワイプ・トラックパッド横スクロール・マウスドラッグ・前後ボタンのどれでも
     めくれるようにし、切り替え時は横スライド＋高さアニメーションで入れ替える。
     opts.scrollConflictSelector を指定すると、その要素内で実際に横スクロールが
     必要なとき（scrollWidth>clientWidth）だけスワイプ/ドラッグを内部スクロール優先にする */
  function initCardCarousel(root, opts) {
    var viewport = root.querySelector(opts.viewportSelector);
    var pages = Array.prototype.slice.call(root.querySelectorAll(opts.entrySelector));
    if (!pages.length) return;
    var currentIndex = opts.initialIndex === "last" ? pages.length - 1 : 0;
    var renderedIdx = currentIndex;
    var isAnimating = false;
    var indicator = root.querySelector(opts.indicatorSelector);
    var prevBtns = Array.prototype.slice.call(root.querySelectorAll(opts.prevSelector));
    var nextBtns = Array.prototype.slice.call(root.querySelectorAll(opts.nextSelector));

    var updateNav = function () {
      if (indicator) indicator.textContent = (currentIndex + 1) + " / " + pages.length;
      prevBtns.forEach(function (b) { b.disabled = currentIndex === 0 || isAnimating; });
      nextBtns.forEach(function (b) { b.disabled = currentIndex === pages.length - 1 || isAnimating; });
    };

    /* direction: "next"/"prev" で現在のカードと次のカードを同時にスライドさせて入れ替える。
       省略時（初期表示）はアニメーションなし */
    var render = function (direction) {
      if (!direction) {
        pages.forEach(function (el, i) { el.hidden = i !== currentIndex; });
        renderedIdx = currentIndex;
        updateNav();
        return;
      }
      if (renderedIdx === currentIndex || isAnimating) { updateNav(); return; }

      var oldEl = pages[renderedIdx];
      var newEl = pages[currentIndex];
      isAnimating = true;
      updateNav();

      var startHeight = oldEl.getBoundingClientRect().height;
      viewport.style.height = startHeight + "px";

      newEl.hidden = false;
      oldEl.classList.add("is-sliding");
      newEl.classList.add("is-sliding", direction === "next" ? "slide-in-next" : "slide-in-prev");
      void newEl.offsetWidth; /* 初期位置を確定させてから次のフレームで遷移させる */

      var endHeight = newEl.getBoundingClientRect().height;
      renderedIdx = currentIndex;

      requestAnimationFrame(function () {
        viewport.style.transition = "height .32s ease";
        viewport.style.height = endHeight + "px";
        oldEl.classList.add(direction === "next" ? "slide-out-next" : "slide-out-prev");
        newEl.classList.remove("slide-in-next", "slide-in-prev");
        newEl.classList.add("slide-settle");
      });

      setTimeout(function () {
        oldEl.hidden = true;
        oldEl.classList.remove("is-sliding", "slide-out-next", "slide-out-prev");
        newEl.classList.remove("is-sliding", "slide-settle");
        viewport.style.transition = "";
        viewport.style.height = "";
        isAnimating = false;
        updateNav();
      }, 340);
    };

    var goNext = function () { if (currentIndex < pages.length - 1 && !isAnimating) { currentIndex++; render("next"); } };
    var goPrev = function () { if (currentIndex > 0 && !isAnimating) { currentIndex--; render("prev"); } };

    prevBtns.forEach(function (b) { b.addEventListener("click", goPrev); });
    nextBtns.forEach(function (b) { b.addEventListener("click", goNext); });
    render();

    var conflictSel = opts.scrollConflictSelector;
    var hasScrollConflict = function (target) {
      if (!conflictSel) return false;
      var el = target.closest && target.closest(conflictSel);
      return !!(el && el.scrollWidth > el.clientWidth);
    };

    /* 左右スワイプ */
    var touchStartX = null, touchStartOnConflict = false;
    root.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartOnConflict = hasScrollConflict(e.target);
    }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (touchStartX === null) return;
      if (touchStartOnConflict) { touchStartX = null; return; }
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (dx < -40) goNext(); else if (dx > 40) goPrev();
      touchStartX = null;
    }, { passive: true });

    /* PCのトラックパッド2本指スワイプはtouch系イベントが発火せずwheelのdeltaXとして届くため、
       別途ここで拾う。縦スクロール（deltaY優勢）とは区別し、連続発火を1ジェスチャー1回に間引く */
    var wheelCooldown = false;
    root.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || wheelCooldown || isAnimating) return;
      if (e.deltaX > 30) goNext(); else if (e.deltaX < -30) goPrev(); else return;
      wheelCooldown = true;
      setTimeout(function () { wheelCooldown = false; }, 400);
    }, { passive: true });

    /* マウスのクリック&ドラッグでもスライダーのようにめくれるようにする */
    var mouseStartX = null, mouseStartOnConflict = false;
    root.addEventListener("mousedown", function (e) {
      mouseStartX = e.clientX;
      mouseStartOnConflict = hasScrollConflict(e.target);
      if (!mouseStartOnConflict) e.preventDefault(); /* ドラッグ中のテキスト選択を防ぐ */
    });
    document.addEventListener("mouseup", function (e) {
      if (mouseStartX === null) return;
      if (mouseStartOnConflict) { mouseStartX = null; return; }
      var dx = e.clientX - mouseStartX;
      if (dx < -40) goNext(); else if (dx > 40) goPrev();
      mouseStartX = null;
    });
  }

  /* ===== 返し帳：自分の返しを1ページずつめくる（初期表示は最新の返し） ===== */
  var book = document.querySelector("[data-book]");
  if (book) {
    initCardCarousel(book, {
      viewportSelector: ".book-viewport",
      entrySelector: "[data-book-entry]",
      indicatorSelector: "[data-book-indicator]",
      prevSelector: "[data-book-prev]",
      nextSelector: "[data-book-next]",
      scrollConflictSelector: ".book-card",
      initialIndex: "last",
    });
  }

  /* ===== トップ：今日のうた→届いた返し→AI返し→投稿導線を1枚ずつめくる ===== */
  var deck = document.querySelector("[data-deck]");
  if (deck) {
    initCardCarousel(deck, {
      viewportSelector: ".deck-viewport",
      entrySelector: "[data-deck-card]",
      indicatorSelector: "[data-deck-indicator]",
      prevSelector: "[data-deck-prev]",
      nextSelector: "[data-deck-next]",
      initialIndex: 0,
    });
  }

  /* 「AIに読んでもらう」ダミー感想（将来枠） */
  document.querySelectorAll("[data-ai-read]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.querySelector(btn.getAttribute("data-ai-read"));
      if (target) { target.hidden = false; btn.hidden = true; }
    });
  });

  /* 並び替えタブ（新着 / 人気） */
  var tabs = document.querySelectorAll(".tab");
  if (tabs.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("on"); });
        tab.classList.add("on");
        var mode = tab.getAttribute("data-sort");
        var list = document.querySelector("[data-list]");
        if (!list) return;
        var items = Array.prototype.slice.call(list.querySelectorAll(".post"));
        items.sort(function (a, b) {
          if (mode === "popular") return (+b.dataset.reactions) - (+a.dataset.reactions);
          return (+b.dataset.time) - (+a.dataset.time);
        });
        items.forEach(function (it) { list.appendChild(it); });
      });
    });
  }
})();
