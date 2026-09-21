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
     Scroll progress bar + navbar material
     Single rAF-batched scroll listener: the nav picks up its
     blur/material only once content is actually scrolling
     under it (a scroll-edge effect, not a permanent divider).
  --------------------------------------------------------- */
  var progressBar = document.getElementById("progressBar");
  var nav = document.querySelector(".nav");
  var NAV_SCROLL_THRESHOLD = 24;

  function updateProgress() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
    if (nav) nav.classList.toggle("is-scrolled", scrollTop > NAV_SCROLL_THRESHOLD);
  }

  var scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      updateProgress();
      scrollTicking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
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
    { k: "$ run filinglens --eval golden-set", v: "", cls: "" },
    { k: "  numeric_hallucination_rate", v: "0.0% (from 25.0%)", cls: "metric" },
    { k: "  numeric_accuracy", v: "100%", cls: "metric" },
    { k: "  tests", v: "26/26 passing", cls: "ok" },
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

  var maxVisibleLines = 9;
  var nextLineIndex = 0;

  function makeTerminalRow(line, delay) {
    var row = document.createElement("div");
    row.className = "terminal__line";
    if (delay) row.style.animationDelay = delay;

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
    return row;
  }

  function moveCursorTo(row) {
    var stale = terminalBody.querySelector(".blink");
    if (stale) stale.remove();
    if (!row) return;
    var cursor = document.createElement("span");
    cursor.className = "blink";
    row.appendChild(cursor);
  }

  // Append one new line and drop the oldest once the panel is full — an
  // endless log, not a fixed-size window that periodically resets and
  // regrows. Settled lines are never re-rendered, so they never re-flash.
  function appendTerminalLine() {
    if (!terminalBody) return;
    var line = logLines[nextLineIndex % logLines.length];
    nextLineIndex++;

    var row = makeTerminalRow(line);
    terminalBody.appendChild(row);
    moveCursorTo(row);

    while (terminalBody.children.length > maxVisibleLines) {
      terminalBody.removeChild(terminalBody.firstElementChild);
    }
  }

  if (terminalBody) {
    // Boot-up: fill the panel once with a staggered fade-in, then switch
    // to appending a single new line per tick.
    for (var bootI = 0; bootI < maxVisibleLines; bootI++) {
      var bootLine = logLines[nextLineIndex % logLines.length];
      nextLineIndex++;
      terminalBody.appendChild(makeTerminalRow(bootLine, bootI * 0.05 + "s"));
    }
    moveCursorTo(terminalBody.lastElementChild);
    setInterval(appendTerminalLine, 900);
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

  /* ---------------------------------------------------------
     Spring-driven project card hover
     A tiny critically-damped spring (damping/response model —
     see the apple-design skill, §4 Behavior over animation).
     Retargeting mid-flight always continues from the current
     value + velocity, so fast hover in/out never "brick walls".
  --------------------------------------------------------- */
  function createSpring(opts) {
    opts = opts || {};
    var damping = opts.damping == null ? 1 : opts.damping;
    var response = opts.response == null ? 0.35 : opts.response;
    var angularFreq = (2 * Math.PI) / response;
    var stiffness = angularFreq * angularFreq;
    var dampingCoef = 2 * damping * angularFreq;
    var onUpdate = opts.onUpdate || function () {};

    var value = opts.value == null ? 0 : opts.value;
    var velocity = 0;
    var target = value;
    var lastTime = null;
    var rafId = null;

    function isSettled() {
      return Math.abs(target - value) < 0.001 && Math.abs(velocity) < 0.001;
    }

    function frame(now) {
      if (lastTime == null) lastTime = now;
      var dt = Math.min((now - lastTime) / 1000, 0.032); // clamp to survive tab-switch stalls
      lastTime = now;

      var substeps = 4;
      var h = dt / substeps;
      for (var i = 0; i < substeps; i++) {
        var accel = -stiffness * (value - target) - dampingCoef * velocity;
        velocity += accel * h;
        value += velocity * h;
      }

      if (isSettled()) {
        value = target;
        velocity = 0;
        onUpdate(value);
        rafId = null;
        lastTime = null;
        return;
      }

      onUpdate(value);
      rafId = requestAnimationFrame(frame);
    }

    function setTarget(t) {
      target = t;
      if (rafId == null) rafId = requestAnimationFrame(frame);
    }

    return { setTarget: setTarget };
  }

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!prefersReducedMotion) {
    document.querySelectorAll(".card").forEach(function (card) {
      var spring = createSpring({
        damping: 1,
        response: 0.35,
        value: 0,
        onUpdate: function (v) {
          card.style.setProperty("--t", v);
        },
      });
      card.addEventListener("pointerenter", function () {
        spring.setTarget(1);
      });
      card.addEventListener("pointerleave", function () {
        spring.setTarget(0);
      });
      card.addEventListener("focusin", function () {
        spring.setTarget(1);
      });
      card.addEventListener("focusout", function () {
        spring.setTarget(0);
      });
    });
  }
})();
