# DJ WELL Studio PRO v6.1 INDUSTRIAL DASHBOARD

Ez teljesen új, tiszta React + Vite projekt.

Nem használja a régi localStorage kulcsot, ezért nem tölti be automatikusan a régi verziót.

## Fő funkciók

- Responsive PRO felület
- Desktop / laptop / tablet / telefon támogatás
- Operation Start
- Fluid Schedule
- Pump Rate L/min
- Pump Output L/stroke
- Pump Strokes számítás:
  `strokes = pumped volume m³ × 1000 / L/stroke`
- Well schematic
- Simulation timeline
- Live status
- Solids analysis v2.5 logika:
  - K₂CO₃ brine phase
  - salt retort correction
  - HGS / LGS
  - Active Clay
  - Drill Solids
- Save / Open JSON project

## Indítás

```powershell
npm.cmd install
npm.cmd run dev
```

Böngésző:

```text
http://localhost:5173
```

Telefon/tablet ugyanazon Wi-Fi-n:

```powershell
npm.cmd run dev
```

majd a terminálban megjelenő `Network:` címet kell megnyitni.


## v4.1 Clear Layout

- Added clear Drilling Parameters panel.
- Bit Depth / Tool End is now directly editable.
- TD, Pump Rate, Pump Output, Mud Weight and Ann. Pressure Loss are grouped together.
- Layout is clearer on desktop/laptop/tablet.
- Main modules have stronger visual section headers.


## v4.4 Restored Capacity

This version restores the stable capacity logic from before the v4.2/v4.3 experiments.

Trusted definitions:
- Pipe Inside Volume = drill string internal volume to tool end.
- Annulus to Bit / Tool End = active return annulus around the drill string, including casing/liner/open-hole sections automatically.
- Below Bit / Tool End = hole volume below tool end.
- Bottoms Up = Annulus to Bit × 1000 / Pump Rate.
- Lag Strokes = Annulus to Bit × 1000 / L per stroke.

The over-complicated annulus breakdown from v4.3 was removed.


## v4.5 Section Geometry Engine

The capacity engine was rebuilt with section-based industrial logic.

The well is automatically split at every depth where geometry changes:
- casing / liner / open hole top-bottom
- drill string OD / ID transition
- bit/tool end
- TD

Every capacity row includes:
- Top / Bottom / Length
- Hole or casing ID
- Pipe OD / Pipe ID
- Hole L/m
- Pipe L/m
- Annulus L/m
- Annulus m³

Main formulas:
- Hole L/m = ID² × 0.506707
- Pipe L/m = Pipe ID² × 0.506707
- Annulus L/m = (Hole ID² - Pipe OD²) × 0.506707
- Bottoms Up = Total annulus to bit × 1000 / Pump Rate


## v4.6 Capacity Label Fix

The capacity panel now explicitly shows:

`Hole Volume Surface → TD = Annulus to Bit + Pipe Inside + Pipe Metal/String Displacement + Below Bit`

This removes the confusing gap between annulus volume, pipe volume and total hole volume.


## v4.7 Compact UI

- Renamed misleading capacity label:
  - `Hole Volume Surface → TD` → `Hole Volume W/O String`
- More compact desktop/laptop layout.
- Smaller KPI cards and panel headers.
- Better module order on smaller screens.
- Capacity table remains available but less intrusive.


## v4.8 Washout Capacity Fix

- Open hole washout is now applied more robustly.
- Recognizes `openhole`, `Open Hole`, and `open`.
- Numeric values also accept comma decimals from older saved projects.
- `Hole Volume W/O String` includes the open-hole washout extra volume.


## v4.9 Lined Hole Clarity

Important well design clarification:

If an open hole is already cased / lined, do NOT leave it as `Open Hole`.

Use:

- Section type: `Liner / Cased Hole`
- Top: liner top
- Bottom: liner shoe / TD
- ID / Hole: liner internal diameter

Example:

```text
9 5/8" Liner / Cased Hole
Top: 2894 m
Bottom: 4318 m
ID / Hole: 8.535"
```

The `BHA Builder` is for drill string / tools only.  
It does not define the hole or casing geometry.


## v5.0 Geometry Engine 2.0

Major correction:

If there is no string/tool in the hole:
- Pipe Inside Volume = 0
- Annulus Around String = 0
- Volume Below Tool End = 0
- Bottoms Up = 0
- Lag Strokes = 0
- Hole Volume W/O String still shows the well capacity.

This prevents the whole well volume from being incorrectly shown as "Below Tool".

The well is section-split by:
- casing / liner / open hole section boundaries
- drill string OD / ID changes
- tool end
- TD


## v5.1 Capacity ID Fix

Clarification:
- The well section field is now named `Capacity ID (in)`.
- Capacity formula: `L/m = Capacity ID² × 0.506707`.
- For a 9 5/8 section using nominal 9.625" capacity:
  - `9.625² × 0.506707 = 46.94 L/m`
- The app warns if a 9 5/8 section appears to use an 8.x ID from an older saved project.


## v6.0 Core Geometry Engine

This version adds a single shared geometry model:

`buildGeometry(project)`

The same core model now feeds:
- Capacities
- Hydraulics
- Bottoms Up
- Lag Strokes
- Capacity Breakdown

Core definitions:
- Hole Volume W/O String = total well section volume to TD
- Pipe Inside = drill string internal volume to tool end
- Annulus Around String = hole/casing/liner capacity minus pipe OD around the string
- String Displacement = pipe OD volume minus pipe ID volume
- Volume Below Tool = only exists if a string/tool is in hole
- No string/tool = annulus, pipe, below tool, bottoms up and lag strokes are all 0

This is the new base for future:
- Pill tracking
- Cement displacement
- ECD profile
- Reports


## v6.1 Industrial Dashboard

- Added mud splash DJ WELL logo into the sidebar.
- Added dark navy / amber industrial skin.
- Stronger dashboard cards and panels.
- Capacity and assistant panels now use mud-gold highlights.
- This is a visual design upgrade on top of the v6 core geometry engine.
