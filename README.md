# Spores and the machine

*A multi-state cellular automaton reconstructed and sonified in Max/MSP.*

## About

**Spores and the machine** is a compact Max/MSP instrument built around a large `matrixctrl` field, local cellular rules, and layered real-time sonification.

The main instrument deliberately returns to a cellular automaton rather than attempting to imitate complete biological organisms. The field is still capable of producing large colonies, moving fronts, cavities, branching tissues, waves, and decay, but every visible form emerges from local interactions between cells.

The repository also retains the earlier contour-based organism experiment in `spores-organisms.maxpat`. It is no longer the main version.

## Cellular field

The main matrix is **120 × 60**, larger than the original 100 × 50 field while remaining practical inside Max.

A cell can occupy six states:

- `0` — empty;
- `1` — spore;
- `2` — young growth;
- `3` — mature tissue;
- `4` — stressed tissue;
- `5` — decay.

`matrixctrl` displays these states as different intensities of the active color.

### Colony mode

`mode colony` is the default. Randomization creates groups rather than independent points. Each group begins as a small irregular body with a young outer region and a mature interior.

Local rules then control:

- germination;
- growth;
- maturation;
- stress;
- recovery;
- overcrowding;
- isolation;
- decay;
- directional budding.

A slowly moving mathematical flow field biases some births. The result is not literal cell movement: the colony changes by growing at some edges and disappearing at others.

### Excitable mode

`mode excitable` produces propagating fronts. Cells pass through the sequence:

`spore → young → mature → stressed → decay → empty`

New spores appear near suitable active neighbours, producing waves, rings, collisions, and broken fronts.

### Conway mode

`mode conway` keeps the classical B3/S23 Game of Life behaviour. The project begins historically with [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life), but the default colony mode extends the field into a multi-state system.

## Sonification

The matrix is divided into **six acoustic regions** arranged as three columns by two rows.

Each region controls one `field.voice.maxpat` instance containing:

- two independent irregular `click~` streams;
- resonant filters tuned from the region's vertical position;
- a filtered noise layer for rustle and particulate motion;
- sparse short `cycle~` grains;
- a very quiet sinusoidal filament associated with mature tissue;
- separate transient accents for births and deaths.

A seventh global layer, `weather.voice.maxpat`, listens to the whole matrix and adds broad rustle, high sine dust, and system-wide event accents.

Mappings:

- vertical position → spectral register, roughly 45 Hz to 12 kHz;
- horizontal position → stereo position;
- local density → loudness and click probability;
- local activity → event rate;
- young tissue → brittle impulses and sine grains;
- mature tissue → tonal continuity;
- stress and decay → filtered noise;
- boundary proportion → resonance and spectral spread;
- births and deaths → accent impulses.

The purpose is not to assign one oscillator to every point. The automaton is analysed regionally so the sound can remain layered without turning the computer into a very expensive radiator.

## Requirements

- Max 8 or newer;
- no external packages;
- a working audio output selected in Max.

## How to run

1. Download or clone the repository.
2. Keep these files in the same folder:
   - `spores-and-the-machine.maxpat`
   - `spores-and-the-machine.js`
   - `field.voice.maxpat`
   - `weather.voice.maxpat`
3. Open `spores-and-the-machine.maxpat`.
4. Click **TEST TONE** and confirm that the meters move.
5. Enable the loudspeaker button.
6. Turn on **RUN**.
7. Use **NEW FIELD** to generate a new set of colonies.
8. Switch between `mode colony`, `mode excitable`, and `mode conway`.

Recommended initial values:

- `STEP (MS)`: `95`;
- `COLONIES`: `18`;
- `SPORE RATE`: `0.00008`;
- `DRIFT`: `0.55`;
- `MASTER`: `0.62`.

## Controls

- **RUN** starts and stops the cellular clock;
- **STEP (MS)** changes simulation speed;
- **NEW FIELD** regenerates the field using the displayed colony count;
- `cleargrid` clears the automaton;
- `inject 2` inserts two small active colonies;
- `mode colony` selects the six-state colony rule;
- `mode excitable` selects the propagating wave rule;
- `mode conway` selects B3/S23;
- `wrap 1` connects opposite edges of the matrix;
- **SPORE RATE** controls rare spontaneous births;
- **DRIFT** controls directional bias in colony growth;
- **MASTER** controls output amplitude.

The matrix can also be edited directly with the mouse while the clock is stopped.

## Performance

The engine uses flat one-dimensional arrays and updates only changed `matrixctrl` cells. Regional sound statistics are collected during the same simulation pass, avoiding another full scan after every generation.

The default 95 ms step is intentionally moderate. Increase it to 120–160 ms if the Max scheduler becomes busy.

## Files

- `spores-and-the-machine.maxpat` — main Presentation Mode instrument;
- `spores-and-the-machine.js` — multi-state cellular engine and regional analysis;
- `field.voice.maxpat` — one regional click, rustle, and sine voice;
- `weather.voice.maxpat` — global environmental sound layer;
- `presets/cellular-defaults.json` — recommended starting values;
- `docs/MULTISTATE_AUTOMATON.md` — algorithm and mapping notes;
- `spores-organisms.maxpat` — retained experimental organism version.

Created by Dmitrii Shchukin.  
(c) 2026 Dmitrii Shchukin.
