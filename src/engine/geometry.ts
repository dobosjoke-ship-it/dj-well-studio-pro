import { ProjectState, WellSection } from '../models/types';

export const n = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const isOpenHole = (section: WellSection) => {
  const t = String(section.type ?? '').toLowerCase().replace(/\s|_/g, '');
  return t.includes('open');
};

export function areaFromInch(inch: number) {
  const d = n(inch) * 0.0254;
  return Math.PI * d * d / 4;
}

export function effectiveHoleArea(section: WellSection) {
  const nominal = areaFromInch(n(section.idIn));
  const washout = isOpenHole(section) ? Math.max(0, n(section.washoutPct)) : 0;
  return nominal * (1 + washout / 100);
}

export function effectiveHoleDiameter(section: WellSection) {
  const area = effectiveHoleArea(section);
  return Math.sqrt(4 * area / Math.PI) / 0.0254;
}

export function activeSection(project: ProjectState, depth: number) {
  return project.sections
    .filter(section => depth >= n(section.top) && depth < n(section.bottom))
    .sort((a, b) => n(a.idIn) - n(b.idIn))[0];
}

export function stringSegments(project: ProjectState) {
  let bottom = Math.max(0, Math.min(n(project.td), n(project.tool)));
  const out: Array<{ top:number; bottom:number; len:number; od:number; idIn:number; name:string }> = [];

  for (const item of project.bha) {
    const len = Math.max(0, n(item.len));
    const top = Math.max(0, bottom - len);

    if (bottom > top) {
      out.push({ top, bottom, len: bottom - top, od: n(item.od), idIn: n(item.idIn), name: item.name });
    }

    bottom = top;
  }

  if (bottom > 0) {
    out.push({ top: 0, bottom, len: bottom, od: 5, idIn: 4.276, name: 'DP' });
  }

  return out;
}

export function stringAt(project: ProjectState, depth: number) {
  return stringSegments(project).find(segment => depth >= segment.top && depth < segment.bottom)
    ?? { od: 5, idIn: 4.276, name: 'DP' };
}
