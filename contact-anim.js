/* Contact page centerpiece: a spinning 3D icosahedron of golden dots.
   12 dots fly in from scattered points around the screen, assemble into
   the shape, then spin forever. The background itself stays blank. */
(function () {
  var canvas = document.getElementById("bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var RADIUS = 1.5;
  var GOLD = [240, 196, 78];

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, cx = 0, cy = 0, R = 0;
  var homes = []; // scatter start position for each vertex

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

    homes = [];
    for (var k = 0; k < V.length; k++)
      homes.push({ x: Math.random() * W, y: Math.random() * H });
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
      var home = homes[k];
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

    // --- lightly filled faces (back-face culled, depth-sorted) ---
    if (edgeA > 0.01) {
      var r3 = [];
      for (var k = 0; k < V.length; k++) r3[k] = rot3(k, time);

      var vis = [];
      for (var fi = 0; fi < faces.length; fi++) {
        var f = faces[fi];
        var a3 = r3[f[0]], b3 = r3[f[1]], c3 = r3[f[2]];
        var ux = b3.x - a3.x, uy = b3.y - a3.y, uz = b3.z - a3.z;
        var vx = c3.x - a3.x, vy = c3.y - a3.y, vz = c3.z - a3.z;
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        var ax2 = (a3.x + b3.x + c3.x) / 3, ay2 = (a3.y + b3.y + c3.y) / 3, az2 = (a3.z + b3.z + c3.z) / 3;
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

    // --- shape vertices ---
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

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 120);
  });

  buildPattern();
  build();
  draw(0); // paint synchronously so navigation never shows an empty canvas
})();
