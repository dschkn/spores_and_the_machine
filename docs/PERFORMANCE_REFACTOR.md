# Organism mode: performance and membrane refactor

## Why the previous version was heavy

The first organism engine stored every organism as a mutable list of occupied grid cells. During each generation it repeatedly scanned those lists to find boundaries, estimate roughness, choose growth and retraction points, test neighbours, consume food, render the result, and send audio control data. At 160 × 90 pixels and up to eight organisms, the same local geometry was recalculated many times per frame.

The food field was also simulated at the full display resolution, and the main patch used a high-priority `metro`. This allowed visual work to compete directly with audio scheduling and the Max interface.

## New representation

Each organism is now a closed soft-body contour rather than a loose collection of pixels.

- the contour contains 20, 28, or 36 radial points depending on quality mode;
- neighbouring radii are smoothed on every update;
- harmonic deformations and front/rear polarity create amoeba-like motion;
- the contour is filled with a scanline renderer;
- the membrane is drawn as a continuous bright line;
- the cytoplasm is a darker filled region;
- the nucleus follows the body with inertia.

Because the body is generated from one closed polygon, it cannot fragment into disconnected islands. Growth, contraction, movement, and division change the contour itself rather than adding and deleting unrelated pixels.

## Reduced simulation cost

The visual matrix remains 160 × 90, but the nutrient field is calculated internally at 80 × 45. The result is sampled back into the display only when a frame is rendered.

The default `medium` mode uses:

- 28 contour points per organism;
- one visual render every two simulation steps;
- one audio/state update every two simulation steps;
- food diffusion every four simulation steps;
- five organisms at startup;
- a 120 ms `qmetro` clock.

The main patch now uses `qmetro`, allowing Max to defer visual work when the scheduler is busy instead of freezing the interface or interrupting audio.

## Performance modes

### `quality low`

- 20 contour points;
- rendering every three steps;
- state output every three steps;
- food diffusion every six steps.

Use this mode when running eight organisms, recording audio, or working on an older machine.

### `quality medium`

- 28 contour points;
- rendering every two steps;
- state output every two steps;
- food diffusion every four steps.

This is the default and should be the best balance for normal use.

### `quality high`

- 36 contour points;
- rendering every step;
- state output every step;
- food diffusion every three steps.

This mode produces the smoothest outlines but is intended for screenshots or short captures rather than long sessions.

## Audio changes

Each organism voice was reduced from several continuously running layers to:

- two irregular `click~` streams;
- two resonant filters;
- one short `cycle~` grain layer;
- one event accent for feeding, division, and death.

The voices now use `qmetro` for event scheduling. The spatial and biological mappings remain the same, but unused complexity and continuous low-frequency oscillators were removed.

## Recommended settings

Start with:

- `quality medium`;
- `reset 5`;
- `STEP (MS) = 120`;
- `FOOD = 0.010`;
- `MUTATION = 0.12`;
- `MASTER = 0.38`.

For the lightest configuration use `quality low`, `reset 5`, and `STEP (MS)` between 140 and 180.

Created by Dmitrii Shchukin.  
(c) 2026 Dmitrii Shchukin.
