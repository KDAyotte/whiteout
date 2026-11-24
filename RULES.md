# WHITEOUT — Kessel Ridge Station

*An original solo survival game. Rules v0.2. These match the digital version, which applies every rule for you.*

A blizzard has cut off Kessel Ridge, a research station high in the mountains. Something in the
Virology Lab got loose, and most of the staff are now walking dead. You are the last survivor
awake. Get out before the cold, the noise or the dead finish you.

## Playing the digital version

Double-click **index.html** to open it in your browser. It needs no internet connection. Your
game saves itself after every action, so you can close the tab and pick it up again with
**Continue saved game**.

- **Camera**: left-drag rotates, right-drag or WASD pans, the scroll wheel zooms, and Q/E turns.
  Keys 1–4 jump to Overview, Top-down, My area and Find me.
- **Reading**: hover over any card or tile for a large preview. Click it to read it full-screen.
  Double-click a tile to fly the camera to it.
- **Playing**: choose actions in the right-hand panel. Blue tiles are where you can move. You can
  also click a tile and press *Move here*. Click a backpack card to *Use* or *Discard* it.
- **Floating labels** over every room show its zombies 🧟, crates 📦 and objective status. A
  **red label marked 🎯 IN RANGE** means you can shoot into that room. **L** turns the labels on or off.
- **Missions** (button or **M**, or click the checklist on the left) shows every step of both
  escape routes: where to go, what you still need, what it costs, and where the items can be found.
  *Show on board* flies the camera there.
- **H** hides the panels so you can see the whole table.

### On a phone

On a small screen, the game switches to a phone layout. It works upright, but sideways gives a bigger table.

- **Touch**: drag with one finger to rotate, pinch to zoom, and drag with two fingers to pan. Tap a tile or card to read it, with *Move here*, *Shoot*, *Use* and *Fly camera here* buttons.
- **Top bar**: 🗺 Overview, ⬇ Top-down, 🃏 My area, 📍 Find me, 🏷 Labels, ☰ Menu.
- **Strip under it**: Health ❤, Warmth 🔥, Ammo 🔫, Noise 🔊, Actions ⚡, and the Round and Storm.
- **Tab bar**: 🎲 Actions, ❤ Status (meters, goals and the log), 🎒 Pack (your backpack) and 🎯 Missions.
  Tap a tab to open its panel and tap it again to close it. The Actions tab glows red when zombies are in your room.
- Phones start on **Low** graphics. You can raise it in ☰ Menu if your phone handles it.

## How to win

Escape by one of two routes:

1. **Helicopter evac**
   1. **Restore Power** at the Generator Shed: spend a *Fuel Can* and *Spare Parts* (1 Action).
   2. **Repair the Antenna** at the Radio Tower: needs Power ON and a *Toolkit* (2 Actions). You keep the Toolkit.
   3. **Call Evac** from the Command Room (1 Action). The helicopter lands 3 rounds later.
   4. **Board** at the Helipad once it has landed (1 Action).
2. **Snowcat**: at the Garage, with *Snowcat Keys*, a *Fuel Can* and *Spare Parts*, spend 2 Actions.

## How to lose

- Your Health reaches 0.
- The Storm track runs past its last space.

## Setup (done for you)

Your survivor starts in the **Dormitory** with Health 5, Warmth 5, Noise 0 and 2 Supply cards
(never an Ambush!). Your starting Ammo depends on your survivor.

| Difficulty | Starting zombies | Storm track |
|---|---|---|
| Easy | Virology Lab, Storage | 14 rounds |
| Normal | Virology Lab, Storage, Mess Hall | 12 rounds |
| Hard | Virology Lab ×2, Storage, Mess Hall, Garage | 10 rounds |

## A round

### 1. Your turn: 4 Actions

| Action | Effect |
|---|---|
| **Move** | Go to a connected tile. Entering an **Outdoor** ❄ tile costs 1 Warmth. Leaving a tile that has zombies: each zombie there makes a **bite roll** (d6, 5+ = 1 wound). |
| **Search** | Take a crate from this tile and draw a Supply card. +1 Noise. |
| **Fight** | Roll your weapon's dice. Each hit kills a zombie in the target room. *Melee* (this room only): +1 Noise, and each **1** rolled is a wound. *Bare hands*: 1 die, hits on 6, this room only. |
| **Shoot** | *Guns* can fire at this room **or any connected room**. Spend 1 Ammo. Shooting into a connected room needs **1 higher** on each die (Pistol 4+, Flare Gun 5+), except the scoped **Hunting Rifle**. Guns are loud but never get you bitten. |
| **Use the room** | The tile's ability (see Locations). |

- **While zombies are on your tile, you can't Search or use the room.** You have to fight or leave.
- **Consumable cards** (Med Kit, Bandages, Ammo Box, Thermal Blanket, Hand Warmers, Energy Bar)
  are **free** to use at any time on your turn.
- Your **backpack** holds 5 cards. When you have more, discard down to 5.
- **Ambush!** cards in the Supply deck put a zombie on your tile as soon as you draw them.
- You may end the round early.

### 2. Threat phase (automatic)

1. **Threat card**: the top Threat card is revealed and resolved.
2. **Noise draws them in**: every zombie within *Noise* steps of you moves 1 step closer.
   **At Noise 0, no zombie moves.**
3. **Zombies attack**: each zombie on your tile bites (d6, 4+ = 1 wound).
4. **Cold**: if you end the round on an Outdoor tile, lose 1 Warmth.
5. **Clean up**: Noise −2 (never below 0), Storm +1, and you get 4 fresh Actions.

**Warmth 0**: every Warmth you would lose becomes 1 wound instead (frostbite).

## Survivors

| Survivor | Ability |
|---|---|
| **Dr. Mara Velez**, Glaciologist | Your first Outdoor Move each round costs no Warmth. |
| **Jonas Kett**, Station Mechanic | Repairing the Antenna or the Snowcat takes 1 Action instead of 2. Scrap Metal counts as Spare Parts. |
| **Priya Anand**, Medic | All your healing heals +1. Once per game, when you would drop to 0 Health, go to 1 instead. |
| **"Tuck" Hollis**, Security Chief | Starts with a Service Pistol and 4 Ammo. Gun attacks make only +1 Noise. |

## Locations

| Tile | Type | Crates | Ability |
|---|---|---|---|
| Dormitory | Indoor | 1 | Start tile. **Rest**: +2 Warmth. |
| Mess Hall | Indoor | 2 | **Hot stove**: +1 Warmth and heal 1 (once per round). |
| Med Bay | Indoor | 2 | **Treat wounds**: heal 2 (once per round). |
| Virology Lab | Indoor | 2 | Searching here: draw 2, keep 1. |
| Command Room | Indoor | 1 | **Call Evac**. |
| Storage | Indoor | 3 | Searching here: draw 2, keep both, +1 extra Noise. |
| Workshop | Indoor | 2 | **Tinker**: discard 2 cards to take Spare Parts from the deck or discard pile. |
| Generator Shed | Outdoor | 1 | **Restore Power**. |
| Fuel Depot | Outdoor | 1 | **Siphon**: gain a Fuel Can (2 per game). +2 Noise. |
| Garage | Outdoor | 2 | **Escape by Snowcat**. |
| Radio Tower | Outdoor | 0 | **Repair Antenna**. |
| Weather Hut | Outdoor | 1 | **Forecast**: look at the top 2 Threat cards and swap their order if you like. |
| Helipad | Outdoor | 0 | **Board** the helicopter once it has landed. |

## Supply deck (31 cards)

| Card | # | Effect |
|---|---|---|
| Ice Axe | 2 | Melee, 2 dice, 4+ |
| Crowbar | 2 | Melee, 2 dice, 5+ |
| Fire Extinguisher | 1 | Melee, 3 dice, 5+ |
| Service Pistol | 1 | Gun, 1 die, 3+ (4+ into a connected room), +2 Noise |
| Hunting Rifle | 1 | Gun, 2 dice, 3+ (scoped: 3+ at range too), +2 Noise |
| Flare Gun | 1 | Gun, 2 dice, 4+ (5+ into a connected room), +3 Noise |
| Ammo Box | 3 | +2 Ammo (max 6) |
| Med Kit / Bandages | 2 / 2 | Heal 2 / heal 1 |
| Thermal Blanket / Hand Warmers | 2 / 2 | +3 / +2 Warmth |
| Energy Bar | 2 | +1 Action this round |
| Fuel Can, Spare Parts | 2, 2 | Objective items |
| Toolkit, Snowcat Keys | 1, 1 | Objective items |
| Scrap Metal | 2 | Junk (Tinker fodder; Spare Parts for Jonas) |
| Ambush! | 2 | A zombie appears on your tile |

## Threat deck (20 cards)

Lab Breach ×2 (2 zombies in the Virology Lab) · Shambling Pack ×2 (Storage + Mess Hall) ·
The Frozen Rise ×2 (Fuel Depot + Garage) · The Station Groans ×1 (Dormitory + Med Bay) ·
Lurker ×2 (1 zombie 2 steps from you) · Drawn to Noise ×2 (1 zombie per 2 Noise next to you) ·
Lights Flicker ×1 (Command Room + Dormitory, only if the Power is OFF) · Hungry ×2 (every zombie
steps toward you) · Whiteout Gust ×2 (Storm +1) · Biting Cold ×2 (−1 Warmth, −2 outdoors) ·
Eerie Calm ×2 (Noise to 0).

---

## For tinkering

The source code is in `src/` (`data.js` holds all the cards and numbers). After changing it, run
`node build.mjs` to rebuild `index.html`.

Card art, location art and the miniatures were generated with Meshy (`assets/meshy_output/`). After adding
or replacing art there, run `node prep-art.mjs` and then `node build.mjs`.

Graphics quality (Low / Medium / High) is in the **Menu**. The textures and cabin lighting come from
Poly Haven (CC0, free for any use). They live in `assets/` and are packed into `index.html` by the build.
