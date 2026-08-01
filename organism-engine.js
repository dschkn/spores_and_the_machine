autowatch = 1;
inlets = 1;
outlets = 3;

// outlet 0: RGBA Jitter matrix
// outlet 1: voice messages
// outlet 2: global statistics

var WIDTH = 160;
var HEIGHT = 90;
var MAX_ORGANISMS = 8;
var DEFAULT_COUNT = 6;
var generation = 0;
var nextId = 1;
var grid = [];
var organisms = [];
var frame = new JitterMatrix(4, "char", WIDTH, HEIGHT);
frame.name = "spores_organisms_frame";

var palette = [
    [76, 215, 142], [96, 179, 255], [240, 123, 181], [255, 191, 91],
    [172, 128, 255], [80, 224, 223], [232, 105, 92], [168, 220, 92]
];

function emptyGrid() {
    var a = new Array(WIDTH * HEIGHT);
    var i;
    for (i = 0; i < a.length; i++) a[i] = 0;
    return a;
}

function indexOf(x, y) { return y * WIDTH + x; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function randInt(n) { return Math.floor(Math.random() * n); }
function distance2(x1, y1, x2, y2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    return dx * dx + dy * dy;
}

function loadbang() { reset(DEFAULT_COUNT); }

function reset(count) {
    count = arguments.length ? Math.floor(count) : DEFAULT_COUNT;
    count = clamp(count, 1, MAX_ORGANISMS);
    generation = 0;
    nextId = 1;
    grid = emptyGrid();
    organisms = [];

    var cols = Math.ceil(Math.sqrt(count));
    var rows = Math.ceil(count / cols);
    var i;
    for (i = 0; i < count; i++) {
        var gx = i % cols;
        var gy = Math.floor(i / cols);
        var cx = Math.floor((gx + 0.5) * WIDTH / cols + (Math.random() - 0.5) * 12);
        var cy = Math.floor((gy + 0.5) * HEIGHT / rows + (Math.random() - 0.5) * 8);
        spawnOrganism(cx, cy, 5 + randInt(3));
    }
    render();
    outputState();
}

function spawnOrganism(cx, cy, radius) {
    var id = nextId++;
    var o = {
        id: id,
        slot: organisms.length + 1,
        cells: [],
        cx: cx,
        cy: cy,
        prevCx: cx,
        prevCy: cy,
        polarityX: Math.random() * 2 - 1,
        polarityY: Math.random() * 2 - 1,
        energy: 0.72 + Math.random() * 0.18,
        age: 0,
        roughness: 0,
        event: 0,
        color: palette[(id - 1) % palette.length]
    };

    var x, y;
    for (y = cy - radius - 2; y <= cy + radius + 2; y++) {
        for (x = cx - radius - 2; x <= cx + radius + 2; x++) {
            if (x < 2 || y < 2 || x >= WIDTH - 2 || y >= HEIGHT - 2) continue;
            var wobble = (Math.random() - 0.5) * 3.2;
            if (distance2(x, y, cx, cy) <= (radius + wobble) * (radius + wobble)) {
                addCell(o, x, y);
            }
        }
    }
    organisms.push(o);
    updateStats(o);
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

function isBoundary(o, x, y) {
    return sameNeighbours(o, x, y) < 8;
}

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
    o.cx = o.cells.length ? sx / o.cells.length : o.cx;
    o.cy = o.cells.length ? sy / o.cells.length : o.cy;
    o.roughness = o.cells.length ? boundary / o.cells.length : 0;
}

function chooseBoundary(o, front) {
    var candidates = [];
    var i;
    for (i = 0; i < o.cells.length; i++) {
        var c = o.cells[i];
        if (!isBoundary(o, c[0], c[1])) continue;
        var vx = c[0] - o.cx;
        var vy = c[1] - o.cy;
        var dot = vx * o.polarityX + vy * o.polarityY;
        if ((front && dot >= -1.0) || (!front && dot <= 1.0)) candidates.push(i);
    }
    if (!candidates.length) return -1;
    return candidates[randInt(candidates.length)];
}

function stepOrganism(o) {
    if (!o.cells.length) return;
    o.event = 0;
    o.age++;

    if (Math.random() < 0.08) {
        o.polarityX += (Math.random() - 0.5) * 0.5;
        o.polarityY += (Math.random() - 0.5) * 0.5;
    }
    var mag = Math.sqrt(o.polarityX * o.polarityX + o.polarityY * o.polarityY) || 1;
    o.polarityX /= mag;
    o.polarityY /= mag;

    var attempts = 3 + Math.floor(o.cells.length / 45);
    var a;
    for (a = 0; a < attempts; a++) {
        var fi = chooseBoundary(o, true);
        if (fi >= 0) {
            var fc = o.cells[fi];
            var dx = Math.round(o.polarityX + (Math.random() - 0.5) * 1.8);
            var dy = Math.round(o.polarityY + (Math.random() - 0.5) * 1.8);
            if (dx === 0 && dy === 0) dx = Math.random() < 0.5 ? -1 : 1;
            var nx = clamp(fc[0] + dx, 1, WIDTH - 2);
            var ny = clamp(fc[1] + dy, 1, HEIGHT - 2);
            addCell(o, nx, ny);
        }

        if (o.cells.length > 70) {
            var ri = chooseBoundary(o, false);
            if (ri >= 0) {
                var rc = o.cells[ri];
                if (sameNeighbours(o, rc[0], rc[1]) >= 3) removeCell(o, ri);
            }
        }
    }

    o.energy = clamp(o.energy - 0.0007, 0, 1);
    updateStats(o);
}

function bang() {
    var i;
    for (i = 0; i < organisms.length; i++) stepOrganism(organisms[i]);
    generation++;
    render();
    outputState();
}

function render() {
    frame.setall(10, 12, 14, 255);
    var i;
    for (i = 0; i < organisms.length; i++) {
        var o = organisms[i];
        var j;
        for (j = 0; j < o.cells.length; j++) {
            var c = o.cells[j];
            var boundary = isBoundary(o, c[0], c[1]);
            var scale = boundary ? 1.0 : 0.55;
            frame.setcell2d(c[0], c[1],
                Math.floor(o.color[0] * scale),
                Math.floor(o.color[1] * scale),
                Math.floor(o.color[2] * scale), 255);
        }
        var nx = clamp(Math.round(o.cx), 0, WIDTH - 1);
        var ny = clamp(Math.round(o.cy), 0, HEIGHT - 1);
        frame.setcell2d(nx, ny, 244, 246, 238, 255);
        if (nx + 1 < WIDTH) frame.setcell2d(nx + 1, ny, 244, 246, 238, 255);
        if (ny + 1 < HEIGHT) frame.setcell2d(nx, ny + 1, 244, 246, 238, 255);
    }
    outlet(0, "jit_matrix", frame.name);
}

function outputState() {
    var i;
    for (i = 0; i < organisms.length; i++) {
        var o = organisms[i];
        var speed = Math.sqrt(distance2(o.cx, o.cy, o.prevCx, o.prevCy));
        outlet(1, ["voice", o.slot, o.cells.length / 300.0, o.energy, speed, o.roughness,
            o.cx / WIDTH, o.cy / HEIGHT, o.event]);
    }
    outlet(2, ["stats", generation, organisms.length, 0, 0, 0]);
}
