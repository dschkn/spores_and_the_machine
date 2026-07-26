autowatch = 1;
inlets = 1;
outlets = 3;

// outlet 0: matrixctrl updates ("set x y value ...")
// outlet 1: acoustic zone data ("zone index density activity cx cy births deaths")
// outlet 2: global statistics ("stats generation alive density activity")

var width = 100;
var height = 50;
var zoneColumns = 2;
var zoneRows = 2;

var modeName = "conway";
var initialDensity = 0.18;
var wrapEdges = 1;
var sporeChance = 0.00035;
var autoSpore = 1;
var quietThreshold = 0.0015;
var quietLimit = 12;
var quietFrames = 0;
var generation = 0;

var grid = [];

function makeEmptyGrid() {
    var result = [];
    for (var y = 0; y < height; y++) {
        result[y] = [];
        for (var x = 0; x < width; x++) {
            result[y][x] = 0;
        }
    }
    return result;
}

function loadbang() {
    randomize(initialDensity);
}

function randomize(value) {
    var density = initialDensity;
    if (arguments.length > 0) {
        density = Math.max(0.0, Math.min(1.0, parseFloat(value)));
        initialDensity = density;
    }

    grid = makeEmptyGrid();
    generation = 0;
    quietFrames = 0;

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            grid[y][x] = Math.random() < density ? 1 : 0;
        }
    }

    drawAll();
    outputAnalysis(0, null, null, null);
}

function cleargrid() {
    grid = makeEmptyGrid();
    generation = 0;
    quietFrames = 0;
    outlet(0, "clear");
    outputAnalysis(0, null, null, null);
}

function cell(x, y, value) {
    x = Math.floor(x);
    y = Math.floor(y);
    value = Math.floor(value);

    if (x < 0 || x >= width || y < 0 || y >= height) {
        return;
    }

    if (modeName === "conway") {
        value = value > 0 ? 1 : 0;
    } else {
        value = Math.max(0, Math.min(2, value));
    }

    grid[y][x] = value;
    outlet(0, ["set", x, y, value]);
}

function mode(name) {
    if (name !== "conway" && name !== "mold") {
        post("spores-and-the-machine.js: mode must be conway or mold\n");
        return;
    }

    modeName = name;
    randomize(initialDensity);
}

function wrap(value) {
    wrapEdges = value > 0 ? 1 : 0;
}

function spores(value) {
    sporeChance = Math.max(0.0, Math.min(0.05, parseFloat(value)));
}

function autospore(value) {
    autoSpore = value > 0 ? 1 : 0;
}

function density(value) {
    initialDensity = Math.max(0.0, Math.min(1.0, parseFloat(value)));
}

function dimensions(w, h) {
    w = Math.max(4, Math.floor(w));
    h = Math.max(4, Math.floor(h));
    width = w;
    height = h;
    randomize(initialDensity);
}

function countActiveNeighbors(x, y) {
    var count = 0;

    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) {
                continue;
            }

            var nx = x + dx;
            var ny = y + dy;

            if (wrapEdges) {
                nx = (nx + width) % width;
                ny = (ny + height) % height;
            } else if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                continue;
            }

            if (grid[ny][nx] === 1) {
                count++;
            }
        }
    }

    return count;
}

function nextConwayState(current, neighbors) {
    var next = 0;

    if (current === 1) {
        next = (neighbors === 2 || neighbors === 3) ? 1 : 0;
    } else {
        next = neighbors === 3 ? 1 : 0;
    }

    if (next === 0 && Math.random() < sporeChance) {
        next = 1;
    }

    return next;
}

function nextMoldState(current, neighbors) {
    // A three-state Brian's-Brain-like rule:
    // 0 = empty, 1 = growing, 2 = exhausted/decaying.
    if (current === 1) {
        return 2;
    }

    if (current === 2) {
        return 0;
    }

    if (neighbors === 2 || Math.random() < sporeChance) {
        return 1;
    }

    return 0;
}

function bang() {
    if (!grid.length) {
        randomize(initialDensity);
        return;
    }

    var nextGrid = makeEmptyGrid();
    var changedTriples = [];
    var changedCount = 0;
    var zoneCount = zoneColumns * zoneRows;
    var zoneChanges = [];
    var zoneBirths = [];
    var zoneDeaths = [];

    for (var zoneInit = 0; zoneInit < zoneCount; zoneInit++) {
        zoneChanges[zoneInit] = 0;
        zoneBirths[zoneInit] = 0;
        zoneDeaths[zoneInit] = 0;
    }

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var current = grid[y][x];
            var neighbors = countActiveNeighbors(x, y);
            var next = modeName === "mold"
                ? nextMoldState(current, neighbors)
                : nextConwayState(current, neighbors);

            nextGrid[y][x] = next;

            if (next !== current) {
                changedTriples.push(x, y, next);
                changedCount++;

                var zoneX = Math.min(zoneColumns - 1, Math.floor(x * zoneColumns / width));
                var zoneY = Math.min(zoneRows - 1, Math.floor(y * zoneRows / height));
                var zone = zoneY * zoneColumns + zoneX;
                zoneChanges[zone]++;

                if (current !== 1 && next === 1) {
                    zoneBirths[zone]++;
                }
                if (current === 1 && next !== 1) {
                    zoneDeaths[zone]++;
                }
            }
        }
    }

    grid = nextGrid;
    generation++;

    outputChangedCells(changedTriples);

    var activity = changedCount / (width * height);
    if (activity < quietThreshold) {
        quietFrames++;
    } else {
        quietFrames = 0;
    }

    if (autoSpore && quietFrames >= quietLimit) {
        injectSpores(Math.max(4, Math.floor(width * height * 0.002)));
        quietFrames = 0;
    }

    outputAnalysis(activity, zoneChanges, zoneBirths, zoneDeaths);
}

function injectSpores(count) {
    var changedTriples = [];

    for (var i = 0; i < count; i++) {
        var x = Math.floor(Math.random() * width);
        var y = Math.floor(Math.random() * height);

        if (grid[y][x] === 0) {
            grid[y][x] = 1;
            changedTriples.push(x, y, 1);
        }
    }

    outputChangedCells(changedTriples);
}

function outputChangedCells(triples) {
    var maxTriplesPerMessage = 250;
    var step = maxTriplesPerMessage * 3;

    for (var start = 0; start < triples.length; start += step) {
        var message = ["set"];
        var end = Math.min(start + step, triples.length);

        for (var i = start; i < end; i++) {
            message.push(triples[i]);
        }

        outlet(0, message);
    }
}

function drawAll() {
    for (var y = 0; y < height; y++) {
        var message = ["set"];

        for (var x = 0; x < width; x++) {
            message.push(x, y, grid[y][x]);
        }

        outlet(0, message);
    }
}

function outputAnalysis(activity, zoneChanges, zoneBirths, zoneDeaths) {
    var zoneCount = zoneColumns * zoneRows;
    var alive = [];
    var sumX = [];
    var sumY = [];
    var zoneWidth = width / zoneColumns;
    var zoneHeight = height / zoneRows;
    var zoneArea = zoneWidth * zoneHeight;

    for (var z = 0; z < zoneCount; z++) {
        alive[z] = 0;
        sumX[z] = 0;
        sumY[z] = 0;
    }

    var totalAlive = 0;

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var state = grid[y][x];
            var zoneX = Math.min(zoneColumns - 1, Math.floor(x * zoneColumns / width));
            var zoneY = Math.min(zoneRows - 1, Math.floor(y * zoneRows / height));
            var zone = zoneY * zoneColumns + zoneX;

            if (state === 1) {
                alive[zone]++;
                totalAlive++;
                sumX[zone] += x;
                sumY[zone] += y;
            }
        }
    }

    for (var zoneIndex = 0; zoneIndex < zoneCount; zoneIndex++) {
        var localChanges = zoneChanges ? zoneChanges[zoneIndex] : 0;
        var localBirths = zoneBirths ? zoneBirths[zoneIndex] : 0;
        var localDeaths = zoneDeaths ? zoneDeaths[zoneIndex] : 0;
        var zoneDensity = Math.min(1.0, alive[zoneIndex] / zoneArea);
        var zoneActivity = Math.min(1.0, localChanges / zoneArea);
        var cx = alive[zoneIndex] > 0 ? (sumX[zoneIndex] / alive[zoneIndex]) / Math.max(1, width - 1) : 0.5;
        var cy = alive[zoneIndex] > 0 ? (sumY[zoneIndex] / alive[zoneIndex]) / Math.max(1, height - 1) : 0.5;

        outlet(1, [
            "zone",
            zoneIndex,
            zoneDensity,
            zoneActivity,
            cx,
            cy,
            localBirths,
            localDeaths
        ]);
    }

    outlet(2, [
        "stats",
        generation,
        totalAlive,
        totalAlive / (width * height),
        activity
    ]);
}
