# Spores and the machine

*A cellular automaton reconstructed and sonified anew in Max/MSP.*

<p align="center">
  <img src="images/interface-v05.svg" alt="Spores and the machine running in Max/MSP" width="100%">
</p>

## About

**Spores and the machine** is a Max/MSP study of cellular growth, decay, motion, and sound. The repository now contains two related instruments:

- `spores-and-the-machine.maxpat` preserves the original Conway/mold reconstruction;
- `spores-organisms.maxpat` develops the idea into deformable, multi-pixel organisms with nuclei, membranes, food, metabolism, division, death, and individual acoustic voices.

The project begins with [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life), a zero-player cellular automaton devised by John Horton Conway in 1970. In the classical version, each location on the grid is either alive or dead and changes according to its eight neighbours. The rule is commonly written as **B3/S23**: birth with three neighbours, survival with two or three.

## Classic cellular mode

The original patch extends Conway's rule with optional toroidal wrapping, rare spontaneous spores, automatic reinjection after prolonged inactivity, and a three-state `mold` mode:

`empty → growing → exhausted → empty`

Its matrix is divided into acoustic territories containing layered `click~` streams, resonant filters, and short `cycle~` grains.

## Organism mode

Open `spores-organisms.maxpat` for the advanced model.

The field is enlarged to **160 × 90** cells. A visible organism is no longer a single point: it occupies many lattice positions under one ID and behaves as one deformable body.

Colors indicate different functions:

- bright organism color: membrane;
- darker organism color: cytoplasm;
- pale center: nucleus;
- magenta point: movement polarity;
- amber field: diffusing food.

Each organism:

- senses nearby food and develops a direction of movement;
- protrudes at the front and retracts at the rear;
- consumes food and spends energy through metabolism;
- changes area and membrane roughness;
- can divide into two organisms;
- shrinks and dissolves when energy is exhausted.

This is an artistic, computationally light model inspired by deformable-cell systems. It is not a medical or molecular simulation.

## Organism sonification

Up to eight organisms receive independent stereo voices. A voice combines resonant click layers, thin sine grains, a quiet body oscillator, and event accents.

- vertical position controls frequency from roughly 55 Hz to 12 kHz;
- horizontal position controls stereo placement;
- area controls sonic mass and body frequency;
- speed controls click density;
- membrane roughness controls resonance and irregularity;
- energy controls loudness;
- feeding, division, and death create separate accents.

One organism therefore has one audible identity instead of being reduced to thousands of unrelated pixels. Humanity has finally granted administrative unity to an amoeba.

## Requirements

- Max 8 or newer;
- no external packages;
- a working audio output selected in Max.

## Running organism mode

1. Download or clone the repository.
2. Keep `spores-organisms.maxpat`, `organism-engine.js`, and `organism.voice.maxpat` in the same folder.
3. Open `spores-organisms.maxpat`. It opens in Presentation Mode.
4. Enable the loudspeaker button.
5. Turn on **RUN**.
6. Use `reset 6` or `reset 8` to create a new population.
7. Use `addfood 14` to add nutrient clusters.
8. Adjust **FOOD RATE**, **MUTATION**, **STEP (MS)**, and **MASTER**.

The default step is 90 ms. A slower step is recommended if the interface becomes heavy.

## Files

- `spores-and-the-machine.maxpat` — classic Conway/mold instrument;
- `spores-and-the-machine.js` — classic automaton engine;
- `spore.voice.maxpat` — classic territory voice;
- `spores-organisms.maxpat` — advanced organism interface;
- `organism-engine.js` — deformable-body simulation, food field, lifecycle, and rendering;
- `organism.voice.maxpat` — one organism's acoustic body;
- `presets/organism-defaults.json` — default simulation values;
- `docs/ORGANISM_MODEL.md` — model and mapping notes.

Created by Dmitrii Shchukin.  
(c) 2026 Dmitrii Shchukin.
