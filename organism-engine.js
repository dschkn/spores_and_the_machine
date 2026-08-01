autowatch = 1;
inlets = 1;
outlets = 3;

// Optimized contour-based organism simulation for Max 8.
// outlet 0: RGBA Jitter matrix
// outlet 1: "voice slot area energy speed roughness x y event"
// outlet 2: "stats generation organisms food births deaths"

var WIDTH = 160;
var HEIGHT = 90;
var FOOD_W = 80;
var FOOD_H = 45;

var MAX_ORGANISMS = 8;
var DEFAULT_COUNT = 5;
var CONTOUR_POINTS = 28;

var generation = 0;
var nextId = 1;
var totalBirths = 0;
var totalDeaths = 0;

var foodRate = 0.010;
var mutationAmount = 0.12;
var diffusion = 0.14;
var metabolism = 0.0010;

var renderEvery = 2;
var outputEvery = 2;
var diffusionEvery = 4;
var qualityName = "medium";

var food = [];
var foodBuffer = [];
var organisms = [];

var frame = new JitterMatrix(4, "char", WIDTH, HEIGHT);
frame.name = "spores_organisms_frame";

var palette = [
    [76, 215, 142], [96, 179, 255], [240, 123, 181], [255, 191, 91],
    [172, 128, 255], [80, 224, 223], [232, 105, 92], [168, 220, 92]
];

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

function randInt(n) {
    return Math.floor(Math.random() * n);
}

function sqr(v) {
    return v * v;
}

function distance2(x1, y1, x2, y2) {
    return sqr(x1 - x2) + sqr(y1 - y2);
}

function makeArray(length, value) {
    var a = new Array(length);
    var i;
    for (i = 0; i < length; i++) a[i] = value;
    return a;
}

function foodIndex(x, y) {
    return y * FOOD_W + x;
}

function loadbang() {
    reset(DEFAULT_COUNT);
}

function quality(name) {
    var value = String(name).toLowerCase();

    if (value === "low") {
        qualityName = "low";
        CONTOUR_POINTS = 20;
        renderEvery = 3;
        outputEvery = 3;
        diffusionEvery = 6;
    } else if (value === "high") {
        qualityName = "high";
        CONTOUR_POINTS = 36;
        renderEvery = 1;
        outputEvery = 1;
        diffusionEvery = 3;
    } else {
        qualityName = "medium";
        CONTOUR_POINTS = 28;
        renderEvery = 2;
        outputEvery = 2;
        diffusionEvery = 4;
    }

    rebuildContours();
    render();
    outputState(true);
}

function rebuildContours() {
    var i;
    for (i = 0; i < organisms.length; i++) {
        organisms[i].radii = makeInitialRadii(
            organisms[i].baseRadius,
            organisms[i].shapePhase,
            organisms[i].id
        );
    }
}

function dimensions(w, h) {
    WIDTH = clamp(Math.floor(w), 96, 200);
    HEIGHT = clamp(Math.floor(h), 54, 112);

    FOOD_W = Math.max(48, Math.floor(WIDTH * 0.5));
    FOOD_H = Math.max(27, Math.floor(HEIGHT * 0.5));

    frame = new JitterMatrix(4, "char", WIDTH, HEIGHT);
    frame.name = "spores_organisms_frame";

    reset(Math.min(DEFAULT_COUNT, MAX_ORGANISMS));
}

function organismcount(v) {
    DEFAULT_COUNT = clamp(Math.floor(v), 1, MAX_ORGANISMS);
}

function foodrate(v) {
    foodRate = clamp(parseFloat(v), 0.0, 0.08);
}

function mutation(v) {
    mutationAmount = clamp(parseFloat(v), 0.0, 1.0);
}

function metabolic(v) {
    metabolism = clamp(parseFloat(v), 0.0001, 0.008);
}

function addfood(amount) {
    seedFood(arguments.length ? Math.floor(amount) : 10);
    render();
}

function reset(count) {
    count = arguments.length ? Math.floor(count) : DEFAULT_COUNT;
    count = clamp(count, 1, MAX_ORGANISMS);

    generation = 0;
    nextId = 1;
    totalBirths = 0;
    totalDeaths = 0;

    food = makeArray(FOOD_W * FOOD_H, 0.0);
    foodBuffer = makeArray(FOOD_W * FOOD_H, 0.0);
    organisms = [];

    seedFood(24);

    var cols = Math.ceil(Math.sqrt(count));
    var rows = Math.ceil(count / cols);
    var i;

    for (i = 0; i < count; i++) {
        var gx = i % cols;
        var gy = Math.floor(i / cols);

        var cx = (gx + 0.5) * WIDTH / cols;
        var cy = (gy + 0.5) * HEIGHT / rows;

        cx += (Math.random() - 0.5) * 10;
        cy += (Math.random() - 0.5) * 8;

        spawnOrganism(cx, cy, 7.0 + Math.random() * 1.8, 0.72 + Math.random() * 0.18);
    }

    render();
    outputState(true);
}

function seedFood(clusters) {
    var c;
    var dx;
    var dy;

    for (c = 0; c < clusters; c++) {
        var cx = 3 + randInt(Math.max(1, FOOD_W - 6));
        var cy = 3 + randInt(Math.max(1, FOOD_H - 6));
        var radius = 2 + randInt(4);
        var strength = 0.45 + Math.random() * 0.55;

        for (dy = -radius; dy <= radius; dy++) {
            for (dx = -radius; dx <= radius; dx++) {
                var x = cx + dx;
                var y = cy + dy;

                if (x < 1 || y < 1 || x >= FOOD_W - 1 || y >= FOOD_H - 1) continue;

                var d = Math.sqrt(dx * dx + dy * dy) / Math.max(1, radius);
                if (d <= 1.0) {
                    var idx = foodIndex(x, y);
                    food[idx] = clamp(food[idx] + strength * (1.0 - d), 0, 1);
                }
            }
        }
    }
}

function freeSlot() {
    var used = [];
    var i;

    for (i = 0; i < organisms.length; i++) used[organisms[i].slot] = 1;
    for (i = 1; i <= MAX_ORGANISMS; i++) {
        if (!used[i]) return i;
    }

    return 1;
}

function makeInitialRadii(radius, phase, id) {
    var radii = new Array(CONTOUR_POINTS);
    var i;

    for (i = 0; i < CONTOUR_POINTS; i++) {
        var angle = Math.PI * 2 * i / CONTOUR_POINTS;
        var harmonic =
            Math.sin(angle * 3 + phase) * 0.055 +
            Math.sin(angle * 5 + phase * 0.7 + id) * 0.035;

        radii[i] = radius * (1.0 + harmonic);
    }

    return radii;
}

function spawnOrganism(cx, cy, radius, energy) {
    if (organisms.length >= MAX_ORGANISMS) return null;

    var id = nextId++;
    var angle = Math.random() * Math.PI * 2;
    var phase = Math.random() * Math.PI * 2;

    var o = {
        id: id,
        slot: freeSlot(),

        cx: clamp(cx, radius + 3, WIDTH - radius - 3),
        cy: clamp(cy, radius + 3, HEIGHT - radius - 3),
        prevCx: cx,
        prevCy: cy,

        polarityX: Math.cos(angle),
        polarityY: Math.sin(angle),
        velocityX: 0,
        velocityY: 0,

        energy: clamp(energy, 0, 1),
        age: 0,
        event: 0,

        baseRadius: radius,
        targetRadius: radius,
        radii: makeInitialRadii(radius, phase, id),
        shapePhase: phase,
        shapePhase2: Math.random() * Math.PI * 2,
        roughness: 0,
        area: Math.PI * radius * radius,

        nucleusX: cx,
        nucleusY: cy,
        nucleusVX: 0,
        nucleusVY: 0,

        color: palette[(id - 1) % palette.length]
    };

    organisms.push(o);
    return o;
}

function foodAtWorld(x, y) {
    var fx = clamp(Math.floor(x * FOOD_W / WIDTH), 0, FOOD_W - 1);
    var fy = clamp(Math.floor(y * FOOD_H / HEIGHT), 0, FOOD_H - 1);
    return food[foodIndex(fx, fy)];
}

function consumeFoodAtWorld(x, y, amount) {
    var fx = clamp(Math.floor(x * FOOD_W / WIDTH), 0, FOOD_W - 1);
    var fy = clamp(Math.floor(y * FOOD_H / HEIGHT), 0, FOOD_H - 1);
    var idx = foodIndex(fx, fy);

    var bite = Math.min(food[idx], amount);
    food[idx] -= bite;
    return bite;
}

function updatePolarity(o) {
    var dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [0.707, 0.707], [-0.707, 0.707],
        [0.707, -0.707], [-0.707, -0.707]
    ];

    var sampleDistance = o.baseRadius + 7;
    var bestScore = -999;
    var bestX = o.polarityX;
    var bestY = o.polarityY;
    var i;

    for (i = 0; i < dirs.length; i++) {
        var dx = dirs[i][0];
        var dy = dirs[i][1];

        var score = foodAtWorld(
            o.cx + dx * sampleDistance,
            o.cy + dy * sampleDistance
        );

        score += Math.max(0, dx * o.polarityX + dy * o.polarityY) * 0.08;
        score += Math.random() * mutationAmount * 0.12;

        if (score > bestScore) {
            bestScore = score;
            bestX = dx;
            bestY = dy;
        }
    }

    o.polarityX =
        o.polarityX * 0.82 +
        bestX * 0.18 +
        (Math.random() - 0.5) * mutationAmount * 0.08;

    o.polarityY =
        o.polarityY * 0.82 +
        bestY * 0.18 +
        (Math.random() - 0.5) * mutationAmount * 0.08;

    var mag = Math.sqrt(o.polarityX * o.polarityX + o.polarityY * o.polarityY) || 1;
    o.polarityX /= mag;
    o.polarityY /= mag;
}

function consumeFood(o) {
    var consumed = 0;
    var samples = 8;
    var i;

    consumed += consumeFoodAtWorld(o.cx, o.cy, 0.018);

    for (i = 0; i < samples; i++) {
        var angle = Math.PI * 2 * i / samples;
        var radiusIndex = Math.floor(i * CONTOUR_POINTS / samples);
        var radius = o.radii[radiusIndex];

        consumed += consumeFoodAtWorld(
            o.cx + Math.cos(angle) * radius * 0.88,
            o.cy + Math.sin(angle) * radius * 0.88,
            0.008
        );
    }

    if (consumed > 0.018) o.event = 1;

    o.energy = clamp(o.energy + consumed * 0.62, 0, 1);
    o.targetRadius = clamp(5.8 + o.energy * 5.5, 5.8, 11.3);
}

function repelOrganisms() {
    var i;
    var j;

    for (i = 0; i < organisms.length; i++) {
        for (j = i + 1; j < organisms.length; j++) {
            var a = organisms[i];
            var b = organisms[j];

            var dx = b.cx - a.cx;
            var dy = b.cy - a.cy;
            var dist2 = dx * dx + dy * dy;
            var minDist = (a.baseRadius + b.baseRadius) * 0.72;

            if (dist2 < 0.0001 || dist2 >= minDist * minDist) continue;

            var dist = Math.sqrt(dist2);
            var push = (minDist - dist) * 0.025;
            var nx = dx / dist;
            var ny = dy / dist;

            a.velocityX -= nx * push;
            a.velocityY -= ny * push;
            b.velocityX += nx * push;
            b.velocityY += ny * push;
        }
    }
}

function updateMovement(o) {
    var drive = 0.045 + o.energy * 0.055;

    o.velocityX = o.velocityX * 0.78 + o.polarityX * drive;
    o.velocityY = o.velocityY * 0.78 + o.polarityY * drive;

    o.prevCx = o.cx;
    o.prevCy = o.cy;

    o.cx += o.velocityX;
    o.cy += o.velocityY;

    var margin = o.baseRadius + 3;

    if (o.cx < margin) {
        o.cx = margin;
        o.velocityX = Math.abs(o.velocityX) * 0.65;
        o.polarityX = Math.abs(o.polarityX);
    } else if (o.cx > WIDTH - margin) {
        o.cx = WIDTH - margin;
        o.velocityX = -Math.abs(o.velocityX) * 0.65;
        o.polarityX = -Math.abs(o.polarityX);
    }

    if (o.cy < margin) {
        o.cy = margin;
        o.velocityY = Math.abs(o.velocityY) * 0.65;
        o.polarityY = Math.abs(o.polarityY);
    } else if (o.cy > HEIGHT - margin) {
        o.cy = HEIGHT - margin;
        o.velocityY = -Math.abs(o.velocityY) * 0.65;
        o.polarityY = -Math.abs(o.polarityY);
    }
}

function updateNucleus(o) {
    var targetX = o.cx - o.polarityX * o.baseRadius * 0.12;
    var targetY = o.cy - o.polarityY * o.baseRadius * 0.12;

    o.nucleusVX = o.nucleusVX * 0.72 + (targetX - o.nucleusX) * 0.055;
    o.nucleusVY = o.nucleusVY * 0.72 + (targetY - o.nucleusY) * 0.055;

    o.nucleusX += o.nucleusVX;
    o.nucleusY += o.nucleusVY;
}

function updateShape(o) {
    var next = new Array(CONTOUR_POINTS);
    var i;
    var frameChange = 0;

    o.shapePhase += 0.018 + o.energy * 0.015;
    o.shapePhase2 += 0.011 + mutationAmount * 0.02;

    for (i = 0; i < CONTOUR_POINTS; i++) {
        var angle = Math.PI * 2 * i / CONTOUR_POINTS;
        var dirX = Math.cos(angle);
        var dirY = Math.sin(angle);
        var front = dirX * o.polarityX + dirY * o.polarityY;

        var harmonic =
            Math.sin(angle * 3 + o.shapePhase) * 0.065 +
            Math.sin(angle * 5 - o.shapePhase2) * 0.038;

        var polarityBulge =
            Math.max(0, front) * 0.11 -
            Math.max(0, -front) * 0.045;

        var desired =
            o.targetRadius *
            (1.0 + harmonic + polarityBulge);

        var prev = o.radii[(i - 1 + CONTOUR_POINTS) % CONTOUR_POINTS];
        var current = o.radii[i];
        var following = o.radii[(i + 1) % CONTOUR_POINTS];
        var neighbourAverage = (prev + current + following) / 3.0;

        var noise =
            (Math.random() - 0.5) *
            mutationAmount *
            o.targetRadius *
            0.045;

        var value =
            current * 0.54 +
            desired * 0.30 +
            neighbourAverage * 0.16 +
            noise;

        value = clamp(
            value,
            o.targetRadius * 0.76,
            o.targetRadius * 1.30
        );

        next[i] = value;
        frameChange += Math.abs(value - current);
    }

    o.radii = next;
    o.baseRadius = o.baseRadius * 0.90 + o.targetRadius * 0.10;

    var contourVariation = 0;
    for (i = 0; i < CONTOUR_POINTS; i++) {
        contourVariation += Math.abs(
            next[i] - next[(i - 1 + CONTOUR_POINTS) % CONTOUR_POINTS]
        );
    }

    o.roughness = clamp(
        contourVariation / (CONTOUR_POINTS * Math.max(1, o.baseRadius)) * 3.2 +
        frameChange / (CONTOUR_POINTS * Math.max(1, o.baseRadius)) * 1.8,
        0,
        1
    );
}

function polygonPoints(o) {
    var points = new Array(CONTOUR_POINTS);
    var i;

    for (i = 0; i < CONTOUR_POINTS; i++) {
        var angle = Math.PI * 2 * i / CONTOUR_POINTS;
        points[i] = [
            o.cx + Math.cos(angle) * o.radii[i],
            o.cy + Math.sin(angle) * o.radii[i]
        ];
    }

    return points;
}

function polygonArea(points) {
    var sum = 0;
    var i;

    for (i = 0; i < points.length; i++) {
        var a = points[i];
        var b = points[(i + 1) % points.length];
        sum += a[0] * b[1] - b[0] * a[1];
    }

    return Math.abs(sum) * 0.5;
}

function stepOrganism(o) {
    o.event = 0;
    o.age++;

    if (generation % 2 === 0) updatePolarity(o);

    consumeFood(o);
    updateMovement(o);
    updateShape(o);
    updateNucleus(o);

    o.energy = clamp(
        o.energy -
        metabolism -
        o.baseRadius * 0.000013 -
        (Math.abs(o.velocityX) + Math.abs(o.velocityY)) * 0.00025,
        0,
        1
    );

    o.area = polygonArea(polygonPoints(o));
}

function divideOrganism(o) {
    if (
        organisms.length >= MAX_ORGANISMS ||
        o.energy < 0.91 ||
        o.baseRadius < 10.4 ||
        o.age < 520
    ) {
        return false;
    }

    var perpendicularX = -o.polarityY;
    var perpendicularY = o.polarityX;
    var offset = o.baseRadius * 0.48;
    var childRadius = Math.max(5.8, o.baseRadius * 0.73);

    var child = spawnOrganism(
        o.cx + perpendicularX * offset,
        o.cy + perpendicularY * offset,
        childRadius,
        o.energy * 0.46
    );

    if (!child) return false;

    child.polarityX = perpendicularX;
    child.polarityY = perpendicularY;
    child.event = 2;

    o.cx -= perpendicularX * offset;
    o.cy -= perpendicularY * offset;
    o.energy *= 0.52;
    o.targetRadius = childRadius;
    o.baseRadius = childRadius;
    o.radii = makeInitialRadii(childRadius, o.shapePhase, o.id);
    o.age = 0;
    o.event = 2;

    totalBirths++;
    return true;
}

function killOrganism(index) {
    var o = organisms[index];
    var i;

    for (i = 0; i < 14; i++) {
        var angle = Math.PI * 2 * i / 14;
        var radius = o.baseRadius * (0.15 + Math.random() * 0.75);

        var wx = o.cx + Math.cos(angle) * radius;
        var wy = o.cy + Math.sin(angle) * radius;

        var fx = clamp(Math.floor(wx * FOOD_W / WIDTH), 0, FOOD_W - 1);
        var fy = clamp(Math.floor(wy * FOOD_H / HEIGHT), 0, FOOD_H - 1);
        var idx = foodIndex(fx, fy);

        food[idx] = clamp(food[idx] + 0.22, 0, 1);
    }

    outlet(1, [
        "voice",
        o.slot,
        0, 0, 0, 0,
        o.cx / WIDTH,
        o.cy / HEIGHT,
        3
    ]);

    organisms.splice(index, 1);
    totalDeaths++;
}

function diffuseFood() {
    var x;
    var y;

    for (y = 0; y < FOOD_H; y++) {
        for (x = 0; x < FOOD_W; x++) {
            var idx = foodIndex(x, y);
            var center = food[idx];

            var left = food[foodIndex(x > 0 ? x - 1 : x, y)];
            var right = food[foodIndex(x < FOOD_W - 1 ? x + 1 : x, y)];
            var up = food[foodIndex(x, y > 0 ? y - 1 : y)];
            var down = food[foodIndex(x, y < FOOD_H - 1 ? y + 1 : y)];

            var lap = (left + right + up + down) * 0.25 - center;

            foodBuffer[idx] = clamp(
                center + lap * diffusion - center * 0.0022,
                0,
                1
            );
        }
    }

    var temp = food;
    food = foodBuffer;
    foodBuffer = temp;
}

function bang() {
    var i;

    if (Math.random() < foodRate) seedFood(1);
    if (generation % diffusionEvery === 0) diffuseFood();

    repelOrganisms();

    for (i = 0; i < organisms.length; i++) {
        stepOrganism(organisms[i]);
    }

    for (i = 0; i < organisms.length; i++) {
        divideOrganism(organisms[i]);
    }

    for (i = organisms.length - 1; i >= 0; i--) {
        if (organisms[i].energy <= 0.01 || organisms[i].baseRadius < 4.8) {
            killOrganism(i);
        }
    }

    if (!organisms.length) {
        spawnOrganism(WIDTH * 0.5, HEIGHT * 0.5, 7.5, 0.78);
    }

    generation++;

    if (generation % renderEvery === 0) render();
    if (generation % outputEvery === 0) outputState(false);
}

function drawFood() {
    var x;
    var y;
    var scaleX = WIDTH / FOOD_W;
    var scaleY = HEIGHT / FOOD_H;

    for (y = 0; y < FOOD_H; y++) {
        for (x = 0; x < FOOD_W; x++) {
            var value = food[foodIndex(x, y)];
            if (value < 0.045) continue;

            var worldX = Math.floor((x + 0.5) * scaleX);
            var worldY = Math.floor((y + 0.5) * scaleY);
            var brightness = Math.floor(clamp(value, 0, 1) * 170);

            frame.setcell2d(
                worldX,
                worldY,
                42 + brightness,
                28 + Math.floor(brightness * 0.62),
                14 + Math.floor(brightness * 0.18),
                255
            );
        }
    }
}

function fillPolygon(points, color) {
    var minY = HEIGHT - 1;
    var maxY = 0;
    var i;

    for (i = 0; i < points.length; i++) {
        minY = Math.min(minY, Math.floor(points[i][1]));
        maxY = Math.max(maxY, Math.ceil(points[i][1]));
    }

    minY = clamp(minY, 0, HEIGHT - 1);
    maxY = clamp(maxY, 0, HEIGHT - 1);

    var y;

    for (y = minY; y <= maxY; y++) {
        var scanY = y + 0.5;
        var intersections = [];

        for (i = 0; i < points.length; i++) {
            var a = points[i];
            var b = points[(i + 1) % points.length];

            if (
                (a[1] <= scanY && b[1] > scanY) ||
                (b[1] <= scanY && a[1] > scanY)
            ) {
                var t = (scanY - a[1]) / (b[1] - a[1]);
                intersections.push(a[0] + t * (b[0] - a[0]));
            }
        }

        intersections.sort(function(a, b) { return a - b; });

        for (i = 0; i + 1 < intersections.length; i += 2) {
            var startX = clamp(Math.ceil(intersections[i]), 0, WIDTH - 1);
            var endX = clamp(Math.floor(intersections[i + 1]), 0, WIDTH - 1);
            var x;

            for (x = startX; x <= endX; x++) {
                frame.setcell2d(x, y, color[0], color[1], color[2], 255);
            }
        }
    }
}

function drawLine(x0, y0, x1, y1, color) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);

    var dx = Math.abs(x1 - x0);
    var sx = x0 < x1 ? 1 : -1;
    var dy = -Math.abs(y1 - y0);
    var sy = y0 < y1 ? 1 : -1;
    var err = dx + dy;

    while (true) {
        if (x0 >= 0 && y0 >= 0 && x0 < WIDTH && y0 < HEIGHT) {
            frame.setcell2d(x0, y0, color[0], color[1], color[2], 255);
        }

        if (x0 === x1 && y0 === y1) break;

        var e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y0 += sy;
        }
    }
}

function drawDisc(cx, cy, radius, color) {
    var x;
    var y;

    cx = Math.round(cx);
    cy = Math.round(cy);

    for (y = -radius; y <= radius; y++) {
        for (x = -radius; x <= radius; x++) {
            if (x * x + y * y > radius * radius) continue;

            var px = cx + x;
            var py = cy + y;

            if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue;
            frame.setcell2d(px, py, color[0], color[1], color[2], 255);
        }
    }
}

function renderOrganism(o) {
    var points = polygonPoints(o);

    var interiorScale = 0.42 + o.energy * 0.16;
    var interiorColor = [
        Math.floor(o.color[0] * interiorScale),
        Math.floor(o.color[1] * interiorScale),
        Math.floor(o.color[2] * interiorScale)
    ];

    fillPolygon(points, interiorColor);

    var i;
    for (i = 0; i < points.length; i++) {
        drawLine(
            points[i][0],
            points[i][1],
            points[(i + 1) % points.length][0],
            points[(i + 1) % points.length][1],
            o.color
        );
    }

    drawDisc(o.nucleusX, o.nucleusY, 2, [244, 246, 238]);

    drawDisc(
        o.cx + o.polarityX * (o.baseRadius + 1.5),
        o.cy + o.polarityY * (o.baseRadius + 1.5),
        1,
        [255, 80, 184]
    );
}

function render() {
    frame.setall(9, 11, 14, 255);

    drawFood();

    var i;
    for (i = 0; i < organisms.length; i++) {
        renderOrganism(organisms[i]);
    }

    outlet(0, "jit_matrix", frame.name);
}

function outputState(force) {
    var i;

    var foodSum = 0;
    for (i = 0; i < food.length; i += 8) {
        foodSum += food[i];
    }
    var foodAverage = foodSum / Math.ceil(food.length / 8);

    for (i = 0; i < organisms.length; i++) {
        var o = organisms[i];

        var speed = Math.sqrt(
            distance2(o.cx, o.cy, o.prevCx, o.prevCy)
        );

        outlet(1, [
            "voice",
            o.slot,
            clamp(o.area / 420.0, 0, 1),
            o.energy,
            clamp(speed / 1.2, 0, 1),
            clamp(o.roughness * 4.0, 0, 1),
            clamp(o.cx / WIDTH, 0, 1),
            clamp(o.cy / HEIGHT, 0, 1),
            o.event
        ]);

        o.event = 0;
    }

    if (force || generation % (outputEvery * 2) === 0) {
        outlet(2, [
            "stats",
            generation,
            organisms.length,
            foodAverage,
            totalBirths,
            totalDeaths
        ]);
    }
}
