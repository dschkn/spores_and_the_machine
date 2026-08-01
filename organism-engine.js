autowatch = 1;
inlets = 1;
outlets = 3;

// Advanced organism simulation for Max 8 JavaScript.
// outlet 0: RGBA Jitter matrix
// outlet 1: "voice slot area energy speed roughness x y event"
// outlet 2: "stats generation organisms food births deaths"

var WIDTH = 160;
var HEIGHT = 90;
var MAX_ORGANISMS = 8;
var DEFAULT_COUNT = 6;
var MIN_AREA = 55;
var DIVIDE_AREA = 215;

var generation = 0;
var nextId = 1;
var totalBirths = 0;
var totalDeaths = 0;
var foodRate = 0.013;
var mutationAmount = 0.18;
var diffusion = 0.18;
var metabolism = 0.00115;

var grid = [];
var food = [];
var foodBuffer = [];
var organisms = [];
var frame = new JitterMatrix(4, "char", WIDTH, HEIGHT);
frame.name = "spores_organisms_frame";

var palette = [
    [76, 215, 142], [96, 179, 255], [240, 123, 181], [255, 191, 91],
    [172, 128, 255], [80, 224, 223], [232, 105, 92], [168, 220, 92]
];

function makeArray(value) {
    var a = new Array(WIDTH * HEIGHT);
    var i;
    for (i = 0; i < a.length; i++) a[i] = value;
    return a;
}

function indexOf(x, y) { return y * WIDTH + x; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function randInt(n) { return Math.floor(Math.random() * n); }
function sqr(v) { return v * v; }
function distance2(x1, y1, x2, y2) { return sqr(x1 - x2) + sqr(y1 - y2); }

function loadbang() { reset(DEFAULT_COUNT); }

function reset(count) {
    count = arguments.length ? Math.floor(count) : DEFAULT_COUNT;
    count = clamp(count, 1, MAX_ORGANISMS);
    generation = 0;
    nextId = 1;
    totalBirths = 0;
    totalDeaths = 0;
    grid = makeArray(0);
    food = makeArray(0.0);
    foodBuffer = makeArray(0.0);
    organisms = [];

    seedFood(44);

    var cols = Math.ceil(Math.sqrt(count));
    var rows = Math.ceil(count / cols);
    var i;
    for (i = 0; i < count; i++) {
        var gx = i % cols;
        var gy = Math.floor(i / cols);
        var cx = Math.floor((gx + 0.5) * WIDTH / cols + (Math.random() - 0.5) * 10);
        var cy = Math.floor((gy + 0.5) * HEIGHT / rows + (Math.random() - 0.5) * 8);
        spawnOrganism(cx, cy, 5 + randInt(3), 0.7 + Math.random() * 0.2);
    }
    render();
    outputState();
}

function dimensions(w, h) {
    WIDTH = clamp(Math.floor(w), 80, 240);
    HEIGHT = clamp(Math.floor(h), 45, 135);
    frame = new JitterMatrix(4, "char", WIDTH, HEIGHT);
    frame.name = "spores_organisms_frame";
    reset(Math.min(DEFAULT_COUNT, MAX_ORGANISMS));
}

function organismcount(v) { DEFAULT_COUNT = clamp(Math.floor(v), 1, MAX_ORGANISMS); }
function foodrate(v) { foodRate = clamp(parseFloat(v), 0.0, 0.08); }
function mutation(v) { mutationAmount = clamp(parseFloat(v), 0.0, 1.0); }
function metabolic(v) { metabolism = clamp(parseFloat(v), 0.0001, 0.008); }
function addfood(amount) { seedFood(arguments.length ? Math.floor(amount) : 12); render(); }

function seedFood(clusters) {
    var c, dx, dy;
    for (c = 0; c < clusters; c++) {
        var cx = 4 + randInt(Math.max(1, WIDTH - 8));
        var cy = 4 + randInt(Math.max(1, HEIGHT - 8));
        var radius = 2 + randInt(6);
        var strength = 0.45 + Math.random() * 0.55;
        for (dy = -radius; dy <= radius; dy++) {
            for (dx = -radius; dx <= radius; dx++) {
                var x = cx + dx;
                var y = cy + dy;
                if (x < 1 || y < 1 || x >= WIDTH - 1 || y >= HEIGHT - 1) continue;
                var d = Math.sqrt(dx * dx + dy * dy) / Math.max(1, radius);
                if (d <= 1.0) {
                    var idx = indexOf(x, y);
                    food[idx] = clamp(food[idx] + strength * (1.0 - d), 0, 1);
                }
            }
        }
    }
}

function spawnOrganism(cx, cy, radius, energy) {
    if (organisms.length >= MAX_ORGANISMS) return null;
    var id = nextId++;
    var o = {
        id: id,
        slot: freeSlot(),
        cells: [],
        cx: cx,
        cy: cy,
        prevCx: cx,
        prevCy: cy,
        polarityX: Math.random() * 2 - 1,
        polarityY: Math.random() * 2 - 1,
        energy: clamp(energy, 0, 1),
        age: 0,
        roughness: 0,
        event: 0,
        targetArea: 125 + randInt(35),
        color: palette[(id - 1) % palette.length]
    };

    var x, y;
    for (y = cy - radius - 3; y <= cy + radius + 3; y++) {
        for (x = cx - radius - 3; x <= cx + radius + 3; x++) {
            if (x < 2 || y < 2 || x >= WIDTH - 2 || y >= HEIGHT - 2) continue;
            var angle = Math.atan2(y - cy, x - cx);
            var wobble = Math.sin(angle * 3 + id) * 1.3 + (Math.random() - 0.5) * 2.0;
            if (distance2(x, y, cx, cy) <= sqr(radius + wobble)) addCell(o, x, y);
        }
    }
    organisms.push(o);
    updateStats(o);
    return o;
}

function freeSlot() {
    var used = [];
    var i;
    for (i = 0; i < organisms.length; i++) used[organisms[i].slot] = 1;
    for (i = 1; i <= MAX_ORGANISMS; i++) if (!used[i]) return i;
    return 1;
}

function addCell(o, x, y) {
    var idx = indexOf(x, y);
    if (grid[idx] !== 0) return false;
    grid[idx] = o.id;
    o.cells.push([x, y]);
    return true;
}

function removeCell(o, cellIndex) {
    if (cellIndex < 0 || cellIndex >= o.cells.length) return false;
    var c = o.cells[cellIndex];
    grid[indexOf(c[0], c[1])] = 0;
    o.cells.splice(cellIndex, 1);
    return true;
}

function sameNeighbours(o, x, y) {
    var n = 0;
    var dx, dy, nx, ny;
    for (dy = -1; dy <= 1; dy++) {
        for (dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            nx = x + dx;
            ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
            if (grid[indexOf(nx, ny)] === o.id) n++;
        }
    }
    return n;
}

function isBoundary(o, x, y) { return sameNeighbours(o, x, y) < 8; }

function updateStats(o) {
    var sx = 0;
    var sy = 0;
    var boundary = 0;
    var i;
    for (i = 0; i < o.cells.length; i++) {
        sx += o.cells[i][0];
        sy += o.cells[i][1];
        if (isBoundary(o, o.cells[i][0], o.cells[i][1])) boundary++;
    }
    o.prevCx = o.cx;
    o.prevCy = o.cy;
    if (o.cells.length) {
        o.cx = sx / o.cells.length;
        o.cy = sy / o.cells.length;
    }
    o.roughness = o.cells.length ? boundary / o.cells.length : 0;
}

function localFood(x, y, radius) {
    var sum = 0;
    var count = 0;
    var dx, dy;
    for (dy = -radius; dy <= radius; dy++) {
        for (dx = -radius; dx <= radius; dx++) {
            var nx = clamp(Math.round(x + dx), 0, WIDTH - 1);
            var ny = clamp(Math.round(y + dy), 0, HEIGHT - 1);
            sum += food[indexOf(nx, ny)];
            count++;
        }
    }
    return count ? sum / count : 0;
}

function updatePolarity(o) {
    var step = 8;
    var dirs = [[1,0],[-1,0],[0,1],[0,-1],[0.707,0.707],[-0.707,0.707],[0.707,-0.707],[-0.707,-0.707]];
    var best = -1;
    var bx = o.polarityX;
    var by = o.polarityY;
    var i;
    for (i = 0; i < dirs.length; i++) {
        var score = localFood(o.cx + dirs[i][0] * step, o.cy + dirs[i][1] * step, 2);
        score += Math.random() * mutationAmount * 0.16;
        score += Math.max(0, dirs[i][0] * o.polarityX + dirs[i][1] * o.polarityY) * 0.08;
        if (score > best) {
            best = score;
            bx = dirs[i][0];
            by = dirs[i][1];
        }
    }
    o.polarityX = o.polarityX * 0.76 + bx * 0.24 + (Math.random() - 0.5) * mutationAmount * 0.12;
    o.polarityY = o.polarityY * 0.76 + by * 0.24 + (Math.random() - 0.5) * mutationAmount * 0.12;
    var mag = Math.sqrt(o.polarityX * o.polarityX + o.polarityY * o.polarityY) || 1;
    o.polarityX /= mag;
    o.polarityY /= mag;
}

function chooseBoundary(o, front) {
    var candidates = [];
    var weights = [];
    var total = 0;
    var i;
    for (i = 0; i < o.cells.length; i++) {
        var c = o.cells[i];
        if (!isBoundary(o, c[0], c[1])) continue;
        var vx = c[0] - o.cx;
        var vy = c[1] - o.cy;
        var dot = vx * o.polarityX + vy * o.polarityY;
        var ok = front ? dot >= -2.0 : dot <= 2.0;
        if (!ok) continue;
        var w = 0.25 + (front ? Math.max(0, dot) : Math.max(0, -dot));
        candidates.push(i);
        weights.push(w);
        total += w;
    }
    if (!candidates.length) return -1;
    var pick = Math.random() * total;
    for (i = 0; i < candidates.length; i++) {
        pick -= weights[i];
        if (pick <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function consumeFood(o) {
    var consumed = 0;
    var samples = Math.min(o.cells.length, 90);
    var i;
    for (i = 0; i < samples; i++) {
        var c = o.cells[randInt(o.cells.length)];
        var idx = indexOf(c[0], c[1]);
        if (food[idx] > 0.008) {
            var bite = Math.min(food[idx], 0.014 + o.energy * 0.008);
            food[idx] -= bite;
            consumed += bite;
        }
    }
    if (consumed > 0.018) o.event = 1;
    o.energy = clamp(o.energy + consumed * 0.34, 0, 1);
    o.targetArea = clamp(105 + o.energy * 145, 90, 250);
}

function connectedEnough(o, candidateIndex) {
    var c = o.cells[candidateIndex];
    return sameNeighbours(o, c[0], c[1]) >= 3;
}

function stepOrganism(o) {
    if (!o.cells.length) return;
    o.event = 0;
    o.age++;
    updatePolarity(o);
    consumeFood(o);

    var sizeError = o.targetArea - o.cells.length;
    var attempts = 3 + Math.floor(Math.abs(sizeError) / 20) + Math.floor(o.energy * 4);
    attempts = clamp(attempts, 2, 12);
    var a;

    for (a = 0; a < attempts; a++) {
        var shouldGrow = sizeError > 0 || Math.random() < 0.54;
        if (shouldGrow) {
            var fi = chooseBoundary(o, true);
            if (fi >= 0) {
                var fc = o.cells[fi];
                var dx = Math.round(o.polarityX * (0.7 + Math.random()) + (Math.random() - 0.5) * 1.7);
                var dy = Math.round(o.polarityY * (0.7 + Math.random()) + (Math.random() - 0.5) * 1.7);
                if (dx === 0 && dy === 0) dx = Math.random() < 0.5 ? -1 : 1;
                var nx = clamp(fc[0] + dx, 1, WIDTH - 2);
                var ny = clamp(fc[1] + dy, 1, HEIGHT - 2);
                addCell(o, nx, ny);
            }
        }

        var shouldRetract = o.cells.length > o.targetArea || Math.random() < 0.46;
        if (shouldRetract && o.cells.length > MIN_AREA) {
            var ri = chooseBoundary(o, false);
            if (ri >= 0 && connectedEnough(o, ri)) removeCell(o, ri);
        }
    }

    o.energy = clamp(o.energy - metabolism - o.cells.length * 0.0000016, 0, 1);
    if (o.energy < 0.12 && o.cells.length > MIN_AREA) {
        var shrink = chooseBoundary(o, false);
        if (shrink >= 0 && connectedEnough(o, shrink)) removeCell(o, shrink);
    }
    updateStats(o);
}

function diffuseFood() {
    var x, y;
    for (y = 0; y < HEIGHT; y++) {
        for (x = 0; x < WIDTH; x++) {
            var idx = indexOf(x, y);
            var center = food[idx];
            var left = food[indexOf(x > 0 ? x - 1 : x, y)];
            var right = food[indexOf(x < WIDTH - 1 ? x + 1 : x, y)];
            var up = food[indexOf(x, y > 0 ? y - 1 : y)];
            var down = food[indexOf(x, y < HEIGHT - 1 ? y + 1 : y)];
            var lap = (left + right + up + down) * 0.25 - center;
            foodBuffer[idx] = clamp(center + lap * diffusion - center * 0.0018, 0, 1);
        }
    }
    var tmp = food;
    food = foodBuffer;
    foodBuffer = tmp;
}

function bang() {
    var i;
    if (Math.random() < foodRate) seedFood(1);
    if (generation % 2 === 0) diffuseFood();

    for (i = 0; i < organisms.length; i++) stepOrganism(organisms[i]);

    generation++;
    render();
    outputState();
}

function render() {
    frame.setall(9, 11, 14, 255);
    var x, y;
    for (y = 0; y < HEIGHT; y++) {
        for (x = 0; x < WIDTH; x++) {
            var f = food[indexOf(x, y)];
            if (f > 0.025) {
                frame.setcell2d(x, y,
                    Math.floor(34 + f * 180),
                    Math.floor(25 + f * 110),
                    Math.floor(12 + f * 35), 255);
            }
        }
    }

    var i;
    for (i = 0; i < organisms.length; i++) {
        var o = organisms[i];
        var j;
        for (j = 0; j < o.cells.length; j++) {
            var c = o.cells[j];
            var boundary = isBoundary(o, c[0], c[1]);
            var scale = boundary ? 1.0 : 0.48 + o.energy * 0.2;
            frame.setcell2d(c[0], c[1],
                Math.floor(o.color[0] * scale),
                Math.floor(o.color[1] * scale),
                Math.floor(o.color[2] * scale), 255);
        }

        var nx = clamp(Math.round(o.cx), 1, WIDTH - 2);
        var ny = clamp(Math.round(o.cy), 1, HEIGHT - 2);
        frame.setcell2d(nx, ny, 244, 246, 238, 255);
        frame.setcell2d(nx + 1, ny, 244, 246, 238, 255);
        frame.setcell2d(nx - 1, ny, 244, 246, 238, 255);
        frame.setcell2d(nx, ny + 1, 244, 246, 238, 255);
        frame.setcell2d(nx, ny - 1, 244, 246, 238, 255);

        var px = clamp(Math.round(o.cx + o.polarityX * 7), 0, WIDTH - 1);
        var py = clamp(Math.round(o.cy + o.polarityY * 7), 0, HEIGHT - 1);
        frame.setcell2d(px, py, 255, 80, 184, 255);
    }
    outlet(0, "jit_matrix", frame.name);
}

function outputState() {
    var i;
    var foodSum = 0;
    for (i = 0; i < food.length; i += 12) foodSum += food[i];
    var foodAverage = foodSum / Math.ceil(food.length / 12);

    for (i = 0; i < organisms.length; i++) {
        var o = organisms[i];
        var speed = Math.sqrt(distance2(o.cx, o.cy, o.prevCx, o.prevCy));
        outlet(1, ["voice", o.slot,
            clamp(o.cells.length / 260.0, 0, 1),
            o.energy,
            clamp(speed / 3.0, 0, 1),
            clamp(o.roughness, 0, 1),
            clamp(o.cx / WIDTH, 0, 1),
            clamp(o.cy / HEIGHT, 0, 1),
            o.event]);
        o.event = 0;
    }
    outlet(2, ["stats", generation, organisms.length, foodAverage, totalBirths, totalDeaths]);
}
