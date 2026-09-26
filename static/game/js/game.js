/* Backend City — the game.
 *
 * Reads the Django payload (#city-data), the world layout (window.CITY_MAP)
 * and the props atlas (window.CITY_ATLAS). The static world — terrain,
 * buildings, trees, props — is baked once into a single texture (three frames
 * for the sea shimmer), so a phone only draws a handful of sprites per frame.
 * KAPLAY renders; movement, collisions and input are handled here against a
 * tile grid. Info panels are plain HTML filled with textContent.
 */
(function () {
    'use strict';

    var MAP = window.CITY_MAP;
    var ATLAS = window.CITY_ATLAS;
    var DATA = JSON.parse(document.getElementById('city-data').textContent);
    var T = MAP.tile, W = MAP.W, H = MAP.H;
    var canvas = document.getElementById('city-canvas');
    var OUTLINE = '#3f2631';
    var STILL = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var DISTRICT_NAMES = { backend: 'Backend', devops: 'DevOps', network: 'Network' };

    function $(selector) { return document.querySelector(selector); }

    /* ------------------------------------------------------------------ */
    /* Tiles (Kenney Tiny Town cell numbers)                               */
    /* ------------------------------------------------------------------ */
    var TILE = {
        grass: 0, tuft: 1, flowers: 2, stones: 43,
        small: [28, 28, 27, 5],            // one-tile trees and a bush
        tall: [[4, 16], [4, 16], [3, 15]], // two-tile trees: canopy, trunk
        fence: [80, 81, 82],
    };
    var DIRT = { tl: 12, t: 13, tr: 14, l: 24, c: 25, r: 26, bl: 36, b: 37, br: 38 };
    var FOREST = { tl: 6, t: 7, tr: 8, l: 18, c: 19, r: 20, bl: 30, b: 31, br: 32 };
    var STYLES = {
        red: { roof: [52, 53, 54, 64, 65, 66], peak: 67, wall: [76, 77, 79], door: 89, window: 88, dormer: 55 },
        grey: { roof: [48, 49, 50, 60, 61, 62], peak: 63, wall: [72, 73, 75], door: 86, window: 84, dormer: 51 },
        redwood: { roof: [52, 53, 54, 64, 65, 66], peak: null, wall: [72, 73, 75], door: 86, window: 84, dormer: 55 },
        greystone: { roof: [48, 49, 50, 60, 61, 62], peak: null, wall: [76, 77, 79], door: 89, window: 88, dormer: 51 },
    };
    var GATE = [
        [null, 102, null, null, 102, null],
        [96, 126, 99, 101, 126, 98],
        [120, 126, 111, 112, 126, 122],
        [126, 126, 123, 124, 126, 126],
    ];

    /* ------------------------------------------------------------------ */
    /* 3x5 pixel font for the signs                                        */
    /* ------------------------------------------------------------------ */
    var GLYPHS = {
        A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7],
        F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2],
        K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7], M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2],
        P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
        U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5], Y: [5, 5, 2, 2, 2],
        Z: [7, 1, 2, 4, 7],
        0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [6, 1, 2, 4, 7], 3: [6, 1, 2, 1, 6], 4: [5, 5, 7, 1, 1],
        5: [7, 4, 6, 1, 6], 6: [3, 4, 6, 5, 2], 7: [7, 1, 2, 2, 2], 8: [2, 5, 2, 5, 2], 9: [2, 5, 3, 1, 6],
        ' ': [0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 2], ',': [0, 0, 0, 2, 4], '-': [0, 0, 7, 0, 0],
        '_': [0, 0, 0, 0, 7], '/': [1, 1, 2, 4, 4], ':': [0, 2, 0, 2, 0], '!': [2, 2, 2, 0, 2],
        '?': [6, 1, 2, 0, 2], "'": [2, 2, 0, 0, 0], '&': [2, 5, 2, 5, 3], '+': [0, 2, 7, 2, 0],
        '#': [5, 7, 5, 7, 5], '(': [1, 2, 2, 2, 1], ')': [4, 2, 2, 2, 4], '*': [0, 5, 2, 5, 0],
        '=': [0, 7, 0, 7, 0], '<': [1, 2, 4, 2, 1], '>': [4, 2, 1, 2, 4], '|': [2, 2, 2, 2, 2],
    };
    var LABEL_CHARS = 14;

    function signText(text) {
        var clean = String(text || '').toUpperCase().split('').filter(function (ch) {
            return Object.prototype.hasOwnProperty.call(GLYPHS, ch);
        }).join('').replace(/\s+/g, ' ').trim();
        return clean || 'PROJECT';
    }

    function wrapSign(text) {
        var words = signText(text).split(' '), lines = [''];
        words.forEach(function (word) {
            var line = lines[lines.length - 1];
            if (!line) lines[lines.length - 1] = word;
            else if (line.length + 1 + word.length <= LABEL_CHARS) lines[lines.length - 1] = line + ' ' + word;
            else lines.push(word);
        });
        lines = lines.map(function (l) { return l.length > LABEL_CHARS ? l.slice(0, LABEL_CHARS - 2) + '..' : l; });
        if (lines.length > 2) lines = [lines[0], lines[1].slice(0, LABEL_CHARS - 2) + '..'];
        return lines;
    }

    function textWidth(line) { return line.length * 4 - 1; }

    function drawText(g, line, x, y, colour) {
        g.fillStyle = colour;
        for (var i = 0; i < line.length; i++) {
            var rows = GLYPHS[line[i]];
            for (var r = 0; r < 5; r++) {
                for (var c = 0; c < 3; c++) {
                    if (rows[r] & (4 >> c)) g.fillRect(x + i * 4 + c, y + r, 1, 1);
                }
            }
        }
    }

    function drawPlaque(g, lines, cx, bottom, colour) {
        var w = Math.max.apply(null, lines.map(textWidth)) + 4;
        var h = lines.length * 6 + 3;
        var x = Math.round(cx - w / 2), y = bottom - h;
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.fillRect(x + 1, y + 1, w, h);
        g.fillStyle = OUTLINE;
        g.fillRect(x, y, w, h);
        lines.forEach(function (line, i) {
            drawText(g, line, x + Math.round((w - textWidth(line)) / 2), y + 2 + i * 6, colour);
        });
    }

    /* ------------------------------------------------------------------ */
    /* World layout: which cell is what                                   */
    /* ------------------------------------------------------------------ */
    function mulberry32(seed) {
        return function () {
            seed |= 0;
            seed = (seed + 0x6D2B79F5) | 0;
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function lotStudy(ref) {
        var district = DATA.districts[ref[0]];
        return district ? district.lots[ref[1]] : null;
    }

    function buildWorld() {
        var N = W * H;
        var solid = new Uint8Array(N), reserved = new Uint8Array(N), road = new Uint8Array(N);
        var stones = new Uint8Array(N), base = new Uint8Array(N), forest = new Uint8Array(N);
        var world = {
            solid: solid, road: road, stones: stones, base: base, forest: forest,
            tiles: [],          // extra Tiny Town tiles: {t, x, y}
            sprites: [],        // baked props: {name, frame, px, py}
            animated: [],       // live KAPLAY props
            labels: [],         // {lines, cx, bottom, colour}
            boarded: [],        // empty-lot doors: {x, y}
            interactables: [],
            npcs: [],
        };

        function inside(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
        function fill(arr, x, y, w, h, v) {
            for (var j = y; j < y + h; j++) {
                for (var i = x; i < x + w; i++) if (inside(i, j)) arr[j * W + i] = v === undefined ? 1 : v;
            }
        }
        function block(x, y, w, h) { fill(solid, x, y, w, h); fill(reserved, x - 1, y - 1, w + 2, h + 2); }
        function interact(kind, ref, hot, bubble) {
            world.interactables.push({ kind: kind, ref: ref, hot: hot, bubble: bubble });
        }

        // Sea and shore are not walkable; docks are.
        for (var y = 0; y < H; y++) {
            for (var x = MAP.seaX - 1; x < W; x++) { solid[y * W + x] = 1; reserved[y * W + x] = 1; }
        }
        MAP.docks.forEach(function (d) { fill(solid, d[0], d[1], d[2], 2, 0); });

        MAP.roads.forEach(function (r) { fill(road, r[0], r[1], r[2], r[3]); fill(reserved, r[0], r[1], r[2], r[3]); });
        MAP.stones.forEach(function (r) { fill(stones, r[0], r[1], r[2], r[3]); fill(reserved, r[0], r[1], r[2], r[3]); });

        MAP.fences.forEach(function (f) {
            for (var i = 0; i < f[2]; i++) {
                var t = i === 0 ? TILE.fence[0] : i === f[2] - 1 ? TILE.fence[2] : TILE.fence[1];
                world.tiles.push({ t: t, x: f[0] + i, y: f[1] });
            }
            block(f[0], f[1], f[2], 1);
        });

        MAP.buildings.forEach(function (b) { placeBuilding(b); });

        function placeBuilding(b) {
            var w = b.w || 3, h = b.h || (b.board ? 2 : 3);
            if (b.board) {
                var extra = (DATA.districts[b.board] || {}).overflow || [];
                if (!extra.length) return;
                world.sprites.push({ name: 'board', frame: 0, px: b.x * T, py: (b.y + 2) * T - ATLAS.board.h });
                world.labels.push({ lines: ['+' + extra.length + ' MORE'], cx: (b.x + 1) * T, bottom: b.y * T + 4, colour: '#fdbe53' });
                interact('board', b.board, [(b.x + 1) * T, (b.y + 2) * T + 5], [(b.x + 1) * T, b.y * T + 6]);
                block(b.x, b.y, 2, 2);
                return;
            }
            block(b.x, b.y, w, h);
            var study = b.lot ? lotStudy(b.lot) : null;
            var door = b.door != null ? b.door : Math.floor((w - 1) / 2);
            var hot, bubble;

            if (b.gate) {
                GATE.forEach(function (row, j) {
                    row.forEach(function (t, i) { if (t != null) world.tiles.push({ t: t, x: b.x + i, y: b.y + j }); });
                });
                hot = [(b.x + w / 2) * T, b.y * T];
                bubble = [(b.x + w / 2) * T, (b.y + 1) * T + 10];
            } else if (b.sprite) {
                var a = ATLAS[b.sprite];
                var px = b.x * T + (w * T - a.w) / 2, py = (b.y + h) * T - a.h;
                if (b.sprite === 'antenna') {
                    world.animated.push({ name: 'antenna', px: px, py: py, z: (b.y + h) * T, blink: !!study, phase: b.x * 0.37 });
                    bubble = [px + 8, (b.y + 1) * T + 8];
                } else {
                    world.sprites.push({ name: b.sprite, frame: 0, px: px, py: py });
                    bubble = [px + a.w / 2, py + 2];
                }
                hot = [(b.x + w / 2) * T, (b.y + h) * T + 5];
            } else {
                placeHouse(b, w, door, !b.lot || study);
                hot = [(b.x + door) * T + 8, (b.y + h) * T + 5];
                bubble = [(b.x + door) * T + 8, (b.y + h - 1) * T + 2];
            }

            var sign = null;
            if (b.lot) {
                interact('lot', b.lot, hot, bubble);
                sign = study
                    ? { lines: wrapSign(study.title), colour: '#fdf3e3' }
                    : { lines: ['COMING SOON'], colour: '#8b9bb4' };
            } else if (b.skill) {
                interact('skill', b.skill, hot, bubble);
                sign = { lines: wrapSign(b.label || (DATA.skills[b.skill] || {}).title), colour: '#fdbe53' };
            }
            if (sign && !b.noLabel) {
                sign.cx = (b.x + w / 2) * T;
                sign.bottom = b.y * T - 1;
                world.labels.push(sign);
            }
        }

        function placeHouse(b, w, door, open) {
            var s = STYLES[b.style];
            var logoCol = b.logo ? (door === 1 ? 2 : 1) : -1;
            for (var i = 0; i < w; i++) {
                var edge = i === 0 ? 0 : i === w - 1 ? 2 : 1;
                var roofTop = s.roof[edge];
                if (w >= 5 && i === (door >= 2 ? 1 : w - 2) && !b.logo) roofTop = s.dormer;
                world.tiles.push({ t: roofTop, x: b.x + i, y: b.y });
                world.tiles.push({ t: i === door && s.peak ? s.peak : s.roof[3 + edge], x: b.x + i, y: b.y + 1 });
                var wall = s.wall[edge];
                if (i === door) wall = s.door;
                else if (edge === 1) wall = s.window;
                world.tiles.push({ t: wall, x: b.x + i, y: b.y + 2 });
            }
            if (!open) world.boarded.push({ x: b.x + door, y: b.y + 2 });
            if (b.logo) world.sprites.push({ name: b.logo, frame: 0, px: (b.x + logoCol) * T, py: b.y * T - 3 });
        }

        MAP.props.forEach(function (p) {
            var px = Math.round(p.x * T), py = Math.round(p.y * T);
            if (p.tile != null) world.tiles.push({ t: p.tile, x: p.x, y: p.y });
            else if (p.fps || p.bob) world.animated.push({ name: p.sprite, px: px, py: py, fps: p.fps, bob: p.bob, z: py + ATLAS[p.sprite].h });
            else world.sprites.push({ name: p.sprite, frame: 0, px: px, py: py });
            if (p.solid) block(Math.floor(p.x), Math.floor(p.y), p.w || 1, p.h || 1);
            if (p.smoke) world.smoke = [px + 8, py + 3];
        });

        MAP.containers.forEach(function (c) {
            for (var i = 0; i < c[3]; i++) world.sprites.push({ name: 'container', frame: c[2], px: c[0] * T, py: c[1] * T - i * 12 });
            var rise = Math.ceil(12 * (c[3] - 1) / T);
            block(c[0], c[1] - rise, 2, rise + 1);
        });

        var belt = MAP.conveyor;
        for (var i = 0; i < belt.length; i++) world.animated.push({ name: 'conveyor', px: (belt.x + i) * T, py: belt.y * T, fps: 8, z: (belt.y + 1) * T });
        block(belt.x, belt.y, belt.length, 1);
        interact('skill', belt.skill, [(belt.x + belt.length / 2) * T, belt.y * T - 4], [(belt.x + belt.length / 2) * T, belt.y * T + 4]);

        var ship = MAP.ship;
        interact('skill', ship.skill, [ship.hotspot[0] * T, ship.hotspot[1] * T], [ship.hotspot[0] * T + 16, ship.hotspot[1] * T - 34]);

        MAP.npcs.forEach(function (n) {
            block(n.x, n.y, 1, 1);
            world.npcs.push(n);
            interact('npc', n.key, [n.x * T + 8, n.y * T + 10], [n.x * T + 8, n.y * T - 3]);
        });

        Object.keys(MAP.spawns).forEach(function (key) {
            var s = MAP.spawns[key];
            fill(reserved, Math.floor(s[0]) - 1, Math.floor(s[1]) - 1, 3, 3);
        });

        // Grass variety, then trees: the outer ring is forest, plus the forest areas.
        var rand = mulberry32(MAP.seed);
        for (var c = 0; c < N; c++) {
            var r = rand();
            base[c] = r < 0.05 ? TILE.flowers : r < 0.17 ? TILE.tuft : TILE.grass;
        }
        var treeRand = mulberry32(MAP.seed + 1);
        function nearRoad(x, y) {
            for (var j = -1; j <= 1; j++) {
                for (var i = -1; i <= 1; i++) {
                    if (inside(x + i, y + j) && (road[(y + j) * W + x + i] || stones[(y + j) * W + x + i])) return true;
                }
            }
            return false;
        }
        function pick(list) { return list[Math.floor(treeRand() * list.length)]; }
        function tree(x, y) {
            var above = (y - 1) * W + x;
            if (treeRand() < 0.4 && y > 0 && !reserved[above] && !nearRoad(x, y - 1)) {
                var tall = pick(TILE.tall);
                world.tiles.push({ t: tall[0], x: x, y: y - 1 }, { t: tall[1], x: x, y: y });
                solid[above] = 1;
                reserved[above] = 1;
            } else {
                world.tiles.push({ t: pick(TILE.small), x: x, y: y });
            }
            solid[y * W + x] = 1;
            reserved[y * W + x] = 1;
        }
        // The outer ring is dense forest (autotiled when baking).
        for (y = 0; y < H; y++) {
            for (x = 0; x < MAP.seaX - 1; x++) {
                var i = y * W + x;
                if ((x < 2 || y < 2 || y >= H - 2) && !reserved[i]) { forest[i] = 1; solid[i] = 1; reserved[i] = 1; }
            }
        }
        MAP.forests.forEach(function (f) {
            for (var j = f[1]; j < f[1] + f[3]; j++) {
                for (var i = f[0]; i < f[0] + f[2]; i++) {
                    var roll = treeRand();
                    if (inside(i, j) && !reserved[j * W + i] && !nearRoad(i, j) && roll < f[4]) tree(i, j);
                }
            }
        });
        return world;
    }

    /* ------------------------------------------------------------------ */
    /* Baking the static world into canvases                               */
    /* ------------------------------------------------------------------ */
    // Frame 0 is drawn in full. The other sea-shimmer frames (pass `base`) copy it
    // and repaint only the sea plus whatever sits on top of it.
    function bake(world, img, frame, base) {
        var c = document.createElement('canvas');
        c.width = W * T;
        c.height = H * T;
        var g = c.getContext('2d');
        g.imageSmoothingEnabled = false;

        function tile(t, x, y) {
            g.drawImage(img.tiles, (t % 12) * T, Math.floor(t / 12) * T, T, T, x * T, y * T, T, T);
        }
        function prop(name, f, px, py) {
            var a = ATLAS[name];
            g.drawImage(img.props, a.x + f * a.w, a.y, a.w, a.h, Math.round(px), Math.round(py), a.w, a.h);
        }
        function isRoad(x, y) {
            if (x < 0 || y < 0 || x >= W || y >= H) return true;   // roads run off the map
            return world.road[y * W + x] === 1;
        }
        function isForest(x, y) {
            if (x < 0 || y < 0 || x >= W || y >= H) return true;   // so does the forest
            return world.forest[y * W + x] === 1;
        }
        // 9-slice autotile: pick the edge/corner piece from the four neighbours.
        function autotile(set, same, x, y) {
            var up = same(x, y - 1), down = same(x, y + 1), left = same(x - 1, y), right = same(x + 1, y);
            return !up ? (!left ? set.tl : !right ? set.tr : set.t)
                : !down ? (!left ? set.bl : !right ? set.br : set.b)
                    : !left ? set.l : !right ? set.r : set.c;
        }

        function sea() {
            for (var y = 0; y < H; y++) {
                prop('shore', frame, (MAP.seaX - 1) * T, y * T);
                for (var x = MAP.seaX; x < W; x++) prop('water', frame, x * T, y * T);
            }
        }
        function docks() {
            MAP.docks.forEach(function (d) {
                for (var i = 0; i < d[2]; i++) {
                    prop('dock', 0, (d[0] + i) * T, d[1] * T);
                    prop('dock', 1, (d[0] + i) * T, (d[1] + 1) * T);
                }
                g.fillStyle = 'rgba(38,43,68,.25)';
                g.fillRect(d[0] * T + 6, (d[1] + 2) * T, d[2] * T - 6, 3);
                g.fillStyle = OUTLINE;
                g.fillRect((d[0] + d[2]) * T - 1, d[1] * T, 1, 2 * T);
            });
        }

        if (base) {
            var shoreX = (MAP.seaX - 1) * T;
            g.drawImage(base, 0, 0);
            sea();
            docks();
            world.tiles.forEach(function (t) { if ((t.x + 1) * T > shoreX) tile(t.t, t.x, t.y); });
            world.sprites.forEach(function (s) {
                if (s.px + ATLAS[s.name].w > shoreX) prop(s.name, s.frame, s.px, s.py);
            });
            return c;
        }

        for (var y = 0; y < H; y++) {
            for (var x = 0; x < MAP.seaX - 1; x++) {
                var i = y * W + x;
                if (world.stones[i]) tile(TILE.stones, x, y);
                else if (world.road[i]) tile(autotile(DIRT, isRoad, x, y), x, y);
                else {
                    tile(world.base[i], x, y);
                    if (world.forest[i]) tile(autotile(FOREST, isForest, x, y), x, y);
                }
            }
        }
        sea();
        docks();

        world.tiles.forEach(function (t) { tile(t.t, t.x, t.y); });

        world.boarded.forEach(function (d) {   // empty lot: planks over the door
            var px = d.x * T, py = d.y * T;
            [[4, 9], [9, 14]].forEach(function (p) {
                g.fillStyle = OUTLINE;
                g.fillRect(px + 2, py + p[0] - 1, 12, 4);
                g.fillStyle = '#bd6c4a';
                g.fillRect(px + 3, py + p[0], 10, 2);
            });
        });

        world.sprites.forEach(function (s) { prop(s.name, s.frame, s.px, s.py); });

        g.fillStyle = OUTLINE;
        MAP.cables.forEach(function (chain) {
            for (var i = 0; i + 1 < chain.length; i++) {
                var x0 = chain[i][0] * T, y0 = chain[i][1] * T, x1 = chain[i + 1][0] * T, y1 = chain[i + 1][1] * T;
                var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
                for (var k = 0; k <= n; k++) {
                    var s = k / n;
                    g.fillRect(Math.round(x0 + (x1 - x0) * s), Math.round(y0 + (y1 - y0) * s + 6 * 4 * s * (1 - s)), 1, 1);
                }
            }
        });
        return c;
    }

    function bakeLabels(world) {
        var c = document.createElement('canvas');
        c.width = W * T;
        c.height = H * T;
        var g = c.getContext('2d');
        world.labels.forEach(function (l) { drawPlaque(g, l.lines, l.cx, l.bottom, l.colour); });
        return c;
    }

    /* ------------------------------------------------------------------ */
    /* HTML panels                                                         */
    /* ------------------------------------------------------------------ */
    var scrim = $('[data-panel-scrim]'), panel = $('[data-panel]'), panelBody = $('[data-panel-body]');
    var state = {
        started: false, panel: false, dialogue: null, near: null, zone: null,
        touch: !!(window.matchMedia && window.matchMedia('(pointer: coarse), (hover: none)').matches),
    };
    panel.tabIndex = -1;

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (key) {
            if (key === 'text') node.textContent = attrs[key];
            else if (key === 'class') node.className = attrs[key];
            else node.setAttribute(key, attrs[key]);
        });
        (children || []).forEach(function (child) { if (child) node.appendChild(child); });
        return node;
    }

    function safeUrl(url) {
        return typeof url === 'string' && /^(https?:\/\/|mailto:|\/(?!\/))/i.test(url) ? url : null;
    }

    function linkButton(url, text, quiet) {
        url = safeUrl(url);
        if (!url) return null;
        var external = /^https?:/i.test(url);
        var a = el('a', { class: 'panel-btn' + (quiet ? ' is-quiet' : ''), href: url, text: text });
        if (external) { a.target = '_blank'; a.rel = 'noopener'; }
        return a;
    }

    function listUrl(district) { return (DATA.roleUrls[district] || DATA.roleUrls.backend) + '#projects'; }

    function openPanel(nodes, dialogue) {
        panelBody.textContent = '';
        nodes.forEach(function (n) { if (n) panelBody.appendChild(n); });
        scrim.classList.toggle('is-dialogue', !!dialogue);
        panel.classList.toggle('is-dialogue', !!dialogue);
        panel.setAttribute('aria-labelledby', dialogue ? 'dialogue-line' : 'panel-title');
        scrim.hidden = false;
        state.panel = true;
        releaseKeys();
        panel.focus({ preventScroll: true });   // Tab reaches the links; E / Esc close
    }

    function closePanel() {
        scrim.hidden = true;
        state.panel = false;
        state.dialogue = null;
        releaseKeys();
        canvas.focus({ preventScroll: true });
    }

    function projectPanel(study, district) {
        var cover = (study.images || [])[0];
        openPanel([
            el('p', { class: 'panel-eyebrow', text: study.category || DISTRICT_NAMES[district] }),
            el('h2', { id: 'panel-title', text: study.title }),
            study.tagline ? el('p', { text: study.tagline }) : null,
            safeUrl(cover) ? el('img', { class: 'panel-cover', src: cover, alt: study.title, loading: 'lazy' }) : null,
            study.description ? el('p', { text: study.description }) : null,
            (study.techStack || []).length ? el('ul', { class: 'panel-tags' }, study.techStack.map(function (t) {
                return el('li', { text: t });
            })) : null,
            (study.features || []).length ? el('ul', { class: 'panel-list' }, study.features.slice(0, 5).map(function (f) {
                return el('li', { text: f });
            })) : null,
            el('div', { class: 'panel-actions' }, [
                linkButton(study.githubUrl, 'Source code ↗'),
                linkButton(study.liveUrl, 'Live demo ↗'),
                linkButton(listUrl(district), 'All ' + DISTRICT_NAMES[district] + ' projects', true),
            ]),
        ]);
    }

    function soonPanel(district) {
        openPanel([
            el('p', { class: 'panel-eyebrow', text: DISTRICT_NAMES[district] + ' district' }),
            el('h2', { id: 'panel-title', text: 'Coming soon' }),
            el('p', { text: 'This lot is saved for the next ' + DISTRICT_NAMES[district] + ' project. The builders are on their lunch break.' }),
            el('div', { class: 'panel-actions' }, [linkButton(listUrl(district), 'See all projects', true)]),
        ]);
    }

    function skillPanel(key) {
        var skill = DATA.skills[key];
        if (!skill) return;
        openPanel([
            el('p', { class: 'panel-eyebrow', text: skill.link ? 'Landmark' : 'Skill' }),
            el('h2', { id: 'panel-title', text: skill.title }),
            el('p', { text: skill.text }),
            skill.link ? el('div', { class: 'panel-actions' }, [linkButton(DATA.links[skill.link], skill.cta || 'Open')]) : null,
        ]);
    }

    function boardPanel(district) {
        var extra = DATA.districts[district].overflow;
        openPanel([
            el('p', { class: 'panel-eyebrow', text: 'Notice board' }),
            el('h2', { id: 'panel-title', text: 'More ' + DISTRICT_NAMES[district] + ' projects' }),
            el('ul', { class: 'panel-list' }, extra.map(function (study) {
                var button = el('button', { type: 'button', text: study.title });
                button.addEventListener('click', function () { projectPanel(study, district); });
                return el('li', {}, [button]);
            })),
            el('div', { class: 'panel-actions' }, [linkButton(listUrl(district), 'Open the list view', true)]),
        ]);
    }

    function showDialogue() {
        var d = state.dialogue, npc = DATA.npcs[d.key];
        var last = d.line >= npc.lines.length - 1;
        var nodes = [
            el('p', { class: 'dialogue-name', text: npc.name }),
            el('p', { id: 'dialogue-line', text: npc.lines[d.line] }),
        ];
        if (last && npc.resume) {
            var stay = el('button', { type: 'button', class: 'panel-btn is-quiet', text: 'Keep exploring' });
            stay.addEventListener('click', closePanel);
            nodes.push(el('div', { class: 'panel-actions' }, [linkButton(DATA.resumeUrl, 'Open the resume'), stay]));
        } else {
            nodes.push(el('span', { class: 'dialogue-next', 'aria-hidden': 'true', text: last ? '■' : '▼' }));
        }
        openPanel(nodes, true);
    }

    function advanceDialogue() {
        var d = state.dialogue, npc = DATA.npcs[d.key];
        if (d.line >= npc.lines.length - 1) {
            if (!npc.resume) closePanel();
            return;
        }
        d.line += 1;
        showDialogue();
    }

    function openInteractable(it) {
        if (it.kind === 'lot') {
            var study = lotStudy(it.ref);
            if (study) projectPanel(study, it.ref[0]);
            else soonPanel(it.ref[0]);
        } else if (it.kind === 'skill') skillPanel(it.ref);
        else if (it.kind === 'board') boardPanel(it.ref);
        else if (it.kind === 'npc' && DATA.npcs[it.ref]) {
            state.dialogue = { key: it.ref, line: 0 };
            showDialogue();
        }
    }

    panel.querySelector('[data-panel-close]').addEventListener('click', closePanel);
    scrim.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        if (state.dialogue) advanceDialogue();
        else if (!panel.contains(e.target)) closePanel();
    });

    /* ------------------------------------------------------------------ */
    /* Input: keyboard (physical keys, so any layout works) and touch      */
    /* ------------------------------------------------------------------ */
    var keys = {};
    var touchDir = { x: 0, y: 0 };
    var MOVE_KEYS = {
        ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
        ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
    };
    var zoomLevels = [2, 3, 4];
    var zoomIndex = window.innerWidth < 700 ? 0 : 1;

    function releaseKeys() {
        keys = {};
        touchDir = { x: 0, y: 0 };
        document.querySelectorAll('.dpad-btn.is-down').forEach(function (b) { b.classList.remove('is-down'); });
    }

    function onControl(e) { return e.target.closest && e.target.closest('a, button, input, textarea, select'); }

    window.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (state.touch) setTouch(false);
        if (!state.started) {
            if (e.code === 'KeyE') { e.preventDefault(); startGame(); }
            return;
        }
        if (state.panel) {
            if (e.code === 'Escape') { e.preventDefault(); closePanel(); return; }
            var act = e.code === 'KeyE' || ((e.code === 'Enter' || e.code === 'Space') && !onControl(e));
            if (act) {
                e.preventDefault();
                if (state.dialogue) advanceDialogue();
                else if (e.code === 'KeyE') closePanel();
            }
            return;
        }
        if (MOVE_KEYS[e.code]) {
            keys[e.code] = true;
            if (e.code.indexOf('Arrow') === 0) e.preventDefault();
            return;
        }
        if (e.code === 'KeyE' || ((e.code === 'Enter' || e.code === 'Space') && !onControl(e))) {
            e.preventDefault();
            if (!e.repeat) interact();
        } else if (e.code === 'Equal' || e.code === 'NumpadAdd') zoom(1);
        else if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoom(-1);
    });
    window.addEventListener('keyup', function (e) { delete keys[e.code]; });
    window.addEventListener('blur', releaseKeys);
    document.addEventListener('visibilitychange', releaseKeys);

    function setTouch(on) {
        state.touch = on;
        document.body.classList.toggle('touch', on);
    }

    var dpad = $('.dpad');
    function dpadMove(e) {
        var box = dpad.getBoundingClientRect();
        var dx = e.clientX - (box.left + box.width / 2), dy = e.clientY - (box.top + box.height / 2);
        var dist = Math.sqrt(dx * dx + dy * dy);
        touchDir = { x: 0, y: 0 };
        if (dist > 12) {
            var angle = Math.atan2(dy, dx), sector = Math.round(angle / (Math.PI / 4));   // 8 directions
            var dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
            var d = dirs[(sector + 8) % 8];
            touchDir = { x: d[0], y: d[1] };
        }
        dpad.querySelectorAll('.dpad-btn').forEach(function (b) {
            var dir = b.dataset.dir;
            var on = (dir === 'left' && touchDir.x < 0) || (dir === 'right' && touchDir.x > 0)
                || (dir === 'up' && touchDir.y < 0) || (dir === 'down' && touchDir.y > 0);
            b.classList.toggle('is-down', on);
        });
    }
    dpad.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        setTouch(true);
        dpad.setPointerCapture(e.pointerId);
        dpadMove(e);
    });
    dpad.addEventListener('pointermove', function (e) { if (dpad.hasPointerCapture(e.pointerId)) dpadMove(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
        dpad.addEventListener(type, releaseKeys);
    });
    dpad.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var actionBtn = $('[data-action]');
    actionBtn.addEventListener('pointerdown', function () { setTouch(true); });
    actionBtn.addEventListener('click', function () {
        if (!state.started) startGame();
        else if (state.dialogue) advanceDialogue();
        else if (!state.panel) interact();
    });
    canvas.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') setTouch(true); });

    document.querySelectorAll('[data-zoom]').forEach(function (b) {
        b.addEventListener('click', function () {
            zoom(Number(b.dataset.zoom));
            b.blur();   // so the next Space / Enter talks to the game, not this button
        });
    });
    function zoom(step) { zoomIndex = Math.max(0, Math.min(zoomLevels.length - 1, zoomIndex + step)); }

    /* ------------------------------------------------------------------ */
    /* Welcome, zones, errors                                              */
    /* ------------------------------------------------------------------ */
    var welcome = $('[data-welcome]');
    var WELCOMED = 'city-welcomed';

    function startGame() {
        welcome.hidden = true;
        state.started = true;
        try { sessionStorage.setItem(WELCOMED, '1'); } catch (e) { /* private mode */ }
        canvas.focus({ preventScroll: true });
    }
    $('[data-start]').addEventListener('click', startGame);

    var zoneLabel = $('[data-zone-label]'), listLink = $('[data-list-view]'), zoneTimer = null;
    function enterZone(zone) {
        state.zone = zone.key;
        zoneLabel.textContent = zone.label;
        zoneLabel.classList.add('is-shown');
        clearTimeout(zoneTimer);
        zoneTimer = setTimeout(function () { zoneLabel.classList.remove('is-shown'); }, 2600);
        listLink.href = listUrl(zone.list);
    }
    function zoneAt(tx, ty) {
        for (var i = 0; i < MAP.zones.length; i++) {
            var r = MAP.zones[i].rect;
            if (tx >= r[0] && tx < r[0] + r[2] && ty >= r[1] && ty < r[1] + r[3]) return MAP.zones[i];
        }
        return MAP.zones[MAP.zones.length - 1];
    }

    function fail(err) {
        if (window.console) console.error(err);
        welcome.hidden = true;
        $('[data-error]').hidden = false;
    }

    function webglAvailable() {
        try {
            var test = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (test.getContext('webgl') || test.getContext('experimental-webgl')));
        } catch (e) { return false; }
    }

    /* ------------------------------------------------------------------ */
    /* The game loop                                                       */
    /* ------------------------------------------------------------------ */
    var SPEED = 72;              // px per second
    var FOOT = 4;                // half width of the feet box
    var player = { x: 0, y: 0, flip: false, walking: false };
    var world = null;

    function blocked(x, y) {
        var x0 = Math.floor((x - FOOT) / T), x1 = Math.floor((x + FOOT - 0.01) / T);
        var y0 = Math.floor((y - FOOT) / T), y1 = Math.floor((y - 0.01) / T);
        for (var j = y0; j <= y1; j++) {
            for (var i = x0; i <= x1; i++) {
                if (i < 0 || j < 0 || i >= W || j >= H || world.solid[j * W + i]) return true;
            }
        }
        return false;
    }

    function inputVector() {
        var x = touchDir.x, y = touchDir.y;
        Object.keys(keys).forEach(function (code) {
            var d = MOVE_KEYS[code];
            if (d) { x += d[0]; y += d[1]; }
        });
        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
        return { x: x, y: y };
    }

    function step(dt) {
        var v = inputVector();
        player.walking = !!(v.x || v.y);
        if (!player.walking) return;
        if (v.x) player.flip = v.x < 0;
        var dist = SPEED * dt;
        moveAxis(v.x * dist, 0, v.y === 0);
        moveAxis(0, v.y * dist, v.x === 0);
    }

    // Move along one axis; when a corner blocks straight movement, slide around it.
    function moveAxis(dx, dy, assist) {
        if (!dx && !dy) return;
        var nx = player.x + dx, ny = player.y + dy;
        if (!blocked(nx, ny)) { player.x = nx; player.y = ny; return; }
        if (!assist) return;
        var amount = Math.abs(dx || dy);
        for (var d = 1; d <= 7; d++) {
            for (var side = -1; side <= 1; side += 2) {
                var ox = dy ? side * d : 0, oy = dx ? side * d : 0;
                if (!blocked(player.x + ox + dx, player.y + oy + dy) && !blocked(player.x + Math.sign(ox) * amount, player.y + Math.sign(oy) * amount)) {
                    player.x += Math.sign(ox) * amount;
                    player.y += Math.sign(oy) * amount;
                    return;
                }
            }
        }
    }

    function nearestInteractable() {
        var best = null, bestDist = 22;
        world.interactables.forEach(function (it) {
            var dx = it.hot[0] - player.x, dy = it.hot[1] - player.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestDist) { best = it; bestDist = d; }
        });
        return best;
    }

    function interact() {
        if (state.near && !state.panel) openInteractable(state.near);
    }

    function findSpawn(key) {
        var s = MAP.spawns[key] || MAP.spawns.gate;
        var x = s[0] * T, y = s[1] * T;
        for (var r = 0; r < 64 && blocked(x, y); r += 2) {    // safety: nudge off a solid tile
            if (!blocked(x + r, y)) { x += r; break; }
            if (!blocked(x - r, y)) { x -= r; break; }
            if (!blocked(x, y + r)) { y += r; break; }
        }
        return { x: x, y: y };
    }

    function run(img) {
        world = buildWorld();
        var first = bake(world, img, 0);
        var frames = [first, bake(world, img, 1, first), bake(world, img, 2, first)];
        var labels = bakeLabels(world);
        var dpr = Math.min(window.devicePixelRatio || 1, 3);

        var k = kaplay({
            canvas: canvas,
            global: false,
            crisp: true,
            background: [28, 26, 36],
            pixelDensity: dpr,
            debug: false,
            loadingScreen: false,
            focus: false,
            touchToMouse: false,
        });

        frames.forEach(function (c, i) { k.loadSprite('ground' + i, c); });
        k.loadSprite('labels', labels);
        var groundFrames = frames.length;
        first = frames = labels = null;   // KAPLAY has its own copies; don't pin ~12 MB of canvases
        k.loadSprite('chars', img.chars, { sliceX: img.chars.width / T });
        var atlas = {};
        Object.keys(ATLAS).forEach(function (name) {
            var a = ATLAS[name];
            atlas[name] = { x: a.x, y: a.y, width: a.w * a.frames, height: a.h, sliceX: a.frames };
        });
        k.loadSpriteAtlas(img.props, atlas);

        k.onLoad(function () {
            var ground = [];
            for (var i = 0; i < groundFrames; i++) {
                ground.push(k.add([k.sprite('ground' + i), k.pos(0, 0), k.z(0)]));
                ground[i].hidden = i > 0;
            }
            k.add([k.sprite('labels'), k.pos(0, 0), k.z(100000)]);

            var live = world.animated.map(function (a) {
                return { a: a, obj: k.add([k.sprite(a.name), k.pos(a.px, a.py), k.z(a.z)]) };
            });

            var npcs = world.npcs.map(function (n) {
                var fx = n.x * T + 8, fy = n.y * T + 14;
                k.add([k.sprite('shadow'), k.pos(fx, fy - 1), k.anchor('center'), k.z(fy - 1)]);
                return { n: n, x: fx, obj: k.add([k.sprite('chars', { frame: n.frame }), k.pos(fx, fy), k.anchor('bot'), k.z(fy)]) };
            });

            var spawn = findSpawn(DATA.spawn);
            player.x = spawn.x;
            player.y = spawn.y;
            var shadow = k.add([k.sprite('shadow'), k.pos(0, 0), k.anchor('center'), k.z(0)]);
            var hero = k.add([k.sprite('chars', { frame: 0 }), k.pos(0, 0), k.anchor('bot'), k.z(0)]);
            var bubble = k.add([k.sprite('bubble'), k.pos(0, 0), k.anchor('bot'), k.z(200000)]);
            bubble.hidden = true;

            var smoke = [], smokeClock = 0, time = 0;

            k.onUpdate(function () {
                var dt = Math.min(k.dt(), 0.05);
                time += dt;
                if (state.started && !state.panel) step(dt);

                // camera: follow, clamp to the world, snap to device pixels
                var scale = Math.round(zoomLevels[zoomIndex] * dpr) / dpr;
                var snap = scale * dpr;
                var halfW = k.width() / (2 * scale), halfH = k.height() / (2 * scale);
                var cx = W * T <= halfW * 2 ? W * T / 2 : Math.max(halfW, Math.min(W * T - halfW, player.x));
                var cy = H * T <= halfH * 2 ? H * T / 2 : Math.max(halfH, Math.min(H * T - halfH, player.y - 8));
                k.setCamScale(scale);
                k.setCamPos(Math.round(cx * snap) / snap, Math.round(cy * snap) / snap);

                var hop = player.walking && !STILL ? Math.floor(time * 8) % 2 : 0;
                var px = Math.round(player.x * snap) / snap, py = Math.round(player.y * snap) / snap;
                hero.pos.x = px;
                hero.pos.y = py - hop;
                hero.flipX = player.flip;
                hero.z = py;
                shadow.pos.x = px;
                shadow.pos.y = py - 1;
                shadow.z = py - 1;

                // ambient animation
                if (!STILL) {
                    var water = Math.floor(time * 2) % 3;
                    ground.forEach(function (g, i) { g.hidden = i !== water; });
                    live.forEach(function (l) {
                        var a = l.a;
                        if (a.name === 'antenna') l.obj.frame = a.blink && (time + a.phase) % 1.6 < 0.3 ? 1 : 0;
                        else if (a.fps) l.obj.frame = Math.floor(time * a.fps + (a.px % 7)) % ATLAS[a.name].frames;
                        if (a.bob) l.obj.pos.y = a.py + Math.round(Math.sin(time * 1.7));
                    });
                    if (world.smoke) {
                        smokeClock += dt;
                        if (smokeClock > 0.6) {
                            smokeClock = 0;
                            smoke.push(k.add([k.rect(3, 3), k.pos(world.smoke[0], world.smoke[1]), k.color(236, 236, 240), k.opacity(0.85), k.z(99999)]));
                        }
                        smoke = smoke.filter(function (s) {
                            s.pos.y -= 9 * dt;
                            s.pos.x += Math.sin(time * 2 + s.pos.y * 0.2) * 3 * dt;
                            s.opacity -= 0.35 * dt;
                            if (s.opacity > 0) return true;
                            s.destroy();
                            return false;
                        });
                    }
                }

                // townsfolk turn towards the player
                npcs.forEach(function (n) {
                    if (Math.abs(n.x - player.x) < 48) n.obj.flipX = player.x < n.x - 2;
                });

                // what can be used from here
                state.near = state.started && !state.panel ? nearestInteractable() : null;
                if (state.near) {
                    bubble.hidden = false;
                    bubble.frame = state.touch ? 1 : 0;
                    bubble.pos.x = state.near.bubble[0];
                    bubble.pos.y = state.near.bubble[1] - (STILL ? 0 : Math.round(Math.sin(time * 5)));
                } else bubble.hidden = true;

                var zone = zoneAt(Math.floor(player.x / T), Math.floor(player.y / T));
                if (zone.key !== state.zone) enterZone(zone);
            });

            // A small read-only handle for debugging from the console.
            window.BackendCity = {
                get player() { return { x: player.x, y: player.y }; },
                get zone() { return state.zone; },
                get near() { return state.near && { kind: state.near.kind, ref: state.near.ref }; },
                get started() { return state.started; },
            };
        });
    }

    function boot() {
        var skip = false;
        try { skip = sessionStorage.getItem(WELCOMED) === '1'; } catch (e) { /* private mode */ }
        if (skip) startGame();
        else if (!state.touch) $('[data-start]').focus({ preventScroll: true });

        if (typeof window.kaplay !== 'function' || !webglAvailable()) { fail(new Error('WebGL unavailable')); return; }
        function load(src) {
            return new Promise(function (resolve, reject) {
                var image = new Image();
                image.onload = function () { resolve(image); };
                image.onerror = function () { reject(new Error('Could not load ' + src)); };
                image.src = src;
            });
        }
        Promise.all([load(canvas.dataset.tiles), load(canvas.dataset.chars), load(canvas.dataset.props)])
            .then(function (images) {
                run({ tiles: images[0], chars: images[1], props: images[2] });
            })
            .catch(fail);
    }

    boot();
})();
