# spores-and-the-machine

![Max/MSP interface](images/interface.png)

**spores-and-the-machine** is a small Max/MSP study in cellular growth, decay and sonification.

The project begins with Conway's Game of Life and extends it into a three-state mold-like automaton. The grid is treated less as a score and more as a synthetic organism: cells emerge, gather into colonies, exhaust themselves, disappear and return as spores.

The matrix is divided into four acoustic territories. Each territory drives an embedded stereo voice made from short sine grains, clicks and filtered noise:

- local activity controls amplitude;
- the vertical center of activity controls register;
- each territory occupies a different stereo position;
- stable or dead regions become silent because the sound follows change rather than mere existence.

## Why the automaton no longer freezes immediately

Classic Conway rules naturally settle into still lifes and short oscillators, especially on a finite grid. This version adds:

- optional toroidal wrapping;
- a very small probability of spontaneous spores;
- automatic reinjection when global activity remains close to zero;
- an alternative three-state `mold` mode: empty → growing → exhausted → empty.

These additions keep the system alive without turning it into completely random noise.

## Requirements

- Max 8 or newer;
- no external packages;
- audio output configured in Max.

## How to run

1. Download or clone the repository.
2. Keep `spores-and-the-machine.maxpat` and `spores-and-the-machine.js` in the same folder.
3. Open `spores-and-the-machine.maxpat` in Max.
4. Click **AUDIO TEST**. Then click `ezdac~`. You should hear a short 440 Hz test tone.
5. Click `randomize`.
6. Start the generation toggle in the upper-left corner.
7. Switch between `mode conway` and `mode mold`.

If **AUDIO TEST** is audible but the automaton remains silent, check that the generation counter and activity value are changing. If the test tone is also silent, open **Options → Audio Status** in Max and select the correct output device.

You can stop the clock and draw cells directly into the matrix.

## Controls

- `randomize` creates a new colony;
- `cleargrid` clears both the matrix and the JavaScript state;
- `mode conway` uses B3/S23 rules;
- `mode mold` uses the three-state growth/decay system;
- `wrap 1` connects opposite edges of the field;
- `spores 0.00035` sets spontaneous growth probability;
- the number beside the clock sets generation time in milliseconds.

## Files

- `spores-and-the-machine.maxpat` — main patch and four embedded audio voices;
- `spores-and-the-machine.js` — automaton, matrix updates and regional analysis;
- `images/interface.png` — interface image used in this README;
- `legacy/` — original patch and JavaScript preserved unchanged.

## Scope

This is deliberately a compact project. It does not yet identify and track individual connected colonies. A future version could use connected-component analysis to map colony area, perimeter, age, splitting and merging to sound.

Created by Dmitrii Schtschukin.
