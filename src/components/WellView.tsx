import { ProjectState } from '../models/types';
import { CapacityResult } from '../engine/capacity';
import { effectiveHoleDiameter } from '../engine/geometry';
import { flowPath, isToolOnBottom, simulateFluids } from '../engine/flow';
import { TriconeBit } from './TriconeBit';
import { WellHead } from './WellHead';

interface Props {
  project: ProjectState;
  capacity: CapacityResult;
  flow: ReturnType<typeof simulateFluids>;
  time: string;
}

function overlap(a0: number, a1: number, b0: number, b1: number) {
  const start = Math.max(a0, b0);
  const end = Math.min(a1, b1);
  return end > start ? { start, end } : null;
}

export function WellView({ project, capacity, flow }: Props) {
  const top = 105;
  const bottom = 810;
  const height = bottom - top;
  const cx = 390;

  const maxDepth = Math.max(project.td, project.tool, ...project.sections.map(s => s.bottom));
  const y = (d: number) => top + Math.max(0, Math.min(maxDepth, d)) / maxDepth * height;

  const toolY = y(project.tool);
  const tdY = y(project.td);
  const pipeHeight = Math.max(1, toolY - top);
  const belowHeight = Math.max(1, tdY - toolY);
  const maxId = Math.max(18, ...project.sections.map(effectiveHoleDiameter));
  const width = (id: number) => 75 + id / maxId * 270;
  const p = flowPath(project, capacity);
  const onBottom = isToolOnBottom(project);

  const fluidSvg = flow.map(item => {
    const parts: JSX.Element[] = [];
    const a0 = item.backVolume;
    const a1 = item.frontVolume;

    const pipe = overlap(a0, a1, p.pipeStart, p.pipeEnd);
    if (pipe && capacity.pipe > 0) {
      const y0 = top + pipeHeight * (pipe.start - p.pipeStart) / Math.max(p.pipeEnd - p.pipeStart, 0.000001);
      const y1 = top + pipeHeight * (pipe.end - p.pipeStart) / Math.max(p.pipeEnd - p.pipeStart, 0.000001);
      const yy = Math.min(y0, y1);
      const hh = Math.max(5, Math.abs(y1 - y0));

      parts.push(
        <g key="pipe">
          <rect x={379} y={yy} width={22} height={hh} rx={6} fill={item.fluid.color} opacity=".94" />
          <path className="flowDown" d={`M390 ${yy + 4} L390 ${yy + hh - 4}`} stroke="#ffffff" strokeWidth="2" strokeDasharray="8 8" />
        </g>
      );
    }

    const below = overlap(a0, a1, p.belowStart, p.belowEnd);
    if (onBottom && below && capacity.below > 0) {
      const y0 = toolY + belowHeight * (below.start - p.belowStart) / Math.max(p.belowEnd - p.belowStart, 0.000001);
      const y1 = toolY + belowHeight * (below.end - p.belowStart) / Math.max(p.belowEnd - p.belowStart, 0.000001);
      const yy = Math.min(y0, y1);
      const hh = Math.max(5, Math.abs(y1 - y0));

      parts.push(<rect key="below" x={320} y={yy} width={140} height={hh} rx="18" fill={item.fluid.color} opacity=".52" />);
    }

    const ann = overlap(a0, a1, p.annStart, p.annEnd);
    if (ann && capacity.ann > 0) {
      const f0 = (ann.start - p.annStart) / Math.max(p.annEnd - p.annStart, 0.000001);
      const f1 = (ann.end - p.annStart) / Math.max(p.annEnd - p.annStart, 0.000001);

      const y0 = toolY - pipeHeight * f0;
      const y1 = toolY - pipeHeight * f1;
      const yy = Math.min(y0, y1);
      const hh = Math.max(5, Math.abs(y1 - y0));

      parts.push(
        <g key="ann">
          <rect x={292} y={yy} width={72} height={hh} rx={14} fill={item.fluid.color} opacity=".82" />
          <rect x={416} y={yy} width={72} height={hh} rx={14} fill={item.fluid.color} opacity=".82" />
          <path className="flowUp" d={`M328 ${yy + hh - 4} L328 ${yy + 4}`} stroke="#fff" strokeWidth="2" strokeDasharray="8 8" />
          <path className="flowUp" d={`M452 ${yy + hh - 4} L452 ${yy + 4}`} stroke="#fff" strokeWidth="2" strokeDasharray="8 8" />
        </g>
      );
    }

    return <g key={item.fluid.id}>{parts}</g>;
  });

  return (
    <div className="wellBox">
      <svg viewBox="35 0 770 910" className="wellSvg">
        <defs>
          <linearGradient id="steel" x1="0" x2="1">
            <stop offset="0" stopColor="#536574" />
            <stop offset=".25" stopColor="#f0f8ff" />
            <stop offset=".55" stopColor="#667988" />
            <stop offset=".82" stopColor="#eff8ff" />
            <stop offset="1" stopColor="#4b5965" />
          </linearGradient>
          <linearGradient id="earth" x1="0" x2="1">
            <stop offset="0" stopColor="#1d130b" />
            <stop offset=".5" stopColor="#3b2819" />
            <stop offset="1" stopColor="#181008" />
          </linearGradient>
        </defs>

        <rect x="70" y={top} width="650" height={height} rx="18" fill="rgba(5,14,25,.62)" stroke="rgba(150,215,250,.22)" />
        <rect x="112" y={top} width="566" height={height} fill="url(#earth)" opacity=".38" />

        {Array.from({ length: Math.floor(maxDepth / 100) + 1 }).map((_, i) => {
          const d = i * 100;
          const yy = y(d);
          const major = d % 500 === 0;
          return (
            <g key={d}>
              <line x1={major ? 90 : 105} y1={yy} x2="700" y2={yy} stroke={major ? 'rgba(200,240,255,.62)' : 'rgba(130,180,220,.20)'} />
              <text x={major ? 50 : 64} y={yy + 4} fill={major ? '#fff' : '#9fb3c8'} fontSize={major ? 12 : 10}>{d}</text>
            </g>
          );
        })}

        <WellHead x={cx} y={top - 76} />

        {project.sections.map(section => {
          const sy = y(section.top);
          const ey = y(section.bottom);
          const hh = Math.max(1, ey - sy);
          const eff = effectiveHoleDiameter(section);
          const ww = width(eff);
          const x = cx - ww / 2;

          if (section.type === 'openhole') {
            return (
              <g key={section.id}>
                <path d={`M${x} ${sy} C${x-18} ${sy+hh*.2} ${x+16} ${sy+hh*.36} ${x-14} ${sy+hh*.52} C${x+15} ${sy+hh*.72} ${x-12} ${sy+hh*.88} ${x} ${ey} L${x+ww} ${ey} C${x+ww+12} ${sy+hh*.86} ${x+ww-14} ${sy+hh*.72} ${x+ww+14} ${sy+hh*.52} C${x+ww-16} ${sy+hh*.36} ${x+ww+18} ${sy+hh*.2} ${x+ww} ${sy} Z`}
                  fill="#071018" stroke={section.washoutPct > 0 ? '#ffad55' : '#b77945'} strokeWidth={section.washoutPct > 0 ? 8 : 6}/>
                <text x={x+ww+12} y={sy+18} fill="#ffd29a" fontSize="12">{section.name}</text>
                <text x={x+ww+12} y={sy+34} fill="#d6a572" fontSize="10">{section.top}-{section.bottom} m / WO {section.washoutPct}%</text>
              </g>
            );
          }

          const wall = section.type === 'casing' ? 14 : 10;
          return (
            <g key={section.id}>
              <rect x={x-wall} y={sy} width={ww+wall*2} height={hh} rx="8" fill="url(#steel)" stroke="#eaf7ff" opacity=".96" />
              <rect x={x} y={sy+wall} width={ww} height={Math.max(2, hh-wall*2)} rx="5" fill="#06101d" opacity=".94" />
              <text x={x+ww+wall+12} y={sy+18} fill="#a9dfff" fontSize="12">{section.name}</text>
              <text x={x+ww+wall+12} y={sy+34} fill="#9fb3c8" fontSize="10">{section.top}-{section.bottom} m</text>
            </g>
          );
        })}

        <rect x="372" y={top} width="36" height={Math.max(0, toolY-top)} rx="8" fill="url(#steel)" opacity=".65" stroke="#e9f7ff" />
        <rect x="381" y={top+5} width="18" height={Math.max(0, toolY-top-10)} rx="5" fill="rgba(7,20,33,.35)" stroke="rgba(220,238,255,.36)" />

        {fluidSvg}

        <g stroke="#35d5ff" strokeWidth="5" strokeLinecap="round" opacity=".86">
          <path className="flowDown" d={`M390 ${top+60} L390 ${toolY-75}`} strokeDasharray="20 20" />
          <path className="flowUp" d={`M328 ${toolY-80} L328 ${top+175}`} strokeDasharray="20 20" />
          <path className="flowUp" d={`M452 ${toolY-80} L452 ${top+175}`} strokeDasharray="20 20" />
        </g>

        <TriconeBit x={cx} y={toolY} />

        <line x1="210" y1={toolY} x2="700" y2={toolY} stroke="#39c9ff" strokeWidth="2" strokeDasharray="7 5" />
        <text x="565" y={toolY - 8} fill="#39c9ff" fontSize="12">Tool end {project.tool.toFixed(0)} m</text>
      </svg>
    </div>
  );
}
