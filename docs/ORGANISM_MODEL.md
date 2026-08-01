# Organism mode

The advanced patch is not a literal molecular or medical simulation. It is a compact, performable model of deformable multi-pixel organisms designed for Max/MSP and sound work.

## Representation

The field is a 160 × 90 lattice. A single organism occupies many lattice cells and owns a unique integer ID. Its visible body contains four functional layers:

- **cytoplasm**: the darker interior of the body;
- **membrane**: bright boundary cells touching the surrounding medium;
- **nucleus**: a small pale marker following the organism's center of mass;
- **polarity point**: a magenta marker showing the current direction of movement.

The environment also contains an amber food field. Food diffuses slowly, is consumed under the body, and is released again when an organism dies.

## Motion

Each organism maintains a polarity vector. The vector has inertia, receives a small stochastic mutation, and is biased toward stronger food concentrations. Movement is produced by local deformation rather than translation:

1. boundary cells at the front are allowed to protrude into empty space;
2. boundary cells at the rear retract;
3. the target area keeps the body from expanding or collapsing without limit;
4. a conservative neighbour check reduces accidental fragmentation.

The result is an amoeba-like crawl. It is deliberately softer and less rigid than moving a circular sprite around the screen.

## Energy and metabolism

Food raises energy. Every generation consumes a small amount of energy depending on metabolism and body size. Energy controls target area, sonic amplitude, and the likelihood of continued movement.

Low-energy organisms shrink. When energy or area becomes critically low, the body dissolves and part of its material returns to the food field.

## Division

An organism may divide when it is sufficiently old, energetic, and large. The body is split across an axis perpendicular to its polarity. Each half receives a separate ID, acoustic voice slot, energy reserve, and movement direction.

This is a simplified artistic model. It does not calculate chromosomes, mitosis phases, organelles, or membrane chemistry.

## Sonification

Up to eight organism voices run simultaneously. Each voice combines:

- irregular resonant `click~` impulses for membrane activity;
- short `cycle~` grain layers for thin nucleus-like points;
- a quiet low oscillator for body mass;
- event accents for feeding, division, and death.

Mappings:

- vertical position → spectral register, about 55 Hz to 12 kHz;
- horizontal position → stereo position;
- area → body frequency and mass;
- speed → click rate;
- membrane roughness → resonance and irregularity;
- energy → loudness and continuity;
- feeding, division, death → transient accents.

## Performance notes

The default step is 90 ms. Faster rates are possible, but the model redraws a 160 × 90 RGBA matrix and calculates food diffusion in JavaScript. Lower the frame rate before increasing the field dimensions. Max remains a music environment, not a secret supercomputer disguised as a grey patcher.
