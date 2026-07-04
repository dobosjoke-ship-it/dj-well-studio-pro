import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultProject } from './data/defaultProject';
import { calculateCapacity } from './engine/capacity';
import { simulateFluids } from './engine/flow';
import { calculateHydraulics } from './engine/hydraulics';
import { calculateSolids } from './engine/solids';
import { InputRow } from './components/InputRow';
import { WellView } from './components/WellView';
import mudLogo from './assets/dj-well-mud-logo.png';
import { BhaItem, FluidStage, ProjectState, SaltBasis, SaltType, SectionType, WellSection } from './models/types';

const STORE = 'dj-well-studio-pro-v4-clean-project';
const fmt = (n: number, d = 1) => Number.isFinite(n) ? n.toFixed(d) : '-';

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}


function capacityIdWarning(name: string, idIn: number) {
  const normalized = name.toLowerCase().replace(/\s/g, '');
  const is958 = normalized.includes('95/8') || normalized.includes('9⅝') || normalized.includes('9-5/8');
  if (is958 && idIn < 9) {
    return '9 5/8 section uses a low Capacity ID. For 46.94 L/m use 9.625 in.';
  }
  return '';
}

function normalizeSectionType(value: unknown): SectionType {
  const t = String(value ?? '').toLowerCase().replace(/\s|_/g, '');
  if (t.includes('open')) return 'openhole';
  if (t.includes('liner')) return 'liner';
  return 'casing';
}

type View = 'home' | 'well' | 'fluids' | 'simulation' | 'solids' | 'hydraulics';

const views: Array<{ id: View; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'well', label: 'Well', icon: '⌁' },
  { id: 'fluids', label: 'Fluids', icon: '◖' },
  { id: 'simulation', label: 'Simulation', icon: '▶' },
  { id: 'solids', label: 'Solids', icon: '⚗' },
  { id: 'hydraulics', label: 'Hydr.', icon: '≈' }
];

function uid(prefix: string) {
  return prefix + Date.now() + Math.round(Math.random() * 1000);
}

function parseTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatTime(totalMinutes: number) {
  const mins = Math.round(totalMinutes);
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDuration(mins: number) {
  const m = Math.max(0, Math.round(mins));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function normalize(raw: Partial<ProjectState>): ProjectState {
  return {
    ...defaultProject,
    ...raw,
    meta: { ...defaultProject.meta, ...(raw.meta ?? {}) },
    strokeLiters: raw.strokeLiters ?? defaultProject.strokeLiters,
    sections: (raw.sections ?? defaultProject.sections).map(s => ({
      ...s,
      type: normalizeSectionType(s.type),
      top: toNumber(s.top),
      bottom: toNumber(s.bottom),
      idIn: toNumber(s.idIn),
      washoutPct: toNumber(s.washoutPct)
    })),
    solids: { ...defaultProject.solids, ...(raw.solids ?? {}) }
  };
}

export function App() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem(STORE);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return normalize(data.project ?? data);
      } catch {
        return defaultProject;
      }
    }
    return defaultProject;
  });

  const [activeView, setActiveView] = useState<View>('simulation');
  const [timeMin, setTimeMin] = useState(18);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const capacity = useMemo(() => calculateCapacity(project), [project]);
  const flow = useMemo(() => simulateFluids(project, capacity, timeMin), [project, capacity, timeMin]);
  const hydraulics = useMemo(() => calculateHydraulics(project, capacity), [project, capacity]);
  const solids = useMemo(() => calculateSolids(project.solids), [project.solids]);

  const pumpRateM3Min = project.pump / 1000;
  const strokeLiters = Math.max(0.001, project.strokeLiters);
  const pumpedVolume = Math.max(0, timeMin * pumpRateM3Min);
  const pumpStrokes = pumpedVolume * 1000 / strokeLiters;
  const totalFluidVolume = project.fluids.reduce((sum, fluid) => sum + fluid.volume, 0);
  const totalFluidTime = pumpRateM3Min > 0 ? totalFluidVolume / pumpRateM3Min : 0;
  const currentClock = formatTime(parseTime(project.startTime) + timeMin);
  const operationTime = formatDuration(timeMin);

  const schedule = useMemo(() => {
    const opStart = parseTime(project.startTime);
    return project.fluids.map((fluid, index) => {
      const duration = pumpRateM3Min > 0 ? fluid.volume / pumpRateM3Min : 0;
      const start = opStart + fluid.start;
      const end = start + duration;
      return { ...fluid, index: index + 1, duration, startClock: formatTime(start), endClock: formatTime(end) };
    });
  }, [project.fluids, project.startTime, pumpRateM3Min]);

  const activeFluid = [...schedule].reverse().find(f => timeMin >= f.start)?.name ?? 'Ready';
  const atBit = flow.find(f => f.zone.includes('Pipe') || f.zone.includes('Below'))?.fluid.name ?? '—';
  const atSurface = flow.find(f => f.zone.includes('Surface') || f.frontDepth < 1)?.fluid.name ?? 'Mud';

  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setTimeMin(t => Math.min(t + 1, Math.max(240, totalFluidTime + hydraulics.bottoms + 30))), 750 / Math.max(0.25, speed));
    return () => window.clearInterval(id);
  }, [playing, speed, totalFluidTime, hydraulics.bottoms]);

  const updateFluid = (i: number, patch: Partial<FluidStage>) => {
    const fluids = [...project.fluids];
    fluids[i] = { ...fluids[i], ...patch };
    setProject({ ...project, fluids });
  };

  const updateSection = (i: number, patch: Partial<WellSection>) => {
    const sections = [...project.sections];
    sections[i] = { ...sections[i], ...patch };
    setProject({ ...project, sections });
  };

  const updateBha = (i: number, patch: Partial<BhaItem>) => {
    const bha = [...project.bha];
    bha[i] = { ...bha[i], ...patch };
    setProject({ ...project, bha });
  };

  const autoSchedule = () => {
    let t = 0;
    const fluids = project.fluids.map(fluid => {
      const out = { ...fluid, start: Math.round(t) };
      t += pumpRateM3Min > 0 ? fluid.volume / pumpRateM3Min : 0;
      return out;
    });
    setProject({ ...project, fluids });
  };

  const addSection = (type: SectionType) => {
    const top = project.sections.length ? Math.max(...project.sections.map(s => s.bottom)) : 0;
    setProject({ ...project, sections: [...project.sections, {
      id: uid('s'),
      type,
      name: type === 'openhole' ? 'New Open Hole' : type === 'liner' ? 'New Liner / Cased Hole' : 'New Casing',
      top,
      bottom: Math.min(project.td, top + 500),
      idIn: type === 'openhole' ? 8.5 : 9.625,
      washoutPct: 0
    }]});
  };

  const save = () => {
    const blob = new Blob([JSON.stringify({ app: 'DJ WELL Studio PRO', version: '6.1', savedAt: new Date().toISOString(), project }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.meta.wellName || 'dj-well-project'}.djwell.json`;
    a.click();
  };

  const load = async (file: File) => {
    const data = JSON.parse(await file.text());
    setProject(normalize(data.project ?? data));
  };

  const setMeta = (key: keyof ProjectState['meta'], value: string) => {
    setProject({ ...project, meta: { ...project.meta, [key]: value } });
  };

  const visible = (view: View) => activeView === view || activeView === 'home';

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand">
          <b>DJ WELL STUDIO <span>PRO</span></b>
          <small>v6.1 INDUSTRIAL DASHBOARD</small>
        </div>

        <div className="projectStrip">
          <label>Project<input value={project.meta.wellName} onChange={e => setMeta('wellName', e.target.value)} /></label>
          <label>Rig<input value={project.meta.rig} onChange={e => setMeta('rig', e.target.value)} /></label>
          <label>Client<input value={project.meta.client} onChange={e => setMeta('client', e.target.value)} /></label>
          <label>Company<input value={project.meta.company} onChange={e => setMeta('company', e.target.value)} /></label>
        </div>

        <div className="saveBtns">
          <button onClick={save}>Save</button>
          <button onClick={() => fileRef.current?.click()}>Open</button>
          <input ref={fileRef} hidden type="file" accept=".json,.djwell,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ''; }} />
        </div>
      </header>

      <aside className="navRail">
        <div className="sidebarLogo"><img src={mudLogo} alt="DJ WELL Studio PRO" /><b>DJ WELL STUDIO</b><small>PRO v6.1</small></div>
        {views.map(v => (
          <button key={v.id} className={activeView === v.id ? 'active' : ''} onClick={() => setActiveView(v.id)}>
            <span>{v.icon}</span>
            {v.label}
          </button>
        ))}
      </aside>

      <section className="kpiGrid">
        <div><span>Current Time</span><b>{currentClock}</b><small>Operation {operationTime}</small></div>
        <div><span>Hole / Bit</span><b>{fmt(project.td,0)} m</b><small>Bit {fmt(project.tool,0)} m</small></div>
        <div><span>Pump Rate</span><b>{fmt(project.pump,0)}</b><small>L/min</small></div>
        <div><span>Pump Output</span><b>{fmt(strokeLiters,2)}</b><small>L/stroke</small></div>
        <div><span>Pumped</span><b>{fmt(pumpedVolume,1)} m³</b><small>{fmt(pumpStrokes,0)} strokes</small></div>
        <div><span>Bottoms Up</span><b>{fmt(hydraulics.bottoms,1)} min</b><small>{fmt(capacity.ann,1)} m³ annulus</small></div>
      </section>

      <main className="workspace">

        <section className={`panel paramsPanel ${activeView === 'simulation' || activeView === 'home' || activeView === 'well' ? '' : 'mobileHide'}`}>
          <div className="panelHead">
            <h2>Drilling Parameters</h2>
            <b>Editable</b>
          </div>
          <div className="paramGrid">
            <InputRow label="Hole Depth / TD (m)" value={project.td} onChange={v => setProject({ ...project, td: v })}/>
            <InputRow label="Bit Depth / Tool End (m)" value={project.tool} onChange={v => setProject({ ...project, tool: v })}/>
            <InputRow label="Pump Rate (L/min)" value={project.pump} onChange={v => setProject({ ...project, pump: v })}/>
            <InputRow label="Pump Output (L/stroke)" value={project.strokeLiters} step={0.01} onChange={v => setProject({ ...project, strokeLiters: v })}/>
            <InputRow label="Mud Weight / SG" value={project.mudSg} step={0.01} onChange={v => setProject({ ...project, mudSg: v, solids: { ...project.solids, mudSg: v } })}/>
            <InputRow label="Ann. Pressure Loss %" value={project.annLoss} step={0.1} onChange={v => setProject({ ...project, annLoss: v })}/>
          </div>
        </section>


        <section className={`panel capacityPanel ${activeView === 'simulation' || activeView === 'home' || activeView === 'hydraulics' ? '' : 'mobileHide'}`}>
          <div className="panelHead">
            <h2>Capacities</h2>
            <b>Restored</b>
          </div>
          <div className="capacityList">
            {capacity.geometryWarning && <p className="geomWarn"><span>Geometry Check</span><b>{capacity.geometryWarning}</b></p>}
            <p className="formula"><span>Hole Volume W/O String</span><b>{fmt(capacity.hole,2)} m³</b></p>
            <p><span>Annulus Around String</span><b>{fmt(capacity.ann,2)} m³</b></p>
            <p><span>Pipe Inside Volume</span><b>{fmt(capacity.pipe,2)} m³</b></p>
            <p><span>Pipe Metal / String Displacement</span><b>{fmt(capacity.metal,2)} m³</b></p>
            <p><span>Volume Below Tool End</span><b>{fmt(capacity.below,2)} m³</b></p>
            <p className="formulaText"><span>Formula</span><b>Core Geometry Engine</b></p>
            <p><span>Pipe + Annulus Circulating Volume</span><b>{fmt(capacity.circulating,2)} m³</b></p>
            <p><span>Full Path / Hole Volume</span><b>{fmt(capacity.fullPath,2)} m³</b></p>
            <p><span>Open Hole Washout Extra</span><b>{fmt(capacity.washoutExtra,2)} m³</b></p>
            <p><span>Bottoms Up Time</span><b>{fmt(hydraulics.bottoms,1)} min</b></p>
            <p><span>Lag Strokes</span><b>{fmt(hydraulics.lagStrokes,0)} strokes</b></p>
          </div>
        </section>


        <section className={`panel breakdownPanel ${activeView === 'simulation' || activeView === 'home' || activeView === 'hydraulics' ? '' : 'mobileHide'}`}>
          <div className="panelHead">
            <h2>Capacity Breakdown</h2>
            <b>Section based</b>
          </div>
          <div className="breakdownWrap">
            <table className="breakdownTable">
              <thead>
                <tr>
                  <th>Top</th>
                  <th>Bottom</th>
                  <th>Len</th>
                  <th>Section</th>
                  <th>Capacity ID</th>
                  <th>Pipe</th>
                  <th>OD</th>
                  <th>ID</th>
                  <th>Hole L/m</th>
                  <th>Pipe L/m</th>
                  <th>Ann L/m</th>
                  <th>Ann m³</th>
                </tr>
              </thead>
              <tbody>
                {capacity.rows.map((row, i) => (
                  <tr key={i}>
                    <td>{fmt(row.top,0)}</td>
                    <td>{fmt(row.bottom,0)}</td>
                    <td>{fmt(row.length,0)}</td>
                    <td>{row.sectionName}</td>
                    <td>{fmt(row.holeId,3)}</td>
                    <td>{row.pipeName}</td>
                    <td>{fmt(row.pipeOd,3)}</td>
                    <td>{fmt(row.pipeId,3)}</td>
                    <td>{fmt(row.holeLpm,2)}</td>
                    <td>{fmt(row.pipeLpm,2)}</td>
                    <td>{fmt(row.annLpm,2)}</td>
                    <td>{fmt(row.annM3,2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

<section className={`panel wellPanel ${visible('well') || activeView === 'simulation' ? '' : 'mobileHide'}`}>
          <div className="panelHead"><h2>Well Schematic</h2><b>{project.meta.wellName}</b></div>
          <WellView project={project} capacity={capacity} flow={flow} time={currentClock} />
        </section>

        <section className={`panel schedulePanel ${visible('fluids') || activeView === 'simulation' ? '' : 'mobileHide'}`}>
          <div className="panelHead fluidHead">
            <h2>Fluid Schedule</h2>
            <label>Operation Start<input type="time" value={project.startTime} onChange={e => setProject({ ...project, startTime: e.target.value })} /></label>
            <label>Pump Rate<input type="number" value={project.pump} onChange={e => setProject({ ...project, pump: +e.target.value })} /><small>L/min</small></label>
            <label>Pump Output<input type="number" step="0.01" value={project.strokeLiters} onChange={e => setProject({ ...project, strokeLiters: +e.target.value })} /><small>L/stroke</small></label>
            <button onClick={autoSchedule}>Auto Start</button>
            <button onClick={() => setProject({ ...project, fluids: [...project.fluids, { id: uid('f'), name: 'New Fluid', volume: 10, start: 0, sg: project.mudSg, color: '#69d8ff' }] })}>+ Fluid</button>
          </div>

          <div className="tableWrap">
            <table className="fluidTable">
              <thead>
                <tr><th>#</th><th>Fluid</th><th>Color</th><th>Vol m³</th><th>Rate</th><th>Start offset</th><th>Clock start</th><th>End</th><th>Dur.</th><th></th></tr>
              </thead>
              <tbody>
                {schedule.map((fluid, i) => (
                  <tr key={fluid.id}>
                    <td>{fluid.index}</td>
                    <td><input value={fluid.name} onChange={e => updateFluid(i, { name: e.target.value })}/></td>
                    <td><input type="color" value={fluid.color} onChange={e => updateFluid(i, { color: e.target.value })}/></td>
                    <td><input type="number" value={fluid.volume} onChange={e => updateFluid(i, { volume: +e.target.value })}/></td>
                    <td><input type="number" value={project.pump} onChange={e => setProject({ ...project, pump: +e.target.value })}/></td>
                    <td><input type="number" value={fluid.start} onChange={e => updateFluid(i, { start: +e.target.value })}/></td>
                    <td>{fluid.startClock}</td>
                    <td>{fluid.endClock}</td>
                    <td>{formatDuration(fluid.duration)}</td>
                    <td><button className="danger" onClick={() => setProject({ ...project, fluids: project.fluids.filter((_, x) => x !== i) })}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`panel livePanel ${activeView === 'simulation' || activeView === 'home' ? '' : 'mobileHide'}`}>
          <div className="panelHead"><h2>Live Status</h2><b className="run">● LIVE</b></div>
          <div className="statusList">
            <p><span>Time</span><b>{currentClock}</b></p>
            <p><span>Current Stage</span><b>{activeFluid}</b></p>
            <p><span>At Bit</span><b>{atBit}</b></p>
            <p><span>At Surface</span><b>{atSurface}</b></p>
            <p><span>Pumped</span><b>{fmt(pumpedVolume,1)} m³</b></p>
            <p><span>Pump Strokes</span><b>{fmt(pumpStrokes,0)}</b></p>
            <p><span>Stroke Output</span><b>{fmt(strokeLiters,2)} L/stroke</b></p>
            <p><span>Remaining</span><b>{fmt(Math.max(0, totalFluidVolume - pumpedVolume),1)} m³</b></p>
          </div>

          <div className="assistantBox">
            <h3>Rig Assistant</h3>
            <p className={solids.drillSolidsVolPct > 6 ? 'warn' : 'ok'}>● Drill Solids {fmt(solids.drillSolidsVolPct,2)}%</p>
            <p className={solids.hgsVolPct > 7 ? 'warn' : 'ok'}>● HGS {fmt(solids.hgsVolPct,2)}%</p>
            <p className="note">● Bottoms Up {fmt(hydraulics.bottoms,0)} min</p>
          </div>
        </section>

        <section className={`panel timelinePanel ${activeView === 'simulation' || activeView === 'home' ? '' : 'mobileHide'}`}>
          <div className="panelHead"><h2>Simulation Timeline</h2><b>{fmt(pumpStrokes,0)} strokes</b></div>
          <div className="timeline">
            {schedule.map(fluid => {
              const left = totalFluidTime > 0 ? fluid.start / totalFluidTime * 100 : 0;
              const width = totalFluidTime > 0 ? fluid.duration / totalFluidTime * 100 : 0;
              return (
                <div className="timelineRow" key={fluid.id}>
                  <span>{fluid.name}</span>
                  <div><i style={{ left: `${left}%`, width: `${Math.max(2, width)}%`, background: fluid.color }} /></div>
                </div>
              );
            })}
            <em style={{ left: `${Math.min(100, totalFluidTime > 0 ? timeMin / totalFluidTime * 100 : 0)}%` }}>{currentClock}</em>
          </div>
          <div className="playbar">
            <button onClick={() => setPlaying(!playing)}>{playing ? '❚❚' : '▶'}</button>
            <select value={speed} onChange={e => setSpeed(+e.target.value)}>
              <option value=".5">0.5×</option>
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="5">5×</option>
            </select>
            <input type="range" min="0" max={Math.max(120, Math.round(totalFluidTime + hydraulics.bottoms + 30))} value={timeMin} onChange={e => setTimeMin(+e.target.value)} />
            <button onClick={() => setTimeMin(0)}>Reset</button>
          </div>
        </section>

        <section className={`panel solidsPanel ${visible('solids') ? '' : 'mobileHide'}`}>
          <div className="panelHead"><h2>Solids Analysis</h2><b className="good">GOOD</b></div>
          <div className="inputGrid">
            <InputRow label="Mud SG" value={project.solids.mudSg} step={0.001} onChange={v => setProject({ ...project, solids: { ...project.solids, mudSg: v } })}/>
            <InputRow label="Oil %" value={project.solids.oilPct} step={0.1} onChange={v => setProject({ ...project, solids: { ...project.solids, oilPct: v } })}/>
            <InputRow label="Water %" value={project.solids.waterPct} step={0.1} onChange={v => setProject({ ...project, solids: { ...project.solids, waterPct: v } })}/>
            <InputRow label="Retort Solids %" value={project.solids.solidsPct} step={0.1} onChange={v => setProject({ ...project, solids: { ...project.solids, solidsPct: v } })}/>
            <InputRow label="K+ / Salt g/L" value={project.solids.conc} step={0.1} onChange={v => setProject({ ...project, solids: { ...project.solids, conc: v } })}/>
            <InputRow label="MBT kg/m³" value={project.solids.mbt} step={0.1} onChange={v => setProject({ ...project, solids: { ...project.solids, mbt: v } })}/>
            <InputRow label="SG Weighting" value={project.solids.weightingSg} step={0.01} onChange={v => setProject({ ...project, solids: { ...project.solids, weightingSg: v } })}/>
            <InputRow label="SG LGS" value={project.solids.avgSg} step={0.01} onChange={v => setProject({ ...project, solids: { ...project.solids, avgSg: v } })}/>
          </div>

          <div className="selectGrid">
            <select value={project.solids.mode} onChange={e => setProject({ ...project, solids: { ...project.solids, mode: e.target.value as 'weighted' | 'unweighted' } })}>
              <option value="weighted">Weighted Mud</option>
              <option value="unweighted">Unweighted Mud</option>
            </select>
            <select value={project.solids.saltType} onChange={e => setProject({ ...project, solids: { ...project.solids, saltType: e.target.value as SaltType } })}>
              <option value="K2CO3">K₂CO₃</option>
              <option value="KCL">KCl</option>
              <option value="NACL">NaCl</option>
              <option value="CACL2">CaCl₂</option>
            </select>
            <select value={project.solids.basis} onChange={e => setProject({ ...project, solids: { ...project.solids, basis: e.target.value as SaltBasis } })}>
              <option value="k">K⁺ g/L</option>
              <option value="cl">Cl⁻ g/L</option>
              <option value="salt">Salt g/L</option>
            </select>
            <button onClick={() => setProject({ ...project, solids: { ...project.solids, avgSg: 2.65, weightingSg: 4.20, oilSg: 0.80, waterSg: 1.00 } })}>Standard constants</button>
          </div>

          <table>
            <thead><tr><th>Component</th><th>kg/m³</th><th>vol%</th><th>mass%</th><th>SG</th></tr></thead>
            <tbody>
              <tr><td>Brine Phase</td><td>{fmt(solids.brinePhaseKgM3,1)}</td><td>{fmt(solids.retortWaterVolPct,2)}</td><td>-</td><td>{fmt(solids.brineSg,3)}</td></tr>
              <tr><td>K₂CO₃ Salt</td><td>{fmt(solids.saltKg,1)}</td><td>{fmt(solids.saltVolPct,2)}</td><td>{fmt(solids.saltMassPct,1)}</td><td>{fmt(solids.saltSg,2)}</td></tr>
              <tr><td>Corrected Real Solids</td><td>-</td><td>{fmt(solids.correctedVolPct,2)}</td><td>-</td><td>-</td></tr>
              <tr><td>HGS / Weighting</td><td>{fmt(solids.hgs,1)}</td><td>{fmt(solids.hgsVolPct,2)}</td><td>{fmt(solids.hgsMassPct,1)}</td><td>{fmt(solids.weightingSgUsed,2)}</td></tr>
              <tr><td>LGS Total</td><td>{fmt(solids.lgs,1)}</td><td>{fmt(solids.lgsVolPct,2)}</td><td>{fmt(solids.lgsMassPct,1)}</td><td>{fmt(solids.lgsSgUsed,2)}</td></tr>
              <tr><td>Active Clay</td><td>{fmt(solids.activeClay,1)}</td><td>{fmt(solids.activeClayVolPct,2)}</td><td>{fmt(solids.activeClayMassPct,1)}</td><td>{fmt(solids.lgsSgUsed,2)}</td></tr>
              <tr><td>Drill Solids</td><td>{fmt(solids.drillSolids,1)}</td><td>{fmt(solids.drillSolidsVolPct,2)}</td><td>{fmt(solids.drillSolidsMassPct,1)}</td><td>{fmt(solids.lgsSgUsed,2)}</td></tr>
            </tbody>
          </table>
        </section>

        <section className={`panel wellEditPanel ${visible('well') ? '' : 'mobileHide'}`}>
          <div className="panelHead">
            <h2>Well Design</h2>
            <small className="hint">If open hole is cased, use Liner / Cased Hole with liner ID.</small>
            <div><button onClick={() => addSection('casing')}>+ Casing</button><button onClick={() => addSection('liner')}>+ Liner</button><button onClick={() => addSection('openhole')}>+ Open</button></div>
          </div>
          <div className="cards">
            {project.sections.map((s, i) => (
              <div className={`sectionCard ${s.type}`} key={s.id}>
                <select value={s.type} onChange={e => updateSection(i, { type: e.target.value as SectionType })}><option value="casing">Casing</option><option value="liner">Liner / Cased Hole</option><option value="openhole">Open Hole</option></select>
                <input value={s.name} onChange={e => updateSection(i, { name: e.target.value })}/>
                <InputRow label="Top" value={s.top} onChange={v => updateSection(i, { top: v })}/>
                <InputRow label="Bottom" value={s.bottom} onChange={v => updateSection(i, { bottom: v })}/>
                <InputRow label="Capacity ID (in)" value={s.idIn} step={0.001} onChange={v => updateSection(i, { idIn: v })}/>
                {capacityIdWarning(s.name, s.idIn) && <p className="inlineWarn">{capacityIdWarning(s.name, s.idIn)}</p>}
                <InputRow label="Washout %" value={s.washoutPct} onChange={v => updateSection(i, { washoutPct: v })}/>
                <button className="danger" onClick={() => setProject({ ...project, sections: project.sections.filter((_, x) => x !== i) })}>Delete</button>
              </div>
            ))}
          </div>
        </section>

        <section className={`panel bhaPanel ${visible('well') ? '' : 'mobileHide'}`}>
          <div className="panelHead"><h2>BHA Builder</h2><button onClick={() => setProject({ ...project, bha: [...project.bha, { id: uid('b'), name: 'New BHA', len: 1, od: 5, idIn: 2.25 }] })}>+ BHA</button></div>
          <table>
            <thead><tr><th>Item</th><th>Len</th><th>OD</th><th>ID</th><th></th></tr></thead>
            <tbody>
              {project.bha.map((b, i) => (
                <tr key={b.id}>
                  <td><input value={b.name} onChange={e => updateBha(i, { name: e.target.value })}/></td>
                  <td><input type="number" value={b.len} onChange={e => updateBha(i, { len: +e.target.value })}/></td>
                  <td><input type="number" value={b.od} onChange={e => updateBha(i, { od: +e.target.value })}/></td>
                  <td><input type="number" value={b.idIn} onChange={e => updateBha(i, { idIn: +e.target.value })}/></td>
                  <td><button className="danger" onClick={() => setProject({ ...project, bha: project.bha.filter((_, x) => x !== i) })}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={`panel hydraulicsPanel ${visible('hydraulics') ? '' : 'mobileHide'}`}>
          <div className="panelHead"><h2>Hydraulics</h2></div>
          <div className="cards">
            <div><span>ECD</span><b>{fmt(hydraulics.ecdNow,3)} SG</b></div>
            <div><span>Pipe Velocity</span><b>{fmt(hydraulics.pipeVel,2)} m/s</b></div>
            <div><span>Annular Velocity</span><b>{fmt(hydraulics.annVel,2)} m/s</b></div>
            <div><span>Bottoms Up</span><b>{fmt(hydraulics.bottoms,1)} min</b></div>
            <div><span>Total Capacity</span><b>{fmt(capacity.total,1)} m³</b></div>
            <div><span>Annulus</span><b>{fmt(capacity.ann,1)} m³</b></div>
          </div>
        </section>
      </main>

      <nav className="mobileNav">
        {views.map(v => (
          <button key={v.id} className={activeView === v.id ? 'active' : ''} onClick={() => setActiveView(v.id)}>
            <span>{v.icon}</span><small>{v.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
