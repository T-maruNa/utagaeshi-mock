/* うたがえし UIモック — 画面挙動のデモ用スクリプト（バックエンドなし） */
(function () {
  "use strict";

  /* ===== ログイン状態 =====
     「うたがえし」は読むだけなら誰でもOK。返す・リアクション・返し帳・AIに
     読んでもらう、はログインが必要。モックでは localStorage で状態をデモする。 */
  var LOGIN_KEY = "utagaeshi_loggedin";
  function isLoggedIn() { return localStorage.getItem(LOGIN_KEY) === "1"; }
  function setLoggedIn(v) {
    if (v) localStorage.setItem(LOGIN_KEY, "1");
    else localStorage.removeItem(LOGIN_KEY);
  }

  /* data-auth="in" はログイン時のみ / "out" は未ログイン時のみ表示 */
  function applyAuth() {
    var loggedIn = isLoggedIn();
    document.querySelectorAll("[data-auth]").forEach(function (el) {
      el.hidden = (el.getAttribute("data-auth") === "in") !== loggedIn;
    });
  }

  /* ===== ログイン誘導シート（画面下からせり上がる） ===== */
  var sheet;
  function ensureSheet() {
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.className = "sheet-overlay";
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="sheet" role="dialog" aria-modal="true">' +
      '  <p class="sheet-msg" data-sheet-msg>ログインが必要です。</p>' +
      '  <a class="btn btn-primary" href="login.html">ログイン / 新規登録</a>' +
      '  <button class="btn btn-ghost" type="button" data-sheet-close>とじる</button>' +
      '</div>';
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

  /* 明示的にログイン誘導を出す要素（未ログイン時のみ） */
  document.querySelectorAll("[data-login-msg]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (isLoggedIn()) return; // ログイン済みなら本来の動作へ
      e.preventDefault();
      showLogin(el.getAttribute("data-login-msg"));
    });
  });

  /* ログイン実行（login.html 用） */
  document.querySelectorAll("[data-do-login]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      setLoggedIn(true);
      location.href = "index.html";
    });
  });
  /* デモ用ログアウト */
  document.querySelectorAll("[data-do-logout]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      setLoggedIn(false);
      location.reload();
    });
  });

  applyAuth();

  /* --- 下部ナビの現在地ハイライト --- */
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-item").forEach(function (el) {
    if (el.getAttribute("href") === path) el.classList.add("on");
  });

  /* --- リアクション（ログイン必須。未ログインは誘導） --- */
  document.querySelectorAll(".react").forEach(function (btn) {
    if (btn.classList.contains("disabled")) return;
    btn.addEventListener("click", function () {
      if (!isLoggedIn()) {
        showLogin("リアクションするにはログインしてください。");
        return;
      }
      var countEl = btn.querySelector(".count");
      var n = parseInt(countEl.textContent, 10) || 0;
      if (btn.classList.contains("on")) {
        btn.classList.remove("on");
        countEl.textContent = Math.max(0, n - 1);
      } else {
        btn.classList.add("on");
        countEl.textContent = n + 1;
      }
    });
  });

  /* --- 返しフォーム：10〜200字（ログイン時のみ表示される想定） --- */
  var ta = document.querySelector(".textarea");
  if (ta) {
    var MIN = 10, MAX = 200;
    var submit = document.querySelector("[data-submit]");
    var numEl = document.querySelector("[data-count-num]");
    var statusEl = document.querySelector("[data-count-status]");
    var wrap = document.querySelector(".count");

    var update = function () {
      var raw = ta.value.length;
      var len = ta.value.trim().length;
      if (numEl) numEl.textContent = raw;
      var over = raw > MAX;
      var under = len < MIN;
      if (wrap) wrap.classList.toggle("over", over);
      if (statusEl) {
        if (over) { statusEl.textContent = (raw - MAX) + "字オーバー"; statusEl.className = "count-status danger"; }
        else if (under) { statusEl.textContent = "あと" + (MIN - len) + "字"; statusEl.className = "count-status"; }
        else { statusEl.textContent = "OK"; statusEl.className = "count-status ok"; }
      }
      if (submit) submit.disabled = over || under;
    };
    ta.addEventListener("input", update);
    update();

    if (submit) {
      submit.addEventListener("click", function () {
        if (submit.disabled) return;
        var done = document.querySelector("[data-post-done]");
        var form = document.querySelector("[data-post-form]");
        if (done && form) { form.hidden = true; done.hidden = false; done.scrollIntoView({ behavior: "smooth", block: "center" }); }
      });
    }

    document.querySelectorAll(".example").forEach(function (ex) {
      ex.addEventListener("click", function () {
        ta.value = ex.getAttribute("data-text") || "";
        update();
        ta.focus();
        ta.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  /* --- 「AIに読んでもらう」ダミー感想の表示（将来枠） --- */
  document.querySelectorAll("[data-ai-read]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.querySelector(btn.getAttribute("data-ai-read"));
      if (target) { target.hidden = false; btn.hidden = true; }
    });
  });

  /* --- 並び替えタブ（新着 / 人気） --- */
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
