# Multi-state cellular automaton

## Design decision

The main project uses a discrete cellular field rather than contour-based soft bodies. This keeps the visual language connected to cellular automata, makes direct editing with `matrixctrl` possible, and reduces the amount of simulation state.

The model is artistic rather than biological. Terms such as spore, tissue, stress, and decay describe computational states, not literal cellular physiology.

## Grid

The default grid contains 120 columns and 60 rows. Each position stores:

- a state from 0 to 5;
- an integer age counting generations spent in the current state.

The engine uses flat arrays rather than nested row arrays.

## States

| Value | Name | Function |
|---:|---|---|
| 0 | empty | inactive medium |
| 1 | spore | new or germinating material |
| 2 | young | active growing tissue |
| 3 | mature | relatively stable tissue |
| 4 | stressed | unstable tissue that may recover or decay |
| 5 | decay | refractory state before returning to empty |

## Colony rule

Every generation reads the eight neighbouring positions.

Empty cells can become spores when the local combination of young and mature neighbours supports growth. A low spontaneous probability may also generate a spore.

Spores remain briefly in the germinating state. With enough nearby activity they become young tissue; isolated spores decay.

Young tissue matures after several generations when local density remains viable. Isolation and severe overcrowding create stress.

Mature tissue survives inside a moderate neighbourhood. It becomes stressed or decays when the local structure is too sparse, too dense, or surrounded by stressed material.

Stressed tissue may recover near mature neighbours, otherwise it moves into decay. Decay lasts briefly and then becomes empty.

## Directional drift

Colony growth receives a small spatial and temporal bias from two summed sinusoidal fields. This does not move existing cells. It changes the probability that suitable empty boundary positions become spores.

The control `DRIFT` scales this bias:

- `0` leaves local rules nearly isotropic;
- values around `0.5` create slow directional changes;
- `1` strongly favours moving growth fronts.

## Initialization

`NEW FIELD` creates irregular circular groups rather than independent random cells. The interior is mature and the edge is young. Overlapping seeds can merge into larger structures.

`inject 2` inserts two smaller colonies into the current field.

## Excitable rule

The excitable mode uses a refractory cycle:

`spore → young → mature → stressed → decay → empty`

Neighbouring young states initiate new spores. This creates wave fronts, collisions, rings, and broken pulses.

## Regional analysis

The field is divided into six regions. During the main simulation pass, the engine measures:

- active density;
- changed-cell activity;
- horizontal and vertical centroid;
- births;
- deaths;
- young proportion;
- mature proportion;
- decay proportion;
- boundary proportion.

No connected-component tracking is performed. A region may contain several separate colonies.

## Sound mapping

Each region controls a `field.voice` abstraction.

The voice combines:

1. a low or mid resonant click stream;
2. a second brittle click stream;
3. two filtered noise bands;
4. a short sine-grain process;
5. a quiet mature-tissue filament;
6. event accents.

A global `weather.voice` adds system-wide noise and sparse random sine points.

The analysis is intentionally many-to-many. One visual parameter can influence several sound layers, and one sound layer can depend on several visual measurements. This produces a more polyphonic texture than a one-cell-one-note mapping.

## Scheduler and rendering

The main patch uses `qmetro`. Only changed cells are sent back to `matrixctrl`, in bounded message chunks.

The analysis is calculated during state generation. The engine does not perform a second full-grid analysis pass after every step.
