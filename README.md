# Whiteout — Kessel Ridge Station

An original solo survival board game, played on a 3D tabletop in the browser.
A blizzard has cut off a mountain research station, the staff are now walking dead,
and you have to escape by helicopter or snowcat before the storm buries you.

## Play

Open **`index.html`** in a browser (double-click it). Everything is bundled into that one file,
so it works offline. Games save automatically in the browser.

**On a phone:** the layout switches to touch controls automatically (see RULES.md). Phones won't run the file
straight from storage, so serve it. At home, run `node serve.mjs` on the PC and open `http://<PC's IP>:5317` on the
phone, on the same Wi-Fi.

Full rules and controls: **[RULES.md](RULES.md)**.

## Build from source

Requires Node.js 22+.

```
npm install
node prep-art.mjs     # only after adding or changing art in assets/meshy_output/art
node build.mjs        # bundles src/ + assets into index.html
node serve.mjs        # optional: preview at http://localhost:5317
```

| Path | What it is |
|---|---|
| `src/data.js` | all cards, locations, survivors and numbers |
| `src/game.js` | rules engine |
| `src/scene.js` | 3D table (three.js) |
| `src/art.js` | card, tile and mat drawing |
| `src/main.js` | panels, prompts and wiring |
| `assets/` | textures (Poly Haven, CC0), miniatures and art (generated with Meshy) |
| `assets/meshy_output/` | full-size originals of the generated art and miniatures |
