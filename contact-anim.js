/* Contact page centerpiece: a black wireframe constellation that constantly
   morphs between shapes (tetrahedron, cube, octahedron, icosahedron,
   dodecahedron, sphere spiral, trefoil knot) on an otherwise blank page. */
(function () {
  var canvas = document.getElementById("bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var INK = [0, 0, 0];
  var N = 300;          // particles shared by every shape
  var MORPH = 700;      // ms spent morphing to the next shape
  var HOLD = 800;       // ms spent resting as a shape

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, cx = 0, cy = 0, R = 0;

  function build() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H * 0.72;
    R = Math.min(W, H) * 0.14;
  }

  // ---------- shape builders ----------
  // Every shape is { pts: N unit-sphere-ish positions, chains: arrays of
  // particle indices to join with line segments }.

  function normalize(verts) {
    var m = 0;
    for (var i = 0; i < verts.length; i++) {
      var v = verts[i];
      m = Math.max(m, Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]));
    }
    for (var i = 0; i < verts.length; i++)
      verts[i] = [verts[i][0] / m, verts[i][1] / m, verts[i][2] / m];
    return verts;
  }

  function edgesByMinDist(verts) {
    function d(a, b) {
      var dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    var minD = Infinity;
    for (var i = 0; i < verts.length; i++)
      for (var j = i + 1; j < verts.length; j++)
        minD = Math.min(minD, d(verts[i], verts[j]));
    var edges = [];
    for (var i = 0; i < verts.length; i++)
      for (var j = i + 1; j < verts.length; j++)
        if (d(verts[i], verts[j]) < minD * 1.05) edges.push([i, j]);
    return edges;
  }

  // spread N particles along a polyhedron's edges, endpoints included
  function fromPolyhedron(verts, edges) {
    var per = Math.floor(N / edges.length);
    var extra = N - per * edges.length;
    var pts = [], chains = [];
    for (var e = 0; e < edges.length; e++) {
      var k = per + (e < extra ? 1 : 0);
      if (k < 2) k = 2;
      var a = verts[edges[e][0]], b = verts[edges[e][1]];
      var chain = [];
      for (var s = 0; s < k && pts.length < N; s++) {
        var t = k === 1 ? 0 : s / (k - 1);
        chain.push(pts.length);
        pts.push([a[0] + (b[0] - a[0]) * t,
                  a[1] + (b[1] - a[1]) * t,
                  a[2] + (b[2] - a[2]) * t]);
      }
      chains.push(chain);
    }
    while (pts.length < N) { pts.push(pts[pts.length - 1].slice()); }
    return { pts: pts, chains: chains };
  }

  // one continuous chain through a parametric curve
  function fromCurve(fn) {
    var pts = [], chain = [];
    for (var i = 0; i < N; i++) {
      chain.push(i);
      pts.push(fn(i / N));
    }
    return { pts: pts, chains: [chain] };
  }

  var t = (1 + Math.sqrt(5)) / 2, u = 1 / t;

  var TETRA = normalize([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]);
  var CUBE = normalize([
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
  ]);
  var OCTA = normalize([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]);
  var ICOSA = normalize([
    [0, 1, t], [0, -1, t], [0, 1, -t], [0, -1, -t],
    [1, t, 0], [-1, t, 0], [1, -t, 0], [-1, -t, 0],
    [t, 0, 1], [t, 0, -1], [-t, 0, 1], [-t, 0, -1]
  ]);
  var DODECA = normalize([
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, u, t], [0, u, -t], [0, -u, t], [0, -u, -t],
    [u, t, 0], [u, -t, 0], [-u, t, 0], [-u, -t, 0],
    [t, 0, u], [t, 0, -u], [-t, 0, u], [-t, 0, -u]
  ]);

  var SHAPES = [
    fromPolyhedron(TETRA, edgesByMinDist(TETRA)),
    fromCurve(function (s) { // sphere spiral
      var a = Math.acos(1 - 2 * s), b = s * Math.PI * 14;
      return [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)];
    }),
    fromPolyhedron(CUBE, edgesByMinDist(CUBE)),
    fromPolyhedron(ICOSA, edgesByMinDist(ICOSA)),
    fromCurve(function (s) { // trefoil knot
      var a = s * Math.PI * 2, k = 0.55;
      return [k * (Math.sin(a) + 2 * Math.sin(2 * a)),
              k * (Math.cos(a) - 2 * Math.cos(2 * a)),
              k * -Math.sin(3 * a)];
    }),
    fromPolyhedron(OCTA, edgesByMinDist(OCTA)),
    fromPolyhedron(DODECA, edgesByMinDist(DODECA))
  ];

  // ---------- morph + render ----------
  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ease(x) { // easeInOutCubic
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function rot(p, time) {
    var ay = time * 0.0006, ax = time * 0.00037;
    var cosY = Math.cos(ay), sinY = Math.sin(ay);
    var cosX = Math.cos(ax), sinX = Math.sin(ax);
    var x1 = p[0] * cosY - p[2] * sinY;
    var z1 = p[0] * sinY + p[2] * cosY;
    var y1 = p[1] * cosX - z1 * sinX;
    var z2 = p[1] * sinX + z1 * cosX;
    return { x: x1, y: y1, z: z2 };
  }

  function draw(time) {
    ctx.clearRect(0, 0, W, H);

    var cycle = MORPH + HOLD;
    var idx = Math.floor(time / cycle) % SHAPES.length;
    var next = (idx + 1) % SHAPES.length;
    var phase = time % cycle;
    var m = phase < HOLD ? 0 : ease((phase - HOLD) / MORPH);
    var A = SHAPES[idx], B = SHAPES[next];

    // blended, rotated, projected particle positions
    var sp = [];
    for (var i = 0; i < N; i++) {
      var a = A.pts[i], b = B.pts[i];
      var p = rot([a[0] + (b[0] - a[0]) * m,
                   a[1] + (b[1] - a[1]) * m,
                   a[2] + (b[2] - a[2]) * m], time);
      var persp = 2.6 / (2.6 - p.z);
      sp.push({ x: cx + p.x * R * persp, y: cy - p.y * R * persp,
                depth: (p.z + 1) / 2 });
    }

    // wireframe: crossfade the outgoing shape's chains for the incoming's
    var settle = 1 - Math.sin(m * Math.PI); // 1 at rest, 0 mid-morph
    var lineSets = m < 0.5 ? [[A, 1 - m * 2]] : [[B, m * 2 - 1]];
    ctx.lineWidth = 1;
    for (var ls = 0; ls < lineSets.length; ls++) {
      var shape = lineSets[ls][0], fade = lineSets[ls][1];
      for (var c = 0; c < shape.chains.length; c++) {
        var chain = shape.chains[c];
        for (var s = 1; s < chain.length; s++) {
          var p = sp[chain[s - 1]], q = sp[chain[s]];
          var dd = (p.depth + q.depth) / 2;
          ctx.strokeStyle = "rgba(" + INK[0] + "," + INK[1] + "," + INK[2] +
            "," + ((0.1 + dd * 0.45) * fade) + ")";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    // particles
    for (var i = 0; i < N; i++) {
      var p = sp[i];
      ctx.fillStyle = "rgba(" + INK[0] + "," + INK[1] + "," + INK[2] + "," +
        (0.35 + p.depth * 0.55) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8 + p.depth * 1.6 + settle * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduced) requestAnimationFrame(draw);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { build(); if (reduced) draw(0); }, 120);
  });

  build();
  draw(0); // paint synchronously so navigation never shows an empty canvas
})();
