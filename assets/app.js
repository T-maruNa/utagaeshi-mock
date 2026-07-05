/* うたがえし UIモック — 画面挙動のデモ用スクリプト（バックエンドなし） */
(function () {
  "use strict";

  /* --- 下部ナビの現在地ハイライト --- */
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-item").forEach(function (el) {
    var href = el.getAttribute("href");
    if (href === path) el.classList.add("on");
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

  /* --- 投稿フォームの送信可否（空のときは押せない・文字数制限なし） --- */
  var ta = document.querySelector(".textarea");
  if (ta) {
    var submit = document.querySelector("[data-submit]");
    var update = function () {
      if (submit) submit.disabled = ta.value.trim().length === 0;
    };
    ta.addEventListener("input", update);
    update();

    /* AI投稿例をタップしたら入力欄に下書きとして入れる */
    document.querySelectorAll(".example").forEach(function (ex) {
      ex.addEventListener("click", function () {
        var text = ex.getAttribute("data-text") || "";
        ta.value = text;
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
          return (+b.dataset.time) - (+a.dataset.time); // 新着 = time降順
        });
        items.forEach(function (it) { list.appendChild(it); });
      });
    });
  }
})();
