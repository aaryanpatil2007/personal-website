/* Minimalist interactive background dot field.
   A golden grid of dots that breathes on its own and brightens softly
   under the cursor. Fills the whole background uniformly. */
(function () {
  var canvas = document.getElementById("bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var SPACING = 30;     // grid pitch
  var RADIUS = 1.5;     // base dot radius
  var REACH = 150;      // cursor influence radius
  var GOLD = [240, 196, 78]; // bright golden

  var dots = [];
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var mouse = { x: -9999, y: -9999 };
  var W = 0, H = 0;

  function build() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dots = [];
    for (var y = SPACING; y < H; y += SPACING) {
      for (var x = SPACING / 2; x < W; x += SPACING) {
        dots.push({ x: x, y: y, seed: (x * 13 + y * 7) % 1000 });
      }
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var pulse = 0.62 + 0.1 * Math.sin(t / 1400 + d.seed);

      var dx = mouse.x - d.x;
      var dy = mouse.y - d.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      var influence = 0, mx = 0, my = 0;
      if (dist < REACH) {
        influence = 1 - dist / REACH;
        var pull = influence * 6;
        mx = (dx / (dist || 1)) * pull;
        my = (dy / (dist || 1)) * pull;
      }

      var alpha = pulse + influence * 0.2;
      if (alpha <= 0.005) continue;
      var r = RADIUS + influence * 0.8;

      ctx.beginPath();
      ctx.arc(d.x + mx, d.y + my, r, 0, Math.PI * 2);
      ctx.fillStyle =
        "rgba(" + GOLD[0] + "," + GOLD[1] + "," + GOLD[2] + "," + alpha + ")";
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("pointerleave", function () {
    mouse.x = mouse.y = -9999;
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 120);
  });

  build();
  draw(0); // paint synchronously so navigation never shows an empty canvas
})();
