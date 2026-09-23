import { ProjectState } from '../models/types';
import { CapacityResult } from './capacity';

/*
  Bingham Plastic annular hydraulics model

  Inputs:
  - Mud SG
  - PV: cP
  - YP: lb/100 ft²
  - Pump rate: L/min
  - Hole / casing ID: inch
  - Pipe / BHA OD: inch
  - Interval length: m

  Output:
  - Annular pressure loss: bar
  - ECD: SG
*/

export function calculateHydraulics(
  project: ProjectState,
  capacity: CapacityResult
) {
  const tool = Math.max(1, project.tool);
  const qLmin = Math.max(0, project.pump);

  let annularPressureLossBar = 0;

  if (capacity.hasString && qLmin > 0) {
    for (const row of capacity.rows) {
      // Only calculate pressure loss where drill string exists
      if (row.top >= project.tool) continue;

      const lengthM = Math.max(
        0,
        Math.min(row.bottom, project.tool) - row.top
      );

      if (lengthM <= 0) continue;

      const holeIdIn = row.holeId;
      const pipeOdIn = row.pipeOd;

      if (holeIdIn <= pipeOdIn || pipeOdIn <= 0) continue;

      // Convert geometry to metres
      const holeD = holeIdIn * 0.0254;
      const pipeD = pipeOdIn * 0.0254;

      // Annular flow area
      const annArea =
        (Math.PI / 4) *
        (holeD * holeD - pipeD * pipeD);

      if (annArea <= 0) continue;

      // Mean annular velocity, m/s
      const qM3s = qLmin / 60000;
      const velocity = qM3s / annArea;

      // Hydraulic diameter of concentric annulus
      const hydraulicDiameter = holeD - pipeD;

      if (hydraulicDiameter <= 0) continue;

      // PV: cP -> Pa.s
      const pvPaS = Math.max(0, project.pv) / 1000;

      // YP: lb/100 ft² -> Pa
      const ypPa = Math.max(0, project.yp) * 0.4788025898;

      /*
        Simplified Bingham Plastic pressure-gradient model:

        viscous component:
        32 * PV * velocity / Dh²

        yield component:
        4 * YP / Dh

        Result: Pa/m
      */
      const viscousGradient =
        (32 * pvPaS * velocity) /
        (hydraulicDiameter * hydraulicDiameter);

      const yieldGradient =
        (4 * ypPa) /
        hydraulicDiameter;

      const pressureGradient =
        viscousGradient + yieldGradient;

      // Pa -> bar
      const intervalLossBar =
        pressureGradient * lengthM / 100000;

      annularPressureLossBar += intervalLossBar;
    }
  }

  /*
    ECD in SG

    Hydrostatic pressure:
    bar = SG × 0.0980665 × TVD(m)

    therefore:
    ECD = MW(SG) + annular pressure loss /
                       (0.0980665 × TVD)
  */
  const ecdNow =
    capacity.hasString && tool > 0
      ? project.mudSg +
        annularPressureLossBar /
          (0.0980665 * tool)
      : 0;

  const q = qLmin / 60000;

  const bottoms =
    capacity.hasString && qLmin > 0
      ? capacity.ann * 1000 / qLmin
      : 0;

  const pipeTime =
    capacity.hasString && qLmin > 0
      ? capacity.pipe * 1000 / qLmin
      : 0;

  const circulationTime =
    capacity.hasString && qLmin > 0
      ? capacity.circulating * 1000 / qLmin
      : 0;

  const lagStrokes =
    capacity.hasString && project.strokeLiters > 0
      ? capacity.ann * 1000 / project.strokeLiters
      : 0;

  return {
    ecdNow,
    annularPressureLossBar,

    pipeVel:
      capacity.hasString && capacity.pipe > 0
        ? q / (capacity.pipe / tool)
        : 0,

    annVel:
      capacity.hasString && capacity.ann > 0
        ? q / (capacity.ann / tool)
        : 0,

    bottoms,
    pipeTime,
    circulationTime,
    lagStrokes
  };
}