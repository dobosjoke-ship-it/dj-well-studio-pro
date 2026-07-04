import { ProjectState, WellSection } from '../models/types';
import { areaFromInch, effectiveHoleArea, effectiveHoleDiameter, isOpenHole, n, stringSegments } from './geometry';

export interface GeometryInterval {
  top: number;
  bottom: number;
  length: number;

  sectionName: string;
  sectionType: WellSection['type'];
  capacityId: number;

  pipeName: string;
  pipeOd: number;
  pipeId: number;
  hasPipe: boolean;

  holeLpm: number;
  pipeLpm: number;
  annLpm: number;
  metalLpm: number;

  holeM3: number;
  pipeM3: number;
  annM3: number;
  metalM3: number;
  washoutM3: number;
}

export interface GeometryModel {
  hasString: boolean;
  warning: string;
  intervals: GeometryInterval[];

  holeVolume: number;
  holeToTool: number;
  holeBelowTool: number;

  pipeInside: number;
  annulusAroundString: number;
  stringDisplacement: number;
  washoutExtra: number;

  circulatingPath: number;
  fullPath: number;
}

function lpm(area: number) {
  return area * 1000;
}

function findSectionAt(project: ProjectState, depth: number) {
  return project.sections
    .filter(section => depth >= n(section.top) && depth < n(section.bottom))
    .sort((a, b) => n(a.idIn) - n(b.idIn))[0];
}

function findPipeAt(project: ProjectState, depth: number) {
  return stringSegments(project).find(segment => depth >= segment.top && depth < segment.bottom);
}

function splitPoints(project: ProjectState) {
  const td = Math.max(0, n(project.td));
  const tool = Math.max(0, Math.min(n(project.tool), td));
  const points = new Set<number>([0, td]);

  if (tool > 0) points.add(tool);

  for (const section of project.sections) {
    points.add(Math.max(0, Math.min(td, n(section.top))));
    points.add(Math.max(0, Math.min(td, n(section.bottom))));
  }

  if (tool > 0) {
    for (const pipe of stringSegments(project)) {
      points.add(Math.max(0, Math.min(td, n(pipe.top))));
      points.add(Math.max(0, Math.min(td, n(pipe.bottom))));
    }
  }

  return [...points]
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .filter((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) > 0.0001);
}

export function buildGeometry(project: ProjectState): GeometryModel {
  const td = Math.max(0, n(project.td));
  const tool = Math.max(0, Math.min(n(project.tool), td));
  const hasString = tool > 0 && project.bha.length > 0;

  let holeVolume = 0;
  let holeToTool = 0;
  let holeBelowTool = 0;
  let pipeInside = 0;
  let annulusAroundString = 0;
  let stringDisplacement = 0;
  let washoutExtra = 0;

  const intervals: GeometryInterval[] = [];
  const points = splitPoints(project);

  for (let i = 0; i < points.length - 1; i += 1) {
    const top = points[i];
    const bottom = points[i + 1];
    const length = bottom - top;
    if (length <= 0) continue;

    const mid = top + length / 2;
    const section = findSectionAt(project, mid);
    if (!section) continue;

    const holeArea = effectiveHoleArea(section);
    const nominalHoleArea = areaFromInch(n(section.idIn));
    const capacityId = effectiveHoleDiameter(section);
    const holeM3 = holeArea * length;
    const washoutM3 = isOpenHole(section) ? Math.max(0, holeArea - nominalHoleArea) * length : 0;

    holeVolume += holeM3;
    washoutExtra += washoutM3;

    let pipeName = 'No string';
    let pipeOd = 0;
    let pipeId = 0;
    let pipeOdArea = 0;
    let pipeIdArea = 0;
    let pipeM3 = 0;
    let annM3 = 0;
    let metalM3 = 0;

    const hasPipe = hasString && mid < tool;
    if (hasPipe) {
      const pipe = findPipeAt(project, mid);
      if (pipe) {
        pipeName = pipe.name;
        pipeOd = n(pipe.od);
        pipeId = n(pipe.idIn);
        pipeOdArea = areaFromInch(pipeOd);
        pipeIdArea = areaFromInch(pipeId);

        pipeM3 = pipeIdArea * length;
        annM3 = Math.max(0, holeArea - pipeOdArea) * length;
        metalM3 = Math.max(0, pipeOdArea - pipeIdArea) * length;

        pipeInside += pipeM3;
        annulusAroundString += annM3;
        stringDisplacement += metalM3;
        holeToTool += holeM3;
      }
    } else if (hasString && mid >= tool) {
      holeBelowTool += holeM3;
    }

    intervals.push({
      top,
      bottom,
      length,

      sectionName: section.name,
      sectionType: section.type,
      capacityId,

      pipeName,
      pipeOd,
      pipeId,
      hasPipe,

      holeLpm: lpm(holeArea),
      pipeLpm: lpm(pipeIdArea),
      annLpm: lpm(hasPipe ? Math.max(0, holeArea - pipeOdArea) : 0),
      metalLpm: lpm(hasPipe ? Math.max(0, pipeOdArea - pipeIdArea) : 0),

      holeM3,
      pipeM3,
      annM3,
      metalM3,
      washoutM3
    });
  }

  const circulatingPath = pipeInside + annulusAroundString;
  const fullPath = hasString ? circulatingPath + holeBelowTool : holeVolume;

  return {
    hasString,
    warning: hasString ? '' : 'No string/tool in hole: annulus, pipe volume, bottoms up and below tool are set to 0.',
    intervals,

    holeVolume,
    holeToTool,
    holeBelowTool,

    pipeInside,
    annulusAroundString,
    stringDisplacement,
    washoutExtra,

    circulatingPath,
    fullPath
  };
}
