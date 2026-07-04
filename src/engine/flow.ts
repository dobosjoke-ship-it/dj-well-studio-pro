import { ProjectState } from '../models/types';
import { CapacityResult } from './capacity';

export function isToolOnBottom(project: ProjectState) {
  return Math.abs(project.tool - project.td) < 0.5;
}

export function flowPath(project: ProjectState, capacity: CapacityResult) {
  const pipe = Math.max(0, capacity.pipe);
  const below = isToolOnBottom(project) ? Math.max(0, capacity.below) : 0;
  const annulus = Math.max(0, capacity.ann);

  return {
    pipeStart: 0,
    pipeEnd: pipe,
    belowStart: pipe,
    belowEnd: pipe + below,
    annStart: pipe + below,
    annEnd: pipe + below + annulus,
    total: pipe + below + annulus
  };
}

export function locate(volumeOnPath: number, project: ProjectState, capacity: CapacityResult) {
  const p = flowPath(project, capacity);

  if (volumeOnPath <= 0) return { zone: 'Waiting', depth: 0 };

  if (volumeOnPath <= p.pipeEnd) {
    return { zone: 'Pipe ↓', depth: volumeOnPath / Math.max(p.pipeEnd, 0.000001) * project.tool };
  }

  if (isToolOnBottom(project) && volumeOnPath <= p.belowEnd) {
    const f = (volumeOnPath - p.belowStart) / Math.max(p.belowEnd - p.belowStart, 0.000001);
    return { zone: 'Below Bit', depth: project.tool + (project.td - project.tool) * f };
  }

  if (volumeOnPath <= p.annEnd) {
    const f = (volumeOnPath - p.annStart) / Math.max(p.annEnd - p.annStart, 0.000001);
    return { zone: 'Annulus ↑', depth: project.tool * (1 - f) };
  }

  return { zone: 'Surface / out', depth: 0 };
}

export function simulateFluids(project: ProjectState, capacity: CapacityResult, timeMin: number) {
  const q = Math.max(0, project.pump) / 1000;

  const pumpedStages = project.fluids
    .map(fluid => ({
      fluid,
      pumped: Math.min(Math.max(0, fluid.volume), Math.max(0, (timeMin - fluid.start) * q))
    }))
    .filter(stage => stage.pumped > 0);

  const totalPumped = pumpedStages.reduce((sum, stage) => sum + stage.pumped, 0);
  let ahead = 0;

  return pumpedStages.map(stage => {
    const frontVolume = totalPumped - ahead;
    const backVolume = Math.max(0, frontVolume - stage.pumped);
    ahead += stage.pumped;

    const front = locate(frontVolume, project, capacity);
    const back = locate(backVolume, project, capacity);

    return {
      fluid: stage.fluid,
      frontVolume,
      backVolume,
      frontDepth: front.depth,
      backDepth: back.depth,
      zone: front.zone
    };
  });
}
