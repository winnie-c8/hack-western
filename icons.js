// ===== Future Me Island — pixel icon kit =====
// Every icon in the game is drawn here on a 16×16 pixel grid using the game's palette
// (no emojis anywhere). Three ways to use it:
//   pi('coin')                    → animated inline <svg> string for HTML templates
//   pit('Saved +10 :coin:')       → escapes text, turns :name: tokens into icons (safe for user text)
//   <i data-pi="coin"></i>        → in index.html, swapped for the icon on load
//   pixelSprite('tulip', outline) → 16×16 canvas (shop items on the island / in the shop)

(() => {
  const C = {
    k: '#4a3628', // outline / ink
    w: '#fff7e6', c: '#fbf1dc', y: '#f2c26b', Y: '#c79a45', o: '#ec9a5b', O: '#c96f3a',
    r: '#f2a0a8', R: '#d9606a', g: '#a5ca8c', G: '#6f9a63', L: '#c8e2b0',
    t: '#6cc3c8', T: '#4a98a6', l: '#d4f3ea', b: '#caa070', B: '#8d6440', n: '#b98b5c',
    p: '#f1c38f', s: '#c9c0b2', S: '#8f857a', d: '#5a4a6a', sand: '#f3dcaa',
  };
  const N = 16;

  // --- tiny raster: ops paint into a 16×16 grid of palette colours ---
  function raster(ops) {
    const px = Array.from({ length: N }, () => Array(N).fill(null));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) px[y][x] = c; };
    const api = {
      R: (c, x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); },
      P: (c, pts) => pts.forEach(([x, y]) => set(x, y, c)),
      E: (c, cx, cy, rx, ry = rx) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) set(x, y, c); },
      // filled polygon, sampled at pixel centres
      Y: (c, pts) => {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          let inside = false; const X = x + .5, Yc = y + .5;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i], [xj, yj] = pts[j];
            if ((yi > Yc) !== (yj > Yc) && X < (xj - xi) * (Yc - yi) / (yj - yi) + xi) inside = !inside;
          }
          if (inside) set(x, y, c);
        }
      },
      // flame / teardrop: pointed top, round bottom
      F: (c, cx, top, bottom, hw) => {
        for (let y = top; y <= bottom; y++) {
          const t = (y - top) / (bottom - top);
          const w = t < .6 ? hw * (t / .6) : hw * Math.sqrt(Math.max(0, 1 - ((t - .6) / .4) ** 2));
          for (let x = 0; x < N; x++) if (Math.abs(x + .5 - cx) <= Math.max(.5, w)) set(x, y, c);
        }
      },
      X: (pts) => pts.forEach(([x, y]) => set(x, y, null)), // erase
    };
    ops(api, C);
    return px;
  }
  // dark 1px outline around every filled pixel (matches the island's outlined sprites)
  function outline(px) {
    const out = px.map(r => r.slice());
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (px[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => px[y + dy]?.[x + dx] && px[y + dy][x + dx] !== C.k)) out[y][x] = C.k;
    }
    return out;
  }

  // --- the icons: [draw ops, idle animation] ---
  const star = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  const roof = (c, apexX, apexY, baseY, hw) => [[apexX, apexY], [apexX + hw, baseY], [apexX - hw, baseY]];

  const ICONS = {
    coin: ['spin', ({ E, P }, c) => {
      E(c.Y, 8, 8, 7); E(c.y, 8, 8, 6); E(c.Y, 8, 8, 4); E(c.y, 8, 8, 3);
      P(c.w, [[4, 5], [5, 4], [4, 6], [6, 3]]);
    }],
    piggy: ['hop', ({ E, R, P }, c) => {
      E(c.r, 8, 9.5, 6.5, 4.8); R(c.r, 4, 12, 2, 3); R(c.r, 10, 12, 2, 3);
      R(c.R, 13, 8, 2, 3); P(c.k, [[14, 9]]); P(c.R, [[6, 4], [6, 5], [7, 5]]);
      P(c.k, [[11, 7]]); R(c.R, 7, 5, 3, 1);
      R(c.y, 7, 1, 3, 3); P(c.Y, [[9, 3]]);
    }],
    flame: ['flicker', ({ Y }, c) => {
      // main tongue leaning right, two side licks, hot core
      Y(c.O, [[9, 0], [12, 5], [14, 9], [13.5, 13], [11, 15.5], [5, 15.5], [2.5, 13], [2, 9], [4, 4], [5, 7], [7, 3]]);
      Y(c.O, [[2, 3], [4, 6], [2.5, 8]]); Y(c.O, [[14, 2], [14.5, 6], [12.5, 5]]);
      Y(c.o, [[9, 4], [12, 9], [12, 13], [10, 15], [6, 15], [4, 13], [4, 10], [6, 8], [7, 6]]);
      Y(c.y, [[8.5, 8], [10.5, 11], [10, 14], [6, 14], [5.5, 12], [7, 10]]);
      Y(c.w, [[8, 11], [9, 13], [8, 14.5], [7, 13]]);
    }],
    bank: ['bob', ({ R, Y, P }, c) => {
      Y(c.b, roof(0, 8, 0.5, 5.5, 8)); P(c.y, [[7, 3], [8, 3]]);
      R(c.B, 1, 5, 14, 2); R(c.w, 2, 7, 2, 5); R(c.w, 7, 7, 2, 5); R(c.w, 12, 7, 2, 5);
      R(c.c, 4, 7, 3, 5); R(c.c, 9, 7, 3, 5); R(c.b, 1, 12, 14, 2); R(c.B, 0, 14, 16, 2);
    }],
    jar: ['twinkle', ({ R, P, X }, c) => {
      R(c.B, 5, 1, 6, 2); R(c.b, 4, 3, 8, 1);
      R(c.l, 3, 4, 10, 11); X([[3, 4], [12, 4], [3, 14], [12, 14]]);
      R(c.y, 4, 9, 8, 5); P(c.Y, [[5, 11], [8, 12], [10, 10]]); X([[3, 14], [12, 14]]);
      P(c.w, [[4, 5], [4, 6], [4, 7]]); P(c.w, [[9, 6]]);
    }],
    scroll: ['sway', ({ R, P }, c) => {
      R(c.w, 3, 2, 10, 12); R(c.b, 2, 1, 12, 2); R(c.b, 2, 13, 12, 2); P(c.B, [[2, 2], [13, 2], [2, 14], [13, 14]]);
      R(c.s, 5, 5, 6, 1); R(c.s, 5, 7, 6, 1); R(c.s, 5, 9, 4, 1); P(c.R, [[10, 10], [11, 10], [10, 11]]);
    }],
    backpack: ['bob', ({ R, P, X }, c) => {
      R(c.B, 6, 1, 4, 1); P(c.B, [[5, 2], [10, 2]]);
      R(c.b, 3, 3, 10, 12); X([[3, 3], [12, 3]]);
      R(c.B, 3, 3, 10, 4); X([[3, 3], [12, 3]]); P(c.y, [[7, 6], [8, 6]]);
      R(c.n, 5, 9, 6, 4); R(c.B, 5, 9, 6, 1);
    }],
    shopbag: ['swing', ({ R, P }, c) => {
      P(c.B, [[5, 1], [6, 1], [9, 1], [10, 1], [4, 2], [11, 2], [4, 3], [11, 3], [4, 4], [11, 4]]);
      R(c.r, 2, 5, 12, 10); R(c.R, 2, 5, 12, 1); P(c.w, [[4, 7], [4, 8]]);
      P(c.y, [[7, 9], [8, 9], [7, 10], [8, 10]]);
    }],
    town: ['bob', ({ R, Y, P }, c) => {
      Y(c.t, roof(0, 11, 1, 6.5, 5)); R(c.w, 7, 6, 8, 9); R(c.B, 10, 11, 2, 4); P(c.t, [[8, 8], [13, 8]]);
      Y(c.R, roof(0, 4.5, 5, 9.5, 4.5)); R(c.c, 1, 9, 7, 6); R(c.B, 3, 12, 2, 3); P(c.t, [[6, 11]]);
    }],
    home: ['bob', ({ R, Y, P }, c) => {
      R(c.S, 11, 2, 2, 4); Y(c.R, roof(0, 8, 0.5, 7.5, 8));
      R(c.w, 2, 7, 12, 8); R(c.B, 7, 10, 2, 5); R(c.t, 3, 9, 3, 2); R(c.t, 10, 9, 3, 2); P(c.y, [[8, 12]]);
    }],
    pin: ['tap', ({ E, R, P }, c) => {
      E(c.R, 8, 5, 4.5); P(c.r, [[6, 3], [6, 4], [7, 3]]); R(c.R, 6, 8, 4, 2); R(c.S, 7, 10, 2, 5); P(c.s, [[7, 10]]);
    }],
    hammer: ['swing', ({ R, P }, c) => {
      R(c.n, 7, 6, 2, 10); P(c.B, [[7, 9], [8, 12]]);
      R(c.S, 3, 2, 10, 4); R(c.s, 3, 2, 10, 1); R(c.S, 12, 3, 2, 2);
    }],
    fox: ['tilt', ({ E, Y, P }, c) => {
      Y(c.o, [[1, 1], [6, 5], [2, 8]]); Y(c.o, [[15, 1], [10, 5], [14, 8]]);
      P(c.k, [[2, 3], [3, 4], [13, 3], [12, 4]]);
      E(c.o, 8, 9, 6.5, 5.5);
      Y(c.w, [[2, 10], [8, 15.5], [14, 10], [8, 12]]);
      P(c.k, [[5, 8], [10, 8], [7, 12], [8, 12]]);
    }],
    leaf: ['sway', ({ Y, R }, c) => {
      Y(c.R, [[8, 0], [10, 4], [13, 2], [12, 7], [15, 7], [11, 11], [8, 10], [5, 11], [1, 7], [4, 7], [3, 2], [6, 4]]);
      R(c.B, 7, 10, 2, 6);
    }],
    star: ['twinkle', ({ Y, P }, c) => {
      Y(c.y, star(8, 8.6, 8, 3.6)); P(c.w, [[7, 4], [7, 5], [6, 7]]); P(c.Y, [[10, 10], [11, 11], [9, 11]]);
    }],
    sparkle: ['twinkle', ({ Y, P }, c) => {
      Y(c.y, [[6, 0], [7.5, 4.5], [12, 6], [7.5, 7.5], [6, 12], [4.5, 7.5], [0, 6], [4.5, 4.5]]);
      Y(c.w, [[12.5, 9], [13.4, 11.6], [16, 12.5], [13.4, 13.4], [12.5, 16], [11.6, 13.4], [9, 12.5], [11.6, 11.6]]);
    }],
    news: ['sway', ({ R, P }, c) => {
      R(c.w, 2, 2, 12, 12); R(c.k, 4, 4, 8, 2); R(c.t, 4, 8, 3, 3);
      R(c.s, 8, 8, 4, 1); R(c.s, 8, 10, 4, 1); R(c.s, 4, 12, 8, 1); P(c.c, [[13, 13], [2, 13]]);
    }],
    party: ['wiggle', ({ Y, P }, c) => {
      Y(c.y, [[1, 15], [5, 4], [12, 11]]);
      P(c.R, [[4, 9], [5, 8], [6, 10], [3, 12], [7, 12], [8, 11]]);
      P(c.t, [[9, 2], [12, 4], [14, 7]]); P(c.r, [[11, 1], [14, 3]]); P(c.G, [[8, 5], [13, 9]]); P(c.y, [[15, 1]]);
    }],
    crane: ['sway', ({ R, P }, c) => {
      R(c.y, 3, 1, 2, 13); R(c.y, 1, 2, 14, 2); P(c.Y, [[3, 4], [4, 6], [3, 8], [4, 10], [3, 12]]);
      P(c.S, [[12, 4], [12, 5], [12, 6], [12, 7]]); R(c.B, 11, 8, 3, 2);
      R(c.S, 0, 14, 8, 2); R(c.r, 9, 11, 6, 4); R(c.R, 9, 11, 6, 1);
    }],
    people: ['bob', ({ E }, c) => {
      E(c.p, 11, 4.5, 2.6); E(c.r, 11, 12.5, 4, 3.5); E(c.p, 5, 5.5, 2.6); E(c.t, 5, 13, 4, 3.2);
    }],
    crown: ['twinkle', ({ Y, R, P }, c) => {
      Y(c.y, [[1, 4], [5, 8], [8, 2], [11, 8], [15, 4], [14, 13], [2, 13]]);
      R(c.Y, 2, 11, 12, 2); P(c.R, [[5, 11], [10, 11]]); P(c.t, [[7, 11], [8, 11]]); P(c.w, [[8, 4], [3, 6]]);
    }],
    island: ['sway', ({ R, E, P }, c) => {
      R(c.t, 0, 12, 16, 4); P(c.l, [[1, 14], [2, 14], [12, 15], [13, 15]]);
      E(c.sand, 8, 12.5, 6.5, 2); R(c.g, 4, 11, 8, 1);
      P(c.n, [[8, 10], [8, 9], [7, 8], [7, 7], [7, 6], [6, 5]]);
      P(c.G, [[2, 4], [3, 3], [4, 3], [5, 3], [8, 3], [9, 3], [10, 3], [11, 4], [12, 5], [1, 5], [6, 2], [7, 2]]);
      P(c.g, [[4, 4], [5, 4], [8, 4], [9, 4], [6, 1], [7, 1]]); P(c.B, [[6, 4], [7, 4]]);
    }],
    check: ['pop', ({ R, P }, c) => {
      R(c.g, 1, 1, 14, 14); R(c.G, 1, 13, 14, 2);
      P(c.w, [[3, 8], [4, 9], [5, 10], [6, 11], [7, 10], [8, 9], [9, 8], [10, 7], [11, 6], [12, 5], [4, 8], [5, 9], [6, 10], [7, 9], [8, 8], [9, 7], [10, 6], [11, 5], [12, 4]]);
    }],
    box: ['none', ({ R }, c) => { R(c.w, 1, 1, 14, 14); R(c.c, 1, 12, 14, 3); }],
  };

  // --- shop items (no outline: the island adds its own) ---
  const ITEMS = {
    flower: ({ R, P, E }, c) => {
      R(c.G, 7, 8, 2, 8); E(c.g, 4.5, 12, 3, 1.4); E(c.g, 11.5, 11, 3, 1.4);
      R(c.r, 5, 3, 6, 5); P(c.r, [[5, 2], [7, 2], [8, 2], [10, 2], [5, 1], [10, 1], [7, 1], [8, 1]]);
      P(c.R, [[9, 4], [9, 5], [10, 5], [9, 6], [10, 6], [6, 7], [7, 7], [8, 7], [9, 7]]); P(c.w, [[6, 3], [6, 4]]);
    },
    tree: ({ R, E, P }, c) => {
      R(c.n, 7, 10, 3, 6); P(c.B, [[7, 12], [9, 14]]);
      E(c.G, 8, 6.5, 7.5, 6.5); E(c.g, 7, 5.5, 6, 5); P(c.L, [[4, 3], [5, 2], [3, 4], [6, 2], [9, 3], [10, 4]]);
    },
    palm: ({ P, R }, c) => {
      P(c.n, [[7, 15], [8, 15], [7, 14], [8, 14], [8, 13], [9, 13], [8, 12], [9, 12], [8, 11], [9, 11], [9, 10], [10, 10], [9, 9], [10, 9], [9, 8], [10, 8], [10, 7]]);
      P(c.B, [[8, 14], [9, 12], [9, 10]]);
      R(c.G, 3, 3, 5, 1); R(c.G, 1, 4, 3, 1); P(c.G, [[0, 5], [0, 6], [1, 5]]);
      R(c.G, 11, 3, 4, 1); R(c.G, 14, 4, 2, 1); P(c.G, [[15, 5], [15, 6]]);
      R(c.g, 6, 1, 6, 2); R(c.g, 4, 4, 3, 1); R(c.g, 11, 4, 3, 1); P(c.g, [[8, 0], [9, 0]]);
      P(c.B, [[9, 5], [10, 5], [9, 4]]);
    },
    bench: ({ R }, c) => {
      R(c.b, 3, 1, 2, 15); R(c.B, 3, 1, 2, 1); R(c.b, 5, 3, 6, 1); R(c.b, 5, 6, 6, 1);
      R(c.b, 3, 8, 10, 2); R(c.B, 3, 10, 10, 1); R(c.b, 11, 10, 2, 6);
    },
    lamp: ({ R, E, P }, c) => {
      R(c.B, 7, 0, 2, 2); R(c.k, 5, 2, 6, 1);
      E(c.R, 8, 8, 6, 5.5); R(c.r, 4, 5, 1, 6); R(c.y, 7, 4, 2, 8); P(c.w, [[7, 5], [7, 6]]);
      R(c.k, 5, 13, 6, 1); R(c.y, 7, 14, 2, 2);
    },
    fountain: ({ R, E, P }, c) => {
      E(c.S, 8, 13, 8, 3); E(c.t, 8, 12.4, 6.5, 1.6); R(c.s, 7, 8, 2, 5);
      R(c.s, 4, 7, 8, 2); R(c.t, 5, 7, 6, 1);
      R(c.l, 7, 2, 2, 5); P(c.l, [[6, 2], [5, 3], [4, 4], [3, 5], [9, 2], [10, 3], [11, 4], [12, 5], [3, 6], [12, 6], [2, 10], [13, 10]]);
      P(c.w, [[7, 1], [8, 1]]);
    },
    tent: ({ Y, R }, c) => {
      R(c.B, 7, 0, 2, 3); Y(c.o, [[8, 2], [15.5, 15], [0.5, 15]]); Y(c.O, [[8, 2], [9, 2], [15.5, 15], [12, 15]]);
      Y(c.B, [[8, 7], [11, 15], [5, 15]]); R(c.p, 0, 15, 16, 1);
    },
    house: ({ R, Y, P }, c) => {
      R(c.S, 11, 1, 2, 4); Y(c.R, roof(0, 8, 0, 7.5, 8)); Y(c.r, roof(0, 8, 1.6, 6.5, 5.5));
      R(c.w, 2, 7, 12, 9); R(c.B, 7, 10, 2, 6); P(c.y, [[8, 13]]);
      R(c.t, 3, 9, 3, 3); R(c.t, 10, 9, 3, 3); P(c.l, [[3, 9], [10, 9]]); R(c.g, 1, 15, 2, 1); R(c.g, 13, 15, 2, 1);
    },
    car: ({ R, E, P }, c) => {
      R(c.R, 4, 4, 8, 4); R(c.R, 1, 7, 14, 5); R(c.l, 5, 5, 3, 2); R(c.l, 9, 5, 2, 2);
      R(c.r, 1, 7, 14, 1); P(c.y, [[14, 9]]); P(c.w, [[1, 9]]);
      E(c.k, 4.5, 12.5, 2.4); E(c.k, 11.5, 12.5, 2.4); P(c.s, [[4, 12], [11, 12]]);
    },
    plane: ({ R, Y, P }, c) => {
      Y(c.s, [[6, 8], [10, 8], [5, 15], [2, 15]]); Y(c.s, [[6, 8], [10, 8], [5, 1], [2, 1]]);
      R(c.w, 1, 7, 13, 3); P(c.w, [[14, 8], [15, 8]]); P(c.t, [[12, 7], [13, 7]]);
      Y(c.t, [[0, 3], [2, 3], [4, 7], [0, 7]]); P(c.t, [[5, 8], [7, 8], [9, 8], [11, 8]]); R(c.S, 1, 9, 13, 1);
    },
    grad: ({ Y, R, P }, c) => {
      R(c.d, 4, 7, 8, 5); R(c.k, 4, 11, 8, 1);
      Y(c.d, [[0, 6], [8, 2], [16, 6], [8, 10]]); P(c.k, [[7, 5], [8, 5], [8, 6]]);
      P(c.y, [[9, 6], [10, 6], [11, 7], [12, 7], [13, 8], [13, 9], [13, 10], [13, 11]]); R(c.y, 12, 12, 3, 2);
    },
    castle: ({ R, P, E }, c) => {
      R(c.s, 3, 7, 10, 9); R(c.s, 0, 4, 4, 12); R(c.s, 12, 4, 4, 12);
      P(c.s, [[0, 3], [2, 3], [12, 3], [14, 3], [4, 6], [6, 6], [9, 6], [11, 6]]);
      R(c.S, 0, 15, 16, 1); E(c.B, 8, 12.5, 2.5, 3); R(c.B, 6, 12, 4, 4);
      R(c.k, 1, 6, 1, 2); R(c.k, 14, 6, 1, 2); R(c.B, 7, 2, 1, 5); R(c.R, 8, 2, 3, 2);
    },
  };

  const cache = {};
  const grid = (name, withOutline, item = false) => {
    const key = (item ? 'item:' : '') + name + withOutline;
    if (cache[key]) return cache[key];
    const def = item ? ITEMS[name] : ICONS[name]?.[1];
    if (!def) return null;
    const px = raster(def);
    return cache[key] = withOutline ? outline(px) : px;
  };

  // run-length rects per row → compact crisp SVG
  const svgCache = {};
  function svgBody(name) {
    if (svgCache[name]) return svgCache[name];
    const px = grid(name, true); if (!px) return '';
    let out = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N;) {
      const c = px[y][x]; let w = 1;
      while (c && px[y][x + w] === c) w++;
      if (c) out += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
      x += w;
    }
    return svgCache[name] = out;
  }

  let seq = 0;
  // Inline animated icon. Each one gets a different phase so rows of icons don't move in lockstep.
  window.pi = (name, cls = '') => {
    const anim = ICONS[name]?.[0] || 'bob';
    const delay = -((seq++ * 0.37) % 2.4).toFixed(2);
    return `<svg class="pi pa-${anim} ${cls}" style="animation-delay:${delay}s" viewBox="-1 -1 18 18" shape-rendering="crispEdges" aria-hidden="true">${svgBody(name)}</svg>`;
  };
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  window.pit = text => esc(text).replace(/:([a-z]+):/g, (m, n) => ICONS[n] ? window.pi(n) : m);

  window.pixelSprite = (name, withOutline = false) => {
    const px = grid(name, withOutline, true); if (!px) return null;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (px[y][x]) { g.fillStyle = px[y][x]; g.fillRect(x, y, 1, 1); }
    return cv;
  };

  const swap = root => (root || document).querySelectorAll('[data-pi]').forEach(e => { e.outerHTML = window.pi(e.dataset.pi, e.className); });
  window.pixelIconsIn = swap;
  swap(); // icons.js loads at the end of <body>, so the page is already parsed
  document.addEventListener("DOMContentLoaded", () => swap());
})();
