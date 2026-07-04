import { ProjectState, WellSection } from '../models/types';
import { buildGeometry } from './coreGeometry';

export interface CapacityRow {
  top: number;
  bottom: number;
  length: number;

  sectionName: string;
  sectionType: WellSection['type'];
  holeId: number;

  pipeName: string;
  pipeOd: number;
  pipeId: number;

  holeLpm: number;
  pipeLpm: number;
  annLpm: number;

  holeM3: number;
  pipeM3: number;
  annM3: number;
  metalM3: number;
}

export interface CapacityResult {
  pipe: number;
  ann: number;
  below: number;
  metal: number;
  washoutExtra: number;
  total: number;

  hole: number;
  holeToTool: number;
  holeBelowTool: number;
  circulating: number;
  fullPath: number;

  hasString: boolean;
  geometryWarning: string;

  rows: CapacityRow[];
}

export function calculateCapacity(project: ProjectState): CapacityResult {
  const g = buildGeometry(project);

  return {
    pipe: g.pipeInside,
    ann: g.annulusAroundString,
    below: g.holeBelowTool,
    metal: g.stringDisplacement,
    washoutExtra: g.washoutExtra,
    total: g.fullPath,

    hole: g.holeVolume,
    holeToTool: g.holeToTool,
    holeBelowTool: g.holeBelowTool,
    circulating: g.circulatingPath,
    fullPath: g.fullPath,

    hasString: g.hasString,
    geometryWarning: g.warning,

    rows: g.intervals.map(row => ({
      top: row.top,
      bottom: row.bottom,
      length: row.length,

      sectionName: row.sectionName,
      sectionType: row.sectionType,
      holeId: row.capacityId,

      pipeName: row.pipeName,
      pipeOd: row.pipeOd,
      pipeId: row.pipeId,

      holeLpm: row.holeLpm,
      pipeLpm: row.pipeLpm,
      annLpm: row.annLpm,

      holeM3: row.holeM3,
      pipeM3: row.pipeM3,
      annM3: row.annM3,
      metalM3: row.metalM3
    }))
  };
}
