/* うたがえし UIモック — 画面挙動のデモ用スクリプト（バックエンドなし） */
(function () {
  "use strict";

  /* ===== 投稿前 / 投稿後 の状態（段階制） =====
     実際のサービスでは投稿の有無をサーバーで判定するが、
     モックでは localStorage で「今日返したか」を保持してデモする。 */
  var POSTED_KEY = "utagaeshi_posted";
  function isPosted() { return localStorage.getItem(POSTED_KEY) === "1"; }
  function setPosted(v) {
    if (v) localStorage.setItem(POSTED_KEY, "1");
    else localStorage.removeItem(POSTED_KEY);
  }

  /* data-when="posted" / "unposted" の要素を状態に応じて出し分け */
  function applyState() {
    var posted = isPosted();
    document.querySelectorAll("[data-when]").forEach(function (el) {
      var want = el.getAttribute("data-when");
      el.hidden = (want === "posted") !== posted;
    });
  }
  applyState();

  /* デモ用：投稿前の状態に戻す */
  document.querySelectorAll("[data-demo-reset]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      setPosted(false);
      location.reload();
    });
  });

  /* --- 下部ナビの現在地ハイライト --- */
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-item").forEach(function (el) {
    if (el.getAttribute("href") === path) el.classList.add("on");
  });

  /* --- リアクションのトグル（1回押し = 追加 / もう一度 = 取り消し） --- */
  document.querySelectorAll(".react").forEach(function (btn) {
    if (btn.classList.contains("disabled")) return;
    btn.addEventListener("click", function () {
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

  /* --- 投稿フォーム：10〜200字のカウントと送信可否 --- */
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
        if (over) {
          statusEl.textContent = (raw - MAX) + "字オーバー";
          statusEl.className = "count-status danger";
        } else if (under) {
          statusEl.textContent = "あと" + (MIN - len) + "字";
          statusEl.className = "count-status";
        } else {
          statusEl.textContent = "OK";
          statusEl.className = "count-status ok";
        }
      }
      if (submit) submit.disabled = over || under;
    };
    ta.addEventListener("input", update);
    update();

    /* 送信（モック）：投稿済みにして、みんなの返しが開いた一覧へ */
    if (submit) {
      submit.addEventListener("click", function () {
        if (submit.disabled) return;
        setPosted(true);
        location.href = "posts.html";
      });
    }

    /* AI「返しの例」をタップしたら入力欄に下書きとして入れる */
    document.querySelectorAll(".example").forEach(function (ex) {
      ex.addEventListener("click", function () {
        ta.value = ex.getAttribute("data-text") || "";
        update();
        ta.focus();
        ta.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

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
          if (mode === "popular") {
            return (+b.dataset.reactions) - (+a.dataset.reactions);
          }
          return (+b.dataset.time) - (+a.dataset.time);
        });
        items.forEach(function (it) { list.appendChild(it); });
      });
    });
  }
})();
