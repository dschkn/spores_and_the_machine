autowatch = 1;
inlets = 1;
outlets = 3;

// Large multi-state cellular automaton for Max 8.
// outlet 0: matrixctrl updates: "set x y value ..."
// outlet 1: acoustic regions:
//   "zone index density activity cx cy births deaths young mature decay edge"
// outlet 2: global statistics:
//   "stats generation active density activity births deaths"

var width = 120;
var height = 60;
var zoneColumns = 3;
var zoneRows = 2;

var EMPTY = 0;
var SPORE = 1;
var YOUNG = 2;
var MATURE = 3;
var STRESSED = 4;
var DECAY = 5;

var modeName = "colony";
var initialColonies = 18;
var wrapEdges = 1;
var sporeChance = 0.00008;
var driftAmount = 0.55;
var autoSeed = 1;
var quietFrames = 0;
var quietLimit = 18;
var generation = 0;

var size = width * height;
var grid = [];
var age = [];
var nextGrid = [];
var nextAge = [];

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}

function indexOf(x, y) {
    return y * width + x;
}

function makeArray(length, value) {
    var result = new Array(length);
    var i;
    for (i = 0; i < length; i++) result[i] = value;
    return result;
}

function resetBuffers() {
    size = width * height;
    grid = makeArray(size, 0);
    age = makeArray(size, 0);
    nextGrid = makeArray(size, 0);
    nextAge = makeArray(size, 0);
}

function loadbang() {
    randomize(initialColonies);
}

function dimensions(w, h) {
    width = clamp(Math.floor(w), 80, 200);
    height = clamp(Math.floor(h), 40, 110);
    resetBuffers();
    randomize(initialColonies);
}

function mode(name) {
    if (name !== "colony" && name !== "conway" && name !== "excitable") {
        post("spores-and-the-machine.js: mode must be colony, conway or excitable\n");
        return;
    }
    modeName = name;
    randomize(initialColonies);
}

function wrap(value) {
    wrapEdges = value > 0 ? 1 : 0;
}

function spores(value) {
    sporeChance = clamp(parseFloat(value), 0.0, 0.02);
}

function drift(value) {
    driftAmount = clamp(parseFloat(value), 0.0, 1.0);
}

function colonies(value) {
    initialColonies = clamp(Math.floor(value), 1, 80);
}

function autoseed(value) {
    autoSeed = value > 0 ? 1 : 0;
}

function cleargrid() {
    resetBuffers();
    generation = 0;
    quietFrames = 0;
    outlet(0, "clear");
    outputEmptyAnalysis();
}

function randomize(value) {
    var amount = arguments.length ? Math.floor(value) : initialColonies;
    initialColonies = clamp(amount, 1, 80);
    resetBuffers();
    generation = 0;
    quietFrames = 0;

    if (modeName === "conway") {
        seedNoise(0.16);
    } else if (modeName === "excitable") {
        seedExcitable(initialColonies);
    } else {
        seedColonies(initialColonies);
    }

    drawAll();
    analyseCurrent(0);
}

function seedNoise(density) {
    var i;
    for (i = 0; i < size; i++) {
        if (Math.random() < density) {
            grid[i] = MATURE;
            age[i] = Math.floor(Math.random() * 4);
        }
    }
}

function seedExcitable(count) {
    var i;
    for (i = 0; i < count; i++) {
        var cx = 3 + Math.floor(Math.random() * Math.max(1, width - 6));
        var cy = 3 + Math.floor(Math.random() * Math.max(1, height - 6));
        seedBlob(cx, cy, 1 + Math.floor(Math.random() * 3), SPORE, YOUNG);
    }
}

function seedColonies(count) {
    var i;
    for (i = 0; i < count; i++) {
        var cx = 5 + Math.floor(Math.random() * Math.max(1, width - 10));
        var cy = 5 + Math.floor(Math.random() * Math.max(1, height - 10));
        var radius = 2 + Math.floor(Math.random() * 6);
        seedBlob(cx, cy, radius, YOUNG, MATURE);
    }
}

function seedBlob(cx, cy, radius, outerState, innerState) {
    var x;
    var y;
    var phase = Math.random() * Math.PI * 2;

    for (y = cy - radius - 2; y <= cy + radius + 2; y++) {
        for (x = cx - radius - 2; x <= cx + radius + 2; x++) {
            if (x < 0 || y < 0 || x >= width || y >= height) continue;

            var dx = x - cx;
            var dy = y - cy;
            var angle = Math.atan2(dy, dx);
            var wobble =
                Math.sin(angle * 3 + phase) * 0.75 +
                Math.sin(angle * 5 - phase * 0.7) * 0.35;

            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= radius + wobble) {
                var idx = indexOf(x, y);
                grid[idx] = distance < radius * 0.62 ? innerState : outerState;
                age[idx] = Math.floor(Math.random() * 3);
            }
        }
    }
}

function injectColonies(count) {
    var i;
    for (i = 0; i < count; i++) {
        var cx = 4 + Math.floor(Math.random() * Math.max(1, width - 8));
        var cy = 4 + Math.floor(Math.random() * Math.max(1, height - 8));
        seedBlob(cx, cy, 1 + Math.floor(Math.random() * 3), SPORE, YOUNG);
    }
    drawAll();
}

function inject(value) {
    injectColonies(arguments.length ? Math.floor(value) : 2);
    analyseCurrent(0);
}

function cell(x, y, value) {
    x = Math.floor(x);
    y = Math.floor(y);
    value = clamp(Math.floor(value), 0, DECAY);

    if (x < 0 || y < 0 || x >= width || y >= height) return;

    var idx = indexOf(x, y);
    grid[idx] = value;
    age[idx] = 0;
    outlet(0, ["set", x, y, value]);
}

function isActive(state) {
    return state === SPORE ||
        state === YOUNG ||
        state === MATURE ||
        state === STRESSED;
}

function nextConwayState(current, activeNeighbours) {
    var alive = isActive(current);
    if (alive) return (activeNeighbours === 2 || activeNeighbours === 3) ? MATURE : EMPTY;
    return activeNeighbours === 3 ? MATURE : EMPTY;
}

function nextExcitableState(current, activeNeighbours, youngNeighbours) {
    if (current === EMPTY) {
        return (youngNeighbours === 2 || Math.random() < sporeChance) ? SPORE : EMPTY;
    }
    if (current === SPORE) return YOUNG;
    if (current === YOUNG) return MATURE;
    if (current === MATURE) return STRESSED;
    if (current === STRESSED) return DECAY;
    return EMPTY;
}

function nextColonyState(
    current,
    currentAge,
    activeNeighbours,
    youngNeighbours,
    matureNeighbours,
    stressedNeighbours,
    x,
    y
) {
    var growthNeighbours = youngNeighbours + matureNeighbours;
    var phase = generation * 0.027;
    var flow =
        0.5 +
        0.25 * Math.sin(x * 0.115 + y * 0.071 + phase) +
        0.25 * Math.sin(x * 0.049 - y * 0.137 - phase * 0.63);

    flow = clamp(flow, 0, 1);

    if (current === EMPTY) {
        var directedBirth =
            growthNeighbours === 3 ||
            (growthNeighbours === 2 &&
                matureNeighbours > 0 &&
                Math.random() < 0.05 + flow * driftAmount * 0.34);

        if (directedBirth || Math.random() < sporeChance) return SPORE;
        return EMPTY;
    }

    if (current === SPORE) {
        if (currentAge < 1) return SPORE;
        return (activeNeighbours >= 1 && activeNeighbours <= 6) ? YOUNG : DECAY;
    }

    if (current === YOUNG) {
        if (activeNeighbours === 0 || activeNeighbours >= 7) return STRESSED;
        if (currentAge >= 2 && activeNeighbours >= 2) return MATURE;
        return YOUNG;
    }

    if (current === MATURE) {
        if (activeNeighbours < 2) return STRESSED;
        if (activeNeighbours > 6) return DECAY;
        if (stressedNeighbours >= 3 && Math.random() < 0.28) return STRESSED;
        return MATURE;
    }

    if (current === STRESSED) {
        if (currentAge < 2 &&
            activeNeighbours >= 2 &&
            activeNeighbours <= 4 &&
            matureNeighbours > 0 &&
            Math.random() < 0.32) {
            return YOUNG;
        }
        return currentAge >= 2 ? DECAY : STRESSED;
    }

    return currentAge >= 1 ? EMPTY : DECAY;
}

function bang() {
    if (!grid.length) {
        randomize(initialColonies);
        return;
    }

    var zoneCount = zoneColumns * zoneRows;
    var zoneActive = makeArray(zoneCount, 0);
    var zoneChanges = makeArray(zoneCount, 0);
    var zoneBirths = makeArray(zoneCount, 0);
    var zoneDeaths = makeArray(zoneCount, 0);
    var zoneYoung = makeArray(zoneCount, 0);
    var zoneMature = makeArray(zoneCount, 0);
    var zoneDecay = makeArray(zoneCount, 0);
    var zoneEdges = makeArray(zoneCount, 0);
    var zoneSumX = makeArray(zoneCount, 0);
    var zoneSumY = makeArray(zoneCount, 0);

    var changed = [];
    var totalChanges = 0;
    var totalActive = 0;
    var totalBirths = 0;
    var totalDeaths = 0;

    var x;
    var y;

    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            var idx = indexOf(x, y);
            var current = grid[idx];

            var nSpore = 0;
            var nYoung = 0;
            var nMature = 0;
            var nStressed = 0;
            var nDecay = 0;

            var dx;
            var dy;

            for (dy = -1; dy <= 1; dy++) {
                for (dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;

                    var nx = x + dx;
                    var ny = y + dy;

                    if (wrapEdges) {
                        nx = (nx + width) % width;
                        ny = (ny + height) % height;
                    } else if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                        continue;
                    }

                    var neighbour = grid[indexOf(nx, ny)];
                    if (neighbour === SPORE) nSpore++;
                    else if (neighbour === YOUNG) nYoung++;
                    else if (neighbour === MATURE) nMature++;
                    else if (neighbour === STRESSED) nStressed++;
                    else if (neighbour === DECAY) nDecay++;
                }
            }

            var activeNeighbours = nSpore + nYoung + nMature + nStressed;

            var next;
            if (modeName === "conway") {
                next = nextConwayState(current, activeNeighbours);
            } else if (modeName === "excitable") {
                next = nextExcitableState(current, activeNeighbours, nSpore + nYoung);
            } else {
                next = nextColonyState(
                    current,
                    age[idx],
                    activeNeighbours,
                    nYoung,
                    nMature,
                    nStressed,
                    x,
                    y
                );
            }

            nextGrid[idx] = next;
            nextAge[idx] = next === current ? age[idx] + 1 : 0;

            var zoneX = Math.min(zoneColumns - 1, Math.floor(x * zoneColumns / width));
            var zoneY = Math.min(zoneRows - 1, Math.floor(y * zoneRows / height));
            var zone = zoneY * zoneColumns + zoneX;

            if (next !== current) {
                changed.push(x, y, next);
                zoneChanges[zone]++;
                totalChanges++;

                if (!isActive(current) && isActive(next)) {
                    zoneBirths[zone]++;
                    totalBirths++;
                }

                if (isActive(current) && !isActive(next)) {
                    zoneDeaths[zone]++;
                    totalDeaths++;
                }
            }

            if (isActive(next)) {
                zoneActive[zone]++;
                zoneSumX[zone] += x;
                zoneSumY[zone] += y;
                totalActive++;

                if (next === SPORE || next === YOUNG) zoneYoung[zone]++;
                if (next === MATURE) zoneMature[zone]++;
                if (next === STRESSED) zoneDecay[zone]++;

                if (activeNeighbours < 7) zoneEdges[zone]++;
            } else if (next === DECAY) {
                zoneDecay[zone]++;
            }
        }
    }

    var swapGrid = grid;
    grid = nextGrid;
    nextGrid = swapGrid;

    var swapAge = age;
    age = nextAge;
    nextAge = swapAge;

    generation++;
    outputChangedCells(changed);

    var activity = totalChanges / size;

    if (activity < 0.0012) quietFrames++;
    else quietFrames = 0;

    if (autoSeed && quietFrames >= quietLimit) {
        injectColonies(2);
        quietFrames = 0;
    }

    outputAnalysis(
        activity,
        totalActive,
        totalBirths,
        totalDeaths,
        zoneActive,
        zoneChanges,
        zoneBirths,
        zoneDeaths,
        zoneYoung,
        zoneMature,
        zoneDecay,
        zoneEdges,
        zoneSumX,
        zoneSumY
    );
}

function outputChangedCells(triples) {
    var triplesPerMessage = 180;
    var stride = triplesPerMessage * 3;
    var start;

    for (start = 0; start < triples.length; start += stride) {
        var message = ["set"];
        var end = Math.min(start + stride, triples.length);
        var i;

        for (i = start; i < end; i++) message.push(triples[i]);
        outlet(0, message);
    }
}

function drawAll() {
    var y;
    var x;

    for (y = 0; y < height; y++) {
        var message = ["set"];
        for (x = 0; x < width; x++) {
            message.push(x, y, grid[indexOf(x, y)]);
        }
        outlet(0, message);
    }
}

function outputEmptyAnalysis() {
    var zoneCount = zoneColumns * zoneRows;
    var zeros = makeArray(zoneCount, 0);

    outputAnalysis(
        0, 0, 0, 0,
        zeros, zeros, zeros, zeros,
        zeros, zeros, zeros, zeros,
        zeros, zeros
    );
}

function analyseCurrent(activity) {
    var zoneCount = zoneColumns * zoneRows;
    var zoneActive = makeArray(zoneCount, 0);
    var zoneChanges = makeArray(zoneCount, 0);
    var zoneBirths = makeArray(zoneCount, 0);
    var zoneDeaths = makeArray(zoneCount, 0);
    var zoneYoung = makeArray(zoneCount, 0);
    var zoneMature = makeArray(zoneCount, 0);
    var zoneDecay = makeArray(zoneCount, 0);
    var zoneEdges = makeArray(zoneCount, 0);
    var zoneSumX = makeArray(zoneCount, 0);
    var zoneSumY = makeArray(zoneCount, 0);

    var totalActive = 0;
    var x;
    var y;

    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            var state = grid[indexOf(x, y)];
            var zoneX = Math.min(zoneColumns - 1, Math.floor(x * zoneColumns / width));
            var zoneY = Math.min(zoneRows - 1, Math.floor(y * zoneRows / height));
            var zone = zoneY * zoneColumns + zoneX;

            if (isActive(state)) {
                zoneActive[zone]++;
                zoneSumX[zone] += x;
                zoneSumY[zone] += y;
                totalActive++;

                if (state === SPORE || state === YOUNG) zoneYoung[zone]++;
                if (state === MATURE) zoneMature[zone]++;
                if (state === STRESSED) zoneDecay[zone]++;
            } else if (state === DECAY) {
                zoneDecay[zone]++;
            }
        }
    }

    outputAnalysis(
        activity, totalActive, 0, 0,
        zoneActive, zoneChanges, zoneBirths, zoneDeaths,
        zoneYoung, zoneMature, zoneDecay, zoneEdges,
        zoneSumX, zoneSumY
    );
}

function outputAnalysis(
    activity,
    totalActive,
    totalBirths,
    totalDeaths,
    zoneActive,
    zoneChanges,
    zoneBirths,
    zoneDeaths,
    zoneYoung,
    zoneMature,
    zoneDecay,
    zoneEdges,
    zoneSumX,
    zoneSumY
) {
    var zoneCount = zoneColumns * zoneRows;
    var zoneArea = size / zoneCount;
    var zoneIndex;

    for (zoneIndex = 0; zoneIndex < zoneCount; zoneIndex++) {
        var active = zoneActive[zoneIndex];
        var densityValue = clamp(active / zoneArea, 0, 1);
        var activityValue = clamp(zoneChanges[zoneIndex] / zoneArea, 0, 1);

        var cx = active > 0
            ? (zoneSumX[zoneIndex] / active) / Math.max(1, width - 1)
            : (zoneIndex % zoneColumns + 0.5) / zoneColumns;

        var cy = active > 0
            ? (zoneSumY[zoneIndex] / active) / Math.max(1, height - 1)
            : (Math.floor(zoneIndex / zoneColumns) + 0.5) / zoneRows;

        var youngRatio = active > 0 ? zoneYoung[zoneIndex] / active : 0;
        var matureRatio = active > 0 ? zoneMature[zoneIndex] / active : 0;
        var decayRatio = clamp(zoneDecay[zoneIndex] / zoneArea, 0, 1);
        var edgeRatio = active > 0 ? zoneEdges[zoneIndex] / active : 0;

        outlet(1, [
            "zone",
            zoneIndex,
            densityValue,
            activityValue,
            cx,
            cy,
            zoneBirths[zoneIndex],
            zoneDeaths[zoneIndex],
            youngRatio,
            matureRatio,
            decayRatio,
            edgeRatio
        ]);
    }

    outlet(2, [
        "stats",
        generation,
        totalActive,
        totalActive / size,
        activity,
        totalBirths,
        totalDeaths
    ]);
}
