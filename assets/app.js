/* =========================================================
   うたがえし — UIモックの画面挙動（バックエンドなし）

   実装（utagaeshi）の React 部品と同じ触り心地になることだけを目的にする。
   状態は画面の中だけに持ち、保存も通信もしない。

   実装との対応
     デッキ          CardDeck / PersonDeck
     返し帳          ReplyBookView
     月の折りたたみ  MonthAccordion
     投稿欄          SceneComposer
     メニュー        HomeMenu
     文字サイズ      lib/visual-card-text.ts
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     visual-card の本文サイズ（lib/visual-card-text.ts の移植）

     カードは長い言葉が来ても高さを変えない。入らなければ1段ずつ
     小さくし、最小でも入らなければ省略して「続きを読む」を出す。
     モックで実際に使うのは、投稿欄から増える自分のカードだけ。
     --------------------------------------------------------- */
  var SIZES = ["xl", "lg", "md", "sm"];
  var METRICS = {
    xl: { fontSize: 28, lineHeight: 1.85 },
    lg: { fontSize: 23, lineHeight: 1.9 },
    md: { fontSize: 19, lineHeight: 1.9 },
    sm: { fontSize: 17, lineHeight: 1.65 },
  };
  var TEXT_AREA = { width: 280, height: 260 };
  var LETTER_SPACING = 0.02;
  var MORE_HEIGHT = 33;
  var HALF_WIDTH = /[ -~｡-ﾟ]/;

  function charsPerLine(size) {
    return Math.floor(TEXT_AREA.width / (METRICS[size].fontSize * (1 + LETTER_SPACING)));
  }
  function maxLines(size, withMore) {
    var m = METRICS[size];
    return Math.floor((TEXT_AREA.height - (withMore ? MORE_HEIGHT : 0)) / (m.fontSize * m.lineHeight));
  }
  function textWidth(text) {
    var width = 0;
    for (var i = 0; i < text.length; i++) width += HALF_WIDTH.test(text[i]) ? 0.5 : 1;
    return width;
  }
  function countLines(text, perLine) {
    return text.split("\n").reduce(function (total, line) {
      return total + Math.max(1, Math.ceil(textWidth(line) / perLine));
    }, 0);
  }
  /** 本文に合う段階を返す。maxSize より大きくはしない */
  function layoutText(raw, maxSize) {
    var text = String(raw).replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    var ladder = SIZES.slice(Math.max(0, SIZES.indexOf(maxSize || "xl")));
    for (var i = 0; i < ladder.length; i++) {
      if (countLines(text, charsPerLine(ladder[i])) <= maxLines(ladder[i], false)) {
        return { size: ladder[i], text: text };
      }
    }
    var size = ladder[ladder.length - 1];
    var perLine = charsPerLine(size);
    var limit = maxLines(size, true) * perLine - 1;
    var width = 0;
    var cut = "";
    for (var j = 0; j < text.length; j++) {
      var next = width + (HALF_WIDTH.test(text[j]) ? 0.5 : 1);
      if (next > limit) break;
      width = next;
      cut += text[j];
    }
    return { size: size, text: cut.replace(/\s+$/, "") + "…" };
  }

  /** 本文の段落に、決めた段階をそのまま当てる */
  function applyText(p, raw, maxSize) {
    var layout = layoutText(raw, maxSize);
    p.textContent = layout.text;
    p.className = "vcard-text vcard-text--" + layout.size;
  }

  /* ---------------------------------------------------------
     共通の小道具
     --------------------------------------------------------- */
  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /** 目次から札を選んだときに、上のカードまで画面を戻す（lib/scroll-to-card.ts） */
  function scrollToCard(card) {
    if (!card) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  /** 左右スワイプでめくる（lib/use-swipe.ts）。45px以上・縦のほうが大きい動きは無視 */
  var SWIPE_THRESHOLD = 45;
  function onSwipe(el, prev, next) {
    var start = null;
    el.addEventListener("touchstart", function (event) {
      var touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    el.addEventListener("touchend", function (event) {
      var from = start;
      start = null;
      if (!from) return;
      var touch = event.changedTouches[0];
      var dx = touch.clientX - from.x;
      var dy = touch.clientY - from.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0) prev();
      else next();
    });
  }

  /* ---------------------------------------------------------
     デッキ（CardDeck / PersonDeck）

     ・カードはすべてHTMLにあり、表示するものだけを出す
     ・pages はいま積んである札（カードの位置）の並び
     ・目次（.scene-link / .word / .index-row）は押しても遷移せず、
       上のカードが切り替わるだけ。開いている札は目次でも光る
     ・○○さんの残した言葉だけは5枚から始め、目次から開いたものを
       末尾に足す（減らさないので、さっき読んだ札が消えない）
     --------------------------------------------------------- */
  function setupDeck(root) {
    var deck = root.querySelector("[data-deck]");
    if (!deck) return null;

    var cards = all(".vcard", deck);
    var initial = deck.getAttribute("data-deck-initial");
    var pages = initial
      ? initial.split(",").map(Number)
      : cards.map(function (_, index) { return index; });
    var index = 0;

    var prevBtn = root.querySelector("[data-deck-prev]");
    var nextBtn = root.querySelector("[data-deck-next]");
    var countEl = root.querySelector("[data-deck-count]");
    var labelEl = root.querySelector("[data-deck-label]");
    var row = root.querySelector("[data-deck-row]");
    var swipeNote = root.querySelector(".swipe-note");

    function render() {
      var card = pages[index];
      cards.forEach(function (el, position) { el.hidden = position !== card; });

      if (countEl) countEl.textContent = (index + 1) + " / " + pages.length;
      if (labelEl) labelEl.textContent = cards[card].getAttribute("data-label") || "";
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === pages.length - 1;
      if (swipeNote) swipeNote.hidden = pages.length < 2;

      if (row) {
        all("[data-for]", row).forEach(function (el) {
          el.hidden = Number(el.getAttribute("data-for")) !== card;
        });
        closeActMenu();
      }

      all("[data-deck-open]", root).forEach(function (el) {
        var open = Number(el.getAttribute("data-deck-open")) === card;
        el.classList.toggle("is-current", open);
        if (open) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
      });
    }

    function go(to) {
      index = Math.min(pages.length - 1, Math.max(0, to));
      render();
    }

    /** 目次から開く。積んでいない札は末尾に足す */
    function open(card) {
      var at = pages.indexOf(card);
      if (at < 0) {
        pages.push(card);
        at = pages.length - 1;
      }
      go(at);
      scrollToCard(deck);
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { go(index - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(index + 1); });
    onSwipe(deck, function () { go(index - 1); }, function () { go(index + 1); });

    all("[data-deck-open]", root).forEach(function (el) {
      el.addEventListener("click", function () {
        open(Number(el.getAttribute("data-deck-open")));
      });
    });

    /* 自分の言葉の「…」。整える・削除はこの中へ畳む */
    var actMenu = root.querySelector("[data-act-menu]");
    function closeActMenu() {
      if (!actMenu) return;
      actMenu.hidden = true;
      all("[data-act-more]", root).forEach(function (el) {
        el.setAttribute("aria-expanded", "false");
      });
    }
    document.addEventListener("pointerdown", function (event) {
      if (!actMenu || actMenu.hidden) return;
      if (row && !row.contains(event.target)) closeActMenu();
    });

    render();

    return {
      root: root,
      deck: deck,
      cards: cards,
      pages: pages,
      go: go,
      open: open,
      render: render,
      addCard: function (card, at) {
        cards.push(card);
        deck.appendChild(card);
        var position = cards.length - 1;
        pages.splice(at, 0, position);
        return position;
      },
      closeActMenu: closeActMenu,
    };
  }

  /* ---------------------------------------------------------
     「…」の開閉（自分の言葉のときだけ出る）
     --------------------------------------------------------- */
  function setupActMenu(root) {
    var menu = root.querySelector("[data-act-menu]");
    if (!menu) return;
    root.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-act-more]");
      if (!trigger) return;
      var open = menu.hidden;
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------------------------------------------------------
     届いた（ReactionButtons）
     --------------------------------------------------------- */
  function setupReactions(root) {
    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-react]");
      if (!button) return;
      var count = button.querySelector(".reaction-count");
      var on = button.classList.toggle("on");
      count.textContent = String(Math.max(0, Number(count.textContent) + (on ? 1 : -1)));
    });
  }

  /* ---------------------------------------------------------
     投稿欄（SceneComposer）

     投稿の前後で画面の作りは変えない。デッキの2ページ目に自分の言葉が
     1枚増えて、投稿欄が消えるだけ（同じURLの状態遷移）。
     --------------------------------------------------------- */
  var REPLY_MAX = 140;
  var REPLY_MIN = 1;

  function setupComposer(deck) {
    var root = deck.root;
    var compose = root.querySelector("[data-compose]");
    if (!compose) return;

    var input = compose.querySelector("[data-compose-input]");
    var count = compose.querySelector("[data-compose-count]");
    var submit = compose.querySelector("[data-compose-submit]");
    var grid = root.querySelector("[data-word-grid]");
    var row = root.querySelector("[data-deck-row]");

    input.addEventListener("input", function () {
      if (input.value.length > REPLY_MAX) input.value = input.value.slice(0, REPLY_MAX);
      count.textContent = input.value.length + " / " + REPLY_MAX;
      submit.disabled = input.value.trim().length < REPLY_MIN;
    });

    submit.addEventListener("click", function () {
      var body = input.value.trim();
      if (body.length < REPLY_MIN) return;

      var card = document.getElementById("tpl-mine-card").content.firstElementChild.cloneNode(true);
      applyText(card.querySelector(".vcard-text"), body, "xl");
      var position = deck.addCard(card, 1);

      var acts = document.getElementById("tpl-mine-acts").content.firstElementChild.cloneNode(true);
      acts.setAttribute("data-for", String(position));
      acts.hidden = true;
      row.appendChild(acts);

      var chip = document.getElementById("tpl-mine-chip").content.firstElementChild.cloneNode(true);
      chip.querySelector("p").textContent = body;
      chip.setAttribute("data-deck-open", String(position));
      chip.addEventListener("click", function () { deck.open(position); });
      grid.insertBefore(chip, grid.firstElementChild);

      compose.hidden = true;
      deck.go(1);
      scrollToCard(deck.deck);
    });
  }

  /* ---------------------------------------------------------
     返し帳（ReplyBookView）

     ・残した言葉 / 心に残った言葉 の2タブ
     ・カードは1枚ずつ。前のページ / 次のページ と左右スワイプ
     ・カードの中で 言葉 ⇄ その日の景色 を切り替える
     ・目次の行を押しても遷移しない。上のカードが切り替わるだけ
     ・ページ番号は古い順に固定、目次は新しい日付から降順
     --------------------------------------------------------- */
  function setupBook(root) {
    var panes = all("[data-book-pane]", root);
    if (!panes.length) return;

    all("[data-book-tab]", root).forEach(function (tab) {
      tab.addEventListener("click", function () {
        var key = tab.getAttribute("data-book-tab");
        all("[data-book-tab]", root).forEach(function (el) {
          var active = el === tab;
          el.classList.toggle("active", active);
          el.setAttribute("aria-selected", String(active));
        });
        panes.forEach(function (pane) {
          pane.hidden = pane.getAttribute("data-book-pane") !== key;
        });
      });
    });

    panes.forEach(setupBookPane);
  }

  function setupBookPane(pane) {
    /* 目次の行が、そのままページの元になる（data-page は古い順の番号） */
    var rows = all("[data-book-open]", pane).sort(function (a, b) {
      return Number(a.getAttribute("data-page")) - Number(b.getAttribute("data-page"));
    });
    if (!rows.length) return;

    var card = pane.querySelector("[data-book-card]");
    var vcard = card.querySelector(".vcard");
    var labelEl = vcard.querySelector(".vcard-label");
    var chipEl = vcard.querySelector(".vcard-chip");
    var textEl = vcard.querySelector(".vcard-text");
    var toggleEl = vcard.querySelector("[data-book-toggle]");
    var metaRightEl = vcard.querySelector("[data-book-meta-right]");
    var counter = pane.querySelector("[data-book-counter]");
    var prevBtn = pane.querySelector("[data-book-prev]");
    var nextBtn = pane.querySelector("[data-book-next]");
    var wordLabel = pane.getAttribute("data-book-word-label") || "あなたの言葉";

    /* 開いたときは最新のページ（＝ページ番号がいちばん大きいもの） */
    var index = rows.length - 1;
    var mode = "word";

    function render() {
      var row = rows[index];
      var scene = mode === "scene";

      vcard.className = "vcard vcard--" + (scene ? "scene" : "mine");
      vcard.style.backgroundImage = "url('" + row.getAttribute("data-image") + "')";
      labelEl.textContent = row.getAttribute("data-date");
      chipEl.textContent = scene ? "この日の景色" : wordLabel;
      applyText(textEl, row.getAttribute(scene ? "data-scene" : "data-word"), scene ? "lg" : "xl");
      toggleEl.textContent = scene ? "自分の言葉に戻る" : "この日の景色を見る";
      metaRightEl.textContent = row.getAttribute("data-meta-right") || "";

      if (counter) counter.textContent = (index + 1) + " / " + rows.length;
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === rows.length - 1;

      rows.forEach(function (el, position) {
        el.classList.toggle("active", position === index);
      });

      /* いま開いているページの月は、畳まれていると見つけられないので開く */
      var month = rows[index].closest(".toc-month");
      if (month) openMonth(month);
    }

    function move(to) {
      index = Math.min(rows.length - 1, Math.max(0, to));
      mode = "word";
      render();
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { move(index - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { move(index + 1); });
    onSwipe(card, function () { move(index - 1); }, function () { move(index + 1); });

    toggleEl.addEventListener("click", function () {
      mode = mode === "word" ? "scene" : "word";
      render();
    });

    rows.forEach(function (row, position) {
      row.addEventListener("click", function () {
        move(position);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    render();
  }

  /* ---------------------------------------------------------
     月の折りたたみ（MonthAccordion）
     今月は開いたまま（閉じられない）、過去の月は折りたたみ
     --------------------------------------------------------- */
  function openMonth(month) {
    month.classList.add("expanded");
    var body = month.querySelector(".toc-month-body");
    if (body) body.classList.add("open");
    var head = month.querySelector("button.toc-month-head");
    if (head) head.setAttribute("aria-expanded", "true");
  }

  function setupAccordion(root) {
    all("button.toc-month-head", root).forEach(function (head) {
      head.addEventListener("click", function () {
        var month = head.closest(".toc-month");
        var open = !month.classList.contains("expanded");
        month.classList.toggle("expanded", open);
        month.querySelector(".toc-month-body").classList.toggle("open", open);
        head.setAttribute("aria-expanded", String(open));
      });
    });
  }

  /* ---------------------------------------------------------
     ヘッダーのメニュー（HomeMenu）
     --------------------------------------------------------- */
  function setupMenu() {
    var trigger = document.querySelector("[data-menu]");
    var panel = document.querySelector(".header-menu-panel");
    if (!trigger || !panel) return;

    function close() {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", function () {
      if (!panel.hidden) {
        close();
        return;
      }
      var rect = trigger.getBoundingClientRect();
      panel.style.top = rect.bottom + window.scrollY + 10 + "px";
      panel.style.right = window.innerWidth - rect.right - window.scrollX + "px";
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    });

    document.addEventListener("pointerdown", function (event) {
      if (panel.hidden) return;
      if (!trigger.contains(event.target) && !panel.contains(event.target)) close();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
  }

  /* ---------------------------------------------------------
     プロフィールの編集（ProfileIdentity）
     別ページへ飛ばさず、同じ場所で入力欄に変える
     --------------------------------------------------------- */
  function setupProfile(root) {
    var view = root.querySelector("[data-profile-view]");
    var edit = root.querySelector("[data-profile-edit]");
    if (!view || !edit) return;
    var rest = root.querySelector("[data-profile-rest]");

    function show(editing) {
      view.hidden = editing;
      edit.hidden = !editing;
      /* 直している間も、下の内容は消さずに薄くするだけ */
      if (rest) rest.classList.toggle("is-dim", editing);
    }

    all("[data-profile-start]", root).forEach(function (el) {
      el.addEventListener("click", function () { show(true); });
    });
    all("[data-profile-cancel]", root).forEach(function (el) {
      el.addEventListener("click", function () { show(false); });
    });

    edit.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = edit.querySelector("[name=display_name]").value.trim();
      var bio = edit.querySelector("[name=bio]").value.trim();
      view.querySelector(".person-head-body h1").textContent = name || "うたがえし";
      var bioEl = view.querySelector(".person-bio");
      bioEl.textContent = bio || "自己紹介はまだありません。";
      bioEl.classList.toggle("is-empty", !bio);
      show(false);
    });

    var bioInput = edit.querySelector("[name=bio]");
    var bioCount = edit.querySelector("[data-bio-count]");
    if (bioInput && bioCount) {
      bioInput.addEventListener("input", function () {
        bioCount.textContent = bioInput.value.length + " / 140";
      });
    }
  }

  /* ---------------------------------------------------------
     はじめての方へ（IntroDeck）
     --------------------------------------------------------- */
  function setupIntro(root) {
    var viewport = root.querySelector("[data-intro]");
    if (!viewport) return;
    var pages = all("[data-intro-page]", viewport);
    var indicator = root.querySelector("[data-intro-indicator]");
    var prevBtn = root.querySelector("[data-intro-prev]");
    var nextBtn = root.querySelector("[data-intro-next]");
    var index = 0;

    function render() {
      pages.forEach(function (page, position) {
        page.hidden = position !== index;
        page.classList.toggle("intro-card-active", position === index);
      });
      if (indicator) indicator.textContent = (index + 1) + " / " + pages.length;
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === pages.length - 1;
    }
    function go(delta) {
      index = Math.min(pages.length - 1, Math.max(0, index + delta));
      render();
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });
    onSwipe(viewport, function () { go(-1); }, function () { go(1); });
    render();
  }

  /* ---------------------------------------------------------
     起動
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    var main = document.querySelector("main");
    if (!main) return;

    var deck = setupDeck(main);
    if (deck) {
      setupActMenu(main);
      setupComposer(deck);
    }
    setupReactions(main);
    setupBook(main);
    setupAccordion(main);
    setupProfile(main);
    setupIntro(main);
    setupMenu();

    /* 実装ではフォームの送信ボタン。モックは行き先へ飛ばすだけ */
    all("[data-href]").forEach(function (el) {
      el.addEventListener("click", function () {
        location.href = el.getAttribute("data-href");
      });
    });

    /* モックにはシェア先が無いので、押しても何も起きない */
    all("[data-share]").forEach(function (el) {
      el.addEventListener("click", function (event) {
        event.preventDefault();
      });
    });
  });
})();
