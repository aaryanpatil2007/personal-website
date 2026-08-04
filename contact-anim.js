/* Contact page background + centerpiece, one controller for both.

   Draws the same breathing gold grid as the rest of the site (cursor reaction +
   text repulsion), AND on a loop: recruits 12 real dots out of the grid (their
   spots go empty), flies them into a spinning 3D icosahedron, holds + spins,
   then releases them back to their exact grid spots. Then it loops. */
(function () {
  var canvas = document.getElementById("bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var SPACING = 30, RADIUS = 1.5, REACH = 150;
  var GOLD = [240, 196, 78];

  var dots = [];
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var mouse = { x: -9999, y: -9999 };
  var W = 0, H = 0, cx = 0, cy = 0, R = 0;

  // assemble once over A_END ms, then spin forever
  var A_END = 2800;
  var startTime = 0;

  // --- icosahedron geometry ---
  var t = (1 + Math.sqrt(5)) / 2;
  var V = [
    [0, 1, t], [0, -1, t], [0, 1, -t], [0, -1, -t],
    [1, t, 0], [-1, t, 0], [1, -t, 0], [-1, -t, 0],
    [t, 0, 1], [t, 0, -1], [-t, 0, 1], [-t, 0, -1]
  ];
  var norm = Math.sqrt(1 + t * t);
  for (var i = 0; i < V.length; i++)
    V[i] = [V[i][0] / norm, V[i][1] / norm, V[i][2] / norm];
  function d3(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  var minD = Infinity;
  for (var i = 0; i < V.length; i++)
    for (var j = i + 1; j < V.length; j++)
      minD = Math.min(minD, d3(V[i], V[j]));
  var edges = [];
  var edgeSet = {};
  for (var i = 0; i < V.length; i++)
    for (var j = i + 1; j < V.length; j++)
      if (d3(V[i], V[j]) < minD * 1.05) { edges.push([i, j]); edgeSet[i + "-" + j] = 1; }
  function isEdge(a, b) { return edgeSet[a < b ? a + "-" + b : b + "-" + a]; }

  // faces = triples of mutually-connected vertices (20 triangles)
  var faces = [];
  for (var i = 0; i < V.length; i++)
    for (var j = i + 1; j < V.length; j++)
      for (var k = j + 1; k < V.length; k++)
        if (isEdge(i, j) && isEdge(j, k) && isEdge(i, k)) faces.push([i, j, k]);

  var recruited = [];     // recruited[k] = index into dots for vertex k

  function build() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H * 0.76;
    R = Math.min(W, H) * 0.14;

    dots = [];
    for (var y = SPACING; y < H; y += SPACING)
      for (var x = SPACING / 2; x < W; x += SPACING)
        dots.push({ x: x, y: y, seed: (x * 13 + y * 7) % 1000, vi: -1 });
    pickRecruits();
  }

  // static gold scanline + dither tile — retro arcade fill for the faces
  var pattern = null;
  function buildPattern() {
    var s = 4;
    var pc = document.createElement("canvas");
    pc.width = s; pc.height = s;
    var p = pc.getContext("2d");
    p.fillStyle = "rgb(" + GOLD[0] + "," + GOLD[1] + "," + GOLD[2] + ")";
    p.fillRect(0, 0, s, 1);   // scanline
    p.fillRect(2, 2, 1, 1);   // offset dither dot
    pattern = ctx.createPattern(pc, "repeat");
  }

  // rotated 3D vertex (before perspective) at absolute time
  function rot3(k, time) {
    var ay = time * 0.0006, ax = time * 0.00037;
    var cosY = Math.cos(ay), sinY = Math.sin(ay);
    var cosX = Math.cos(ax), sinX = Math.sin(ax);
    var x = V[k][0], y = V[k][1], z = V[k][2];
    var x1 = x * cosY - z * sinY;
    var z1 = x * sinY + z * cosY;
    var y1 = y * cosX - z1 * sinX;
    var z2 = y * sinX + z1 * cosX;
    return { x: x1, y: y1, z: z2 };
  }
  function project(p) {
    var persp = 2.6 / (2.6 - p.z);
    return { x: cx + p.x * R * persp, y: cy - p.y * R * persp, depth: (p.z + 1) / 2 };
  }
  function vpos(k, time) { return project(rot3(k, time)); }

  // pick 12 random grid dots from anywhere on screen
  function pickRecruits() {
    for (var i = 0; i < dots.length; i++) dots[i].vi = -1;
    recruited = [];
    var taken = {};
    for (var k = 0; k < V.length; k++) {
      var idx;
      do { idx = (Math.random() * dots.length) | 0; } while (taken[idx]);
      taken[idx] = 1;
      recruited[k] = idx;
      dots[idx].vi = k;
    }
  }

  function smooth(x) {
    x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  }

  function draw(time) {
    if (!startTime) startTime = time;
    var el = time - startTime;
    ctx.clearRect(0, 0, W, H);

    var assembling = el < A_END;
    var a = smooth(el / A_END);
    var edgeA = a; // fades to 1 as it assembles, then stays 1

    // compute each vertex's drawn position
    var sp = [];
    for (var k = 0; k < V.length; k++) {
      var di = recruited[k];
      var home = di != null && di >= 0 ? dots[di] : { x: cx, y: cy };
      var proj = vpos(k, time);
      var x, y;
      if (assembling) {
        x = home.x + (proj.x - home.x) * a;
        y = home.y + (proj.y - home.y) * a;
      } else {
        x = proj.x; y = proj.y;
      }
      sp[k] = { x: x, y: y, depth: proj.depth };
    }

    // --- ambient grid (skip dots serving as vertices) ---
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (d.vi >= 0) continue;

      var pulse = 0.62 + 0.1 * Math.sin(time / 1400 + d.seed);
      var dx = mouse.x - d.x, dy = mouse.y - d.y;
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
      ctx.beginPath();
      ctx.arc(d.x + mx, d.y + my, RADIUS + influence * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + GOLD[0] + "," + GOLD[1] + "," + GOLD[2] + "," + alpha + ")";
      ctx.fill();
    }

    // --- lightly filled faces (back-face culled, depth-sorted) ---
    if (edgeA > 0.01) {
      var r3 = [];
      for (var k = 0; k < V.length; k++) r3[k] = rot3(k, time);

      var vis = [];
      for (var fi = 0; fi < faces.length; fi++) {
        var f = faces[fi];
        var a = r3[f[0]], b = r3[f[1]], cc = r3[f[2]];
        var ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
        var vx = cc.x - a.x, vy = cc.y - a.y, vz = cc.z - a.z;
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        var ax2 = (a.x + b.x + cc.x) / 3, ay2 = (a.y + b.y + cc.y) / 3, az2 = (a.z + b.z + cc.z) / 3;
        if (nx * ax2 + ny * ay2 + nz * az2 < 0) { nx = -nx; ny = -ny; nz = -nz; } // outward
        var nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        var facing = nz / nlen;
        if (facing <= 0.02) continue; // cull back faces
        vis.push({ f: f, fi: fi, facing: facing, z: az2 });
      }
      vis.sort(function (p, q) { return p.z - q.z; }); // back to front

      ctx.fillStyle = pattern;
      ctx.globalAlpha = edgeA * 0.6; // uniform fill — no per-face highlighting
      for (var vI = 0; vI < vis.length; vI++) {
        var fc = vis[vI];
        var p0 = sp[fc.f[0]], p1 = sp[fc.f[1]], p2 = sp[fc.f[2]];
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // --- shape edges ---
    if (edgeA > 0.01) {
      ctx.lineWidth = 1;
      for (var e = 0; e < edges.length; e++) {
        var p = sp[edges[e][0]], q = sp[edges[e][1]];
        var dd = (p.depth + q.depth) / 2;
        ctx.strokeStyle = "rgba(" + GOLD[0] + "," + GOLD[1] + "," + GOLD[2] + "," +
          edgeA * (0.12 + dd * 0.5) + ")";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }

    // --- shape vertices (the recruited dots) ---
    ctx.shadowColor = "rgba(" + GOLD[0] + "," + GOLD[1] + "," + GOLD[2] + ",0.9)";
    var pulse2 = 0.5 + 0.5 * Math.sin(time * 0.0013);
    for (var k = 0; k < V.length; k++) {
      var p = sp[k];
      ctx.shadowBlur = 5 + p.depth * 8;
      ctx.fillStyle = "rgba(" + GOLD[0] + "," + GOLD[1] + "," + GOLD[2] + "," +
        (0.5 + p.depth * 0.5) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, RADIUS + 0.6 + p.depth * 2 + pulse2 * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    requestAnimationFrame(draw);
  }

  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
  });
  window.addEventListener("pointerleave", function () {
    mouse.x = mouse.y = -9999;
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 120);
  });

  buildPattern();
  build();
  draw(0); // paint synchronously so navigation never shows an empty canvas
})();
