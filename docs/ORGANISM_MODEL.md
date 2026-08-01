# Organism mode

The advanced patch is not a literal molecular or medical simulation. It is a compact, performable model of deformable organisms designed for Max/MSP and sound work.

## Representation

The display remains a **160 × 90** RGBA matrix, but an organism is no longer stored as a mutable cloud of occupied pixels.

Each organism is represented by one closed radial contour. Depending on performance mode, the contour contains 20, 28, or 36 points. The polygon is filled during rendering, producing four visible functional layers:

- **cytoplasm**: the darker filled interior;
- **membrane**: the bright continuous contour;
- **nucleus**: a pale body with its own inertia;
- **polarity point**: a magenta marker showing movement direction.

Because the membrane is one closed polygon, a body cannot fragment into disconnected islands. The outline may stretch, pulse, flatten, and form temporary protrusions, but it remains topologically continuous.

The environment also contains an amber nutrient field. It is calculated internally at **80 × 45**, half the display resolution, then sampled into the visible matrix. This is much cheaper than diffusing nutrients across every displayed pixel.

## Motion and shape

Each organism maintains a polarity vector with inertia. The vector is biased toward stronger nearby nutrient concentrations and receives a controlled stochastic mutation.

Motion combines:

1. a forward velocity following polarity;
2. a larger target radius on the front side;
3. gentle contraction at the rear;
4. several slowly moving radial harmonics;
5. smoothing between neighbouring contour points;
6. soft repulsion between organisms.

The organism therefore moves as a deforming body rather than as a rigid sprite, while the membrane remains closed.

## Nucleus

The nucleus does not sit exactly at the mathematical centre. It follows the organism through a small spring-like lag and tends to remain slightly behind the direction of movement. This produces visible internal inertia when the membrane changes direction.

## Energy and metabolism

Food raises energy. Every generation consumes a small amount of energy based on metabolism, body radius, and movement.

Energy controls:

- target body radius;
- sonic amplitude;
- movement strength;
- the possibility of division;
- survival.

When energy becomes critically low, the organism dies and releases nutrients back into the field.

## Division

An organism may divide when it is old, energetic, and large enough. A child body is created beside the parent on an axis perpendicular to movement. Both receive separate IDs, voice slots, contours, energy reserves, and polarity vectors.

This is a simplified artistic model. It does not calculate chromosomes, mitosis phases, organelles, or membrane chemistry.

## Sonification

Up to eight organism voices may exist, although five are loaded by default for a lighter patch.

Each voice contains:

- two irregular resonant `click~` streams;
- one short `cycle~` grain layer;
- one transient event layer for feeding, division, and death.

Mappings:

- vertical position → spectral register, about 70 Hz to 11 kHz;
- horizontal position → stereo position;
- polygon area → sonic mass;
- movement speed → click rate;
- contour variation → resonance and irregularity;
- energy → loudness;
- feeding, division, death → transient accents.

## Performance modes

- `quality low`: 20 contour points, rendering every three steps;
- `quality medium`: 28 contour points, rendering every two steps;
- `quality high`: 36 contour points, rendering every step.

The patch uses `qmetro` rather than high-priority `metro`, so visual work can be deferred when Max is busy with audio.

The default configuration is five organisms, a 120 ms step, and `quality medium`. Use `quality low` with a 140–180 ms step for the lightest operation.

See `PERFORMANCE_REFACTOR.md` for the implementation details.

Created by Dmitrii Shchukin.  
(c) 2026 Dmitrii Shchukin.
