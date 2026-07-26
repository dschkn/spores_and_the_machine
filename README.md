# spores-and-the-machine

![The patch running in Max/MSP](images/interface.jpg)

**spores-and-the-machine** is a small Max/MSP study in cellular growth, decay and sonification.

The project begins with [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life), a zero-player cellular automaton devised by John Horton Conway in 1970. A field of living and dead cells changes in discrete generations according to the states of neighbouring cells. This patch uses those rules as a point of departure, then extends them into a three-state mold-like system in which cells emerge, gather into colonies, exhaust themselves, disappear and return as spores.

The grid is treated less as a score than as a synthetic organism. It is divided into four acoustic territories, each controlling a continuous stereo voice built from sine tones and noise:

- local activity controls amplitude;
- the vertical center of activity controls register;
- each territory occupies a different stereo position;
- quiet or stable regions fade out;
- the global test tone provides a direct check that Max's DSP output is working.

## Why it does not freeze immediately

Classic Conway rules naturally settle into still lifes and short oscillators, especially on a finite grid. This version adds:

- optional toroidal wrapping;
- a small probability of spontaneous spores;
- automatic reinjection when global activity remains close to zero;
- an alternative three-state `mold` mode: empty → growing → exhausted → empty.

These additions keep the system alive without replacing its internal behaviour with completely random motion.

## Requirements

- Max 8 or newer;
- no external packages;
- a working audio output selected in Max.

## How to run

1. Download or clone the repository.
2. Keep `spores-and-the-machine.maxpat`, `spores-and-the-machine.js`, and `spore.voice.maxpat` in the same folder.
3. Open `spores-and-the-machine.maxpat`. It opens directly in Presentation Mode.
4. Click **TEST TONE**. The patch enables DSP and plays a short 440 Hz tone.
5. Click `randomize`.
6. Turn on **RUN**.
7. Switch between `mode conway` and `mode mold`.

The two meters should move whenever the test tone or the cellular voices produce a signal. If the meters move but nothing is audible, select the correct output device under **Options → Audio Status**. If the meters remain still during **TEST TONE**, inspect the Max Console for an object-loading error.

You can stop the clock and draw cells directly into the matrix.

## Controls

- `randomize` creates a new colony;
- `cleargrid` clears both the visible matrix and the JavaScript state;
- `mode conway` uses the B3/S23 Game of Life rules;
- `mode mold` uses the three-state growth and decay system;
- `wrap 1` connects opposite edges of the field;
- `spores 0.00035` sets spontaneous growth probability;
- **STEP (MS)** controls generation speed;
- **MASTER** controls output level.

## Files

- `spores-and-the-machine.maxpat` — main patch and Presentation Mode interface;
- `spores-and-the-machine.js` — automaton, matrix updates and regional analysis;
- `spore.voice.maxpat` — one continuous regional sound voice;
- `images/interface.jpg` — a real screenshot of the patch running in Max/MSP;

## Scope

This is deliberately a compact project. It does not identify and track individual connected colonies. A future version could use connected-component analysis to map colony area, perimeter, age, splitting and merging to sound.

Created by Dmitrii Shchukin.  
(c) 2026 Dmitrii Shchukin.
