(function () {
  "use strict";

  /* ---------------------------------------------------------
     Scroll-triggered reveal (Intersection Observer)
  --------------------------------------------------------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------------------------------------------------------
     Scroll progress bar
  --------------------------------------------------------- */
  var progressBar = document.getElementById("progressBar");
  function updateProgress() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ---------------------------------------------------------
     Back to top
  --------------------------------------------------------- */
  var scrollTopBtn = document.getElementById("scrollTop");
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------------------------------------------------------
     Live clock in terminal bar
  --------------------------------------------------------- */
  var clockEl = document.getElementById("clock");
  function tickClock() {
    if (!clockEl) return;
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    clockEl.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------------------------------------------------------
     Terminal build-log panel — cycles through verified metrics
  --------------------------------------------------------- */
  var terminalBody = document.getElementById("terminalBody");

  var logLines = [
    { k: "$ run log-toolkit --report", v: "", cls: "" },
    { k: "  additional_issue_detection", v: "+11.5%", cls: "metric" },
    { k: "  triage_items", v: "-65.1%", cls: "metric" },
    { k: "  manual_steps", v: "-85.7%", cls: "metric" },
    { k: "  tests", v: "16/16 passing", cls: "ok" },
    { k: "$ run incidentsim --suite", v: "", cls: "" },
    { k: "  tests", v: "27/27 passing", cls: "ok" },
    { k: "$ run fleet-dashboard --query-bench", v: "", cls: "" },
    { k: "  fleet_size", v: "22 vehicles", cls: "metric" },
    { k: "  telemetry_readings", v: "~9,300", cls: "metric" },
    { k: "  query_improvement", v: "~27%", cls: "metric" },
    { k: "$ status", v: "", cls: "" },
    { k: "  build", v: "green", cls: "ok" }
  ];

  var lineIndex = 0;
  var maxVisibleLines = 9;

  function renderTerminal() {
    if (!terminalBody) return;
    terminalBody.innerHTML = "";

    var start = Math.max(0, lineIndex - maxVisibleLines + 1);
    var visible = logLines.slice(start, lineIndex + 1);

    visible.forEach(function (line, i) {
      var row = document.createElement("div");
      row.className = "terminal__line";
      row.style.animationDelay = i * 0.02 + "s";

      var k = document.createElement("span");
      k.className = "k";
      k.textContent = line.k;
      row.appendChild(k);

      if (line.v) {
        var v = document.createElement("span");
        v.className = "v " + (line.cls || "");
        v.textContent = line.v;
        row.appendChild(v);
      }

      terminalBody.appendChild(row);
    });

    var cursor = document.createElement("span");
    cursor.className = "blink";
    var lastRow = terminalBody.lastElementChild;
    if (lastRow) lastRow.appendChild(cursor);
  }

  function stepTerminal() {
    lineIndex = (lineIndex + 1) % logLines.length;
    renderTerminal();
  }

  if (terminalBody) {
    renderTerminal();
    setInterval(stepTerminal, 900);
  }

  /* ---------------------------------------------------------
     Smooth-scroll for in-page nav links (fallback for older browsers)
  --------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = link.getAttribute("href");
      if (targetId.length > 1) {
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });
})();
