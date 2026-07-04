import { ProjectState } from '../models/types';
import { CapacityResult } from './capacity';

export function calculateHydraulics(project: ProjectState, capacity: CapacityResult) {
  const loss = project.pressure * (project.annLoss / 100);
  const tool = Math.max(1, project.tool);
  const q = project.pump / 1000;

  const bottoms = capacity.hasString && project.pump > 0 ? capacity.ann * 1000 / project.pump : 0;
  const pipeTime = capacity.hasString && project.pump > 0 ? capacity.pipe * 1000 / project.pump : 0;
  const circulationTime = capacity.hasString && project.pump > 0 ? capacity.circulating * 1000 / project.pump : 0;
  const lagStrokes = capacity.hasString && project.strokeLiters > 0 ? capacity.ann * 1000 / project.strokeLiters : 0;

  return {
    ecdNow: capacity.hasString ? project.mudSg + loss / (0.0980665 * tool) : 0,
    pipeVel: capacity.hasString && capacity.pipe > 0 ? q / (capacity.pipe / tool) : 0,
    annVel: capacity.hasString && capacity.ann > 0 ? q / (capacity.ann / tool) : 0,
    bottoms,
    pipeTime,
    circulationTime,
    lagStrokes
  };
}
