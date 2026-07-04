import { SaltBasis, SaltType, SolidsInput } from '../models/types';

export function saltCompound(type: SaltType, basis: SaltBasis, g: number) {
  if (basis === 'k') {
    if (type === 'K2CO3') return g * 138.205 / 78.196;
    if (type === 'KCL') return g * 74.551 / 39.098;
  }

  if (basis === 'cl') {
    if (type === 'KCL') return g * 74.551 / 35.453;
    if (type === 'NACL') return g * 58.443 / 35.453;
    if (type === 'CACL2') return g * 110.98 / 70.906;
  }

  return g;
}

export function brineSg(type: SaltType, compoundGL: number) {
  if (type === 'K2CO3') return 1 + 0.00076 * compoundGL;
  if (type === 'KCL') return 1 + 0.00064 * compoundGL;
  if (type === 'CACL2') return 1 + 0.00082 * compoundGL;
  return 1 + 0.00070 * compoundGL;
}

function drySaltSg(type: SaltType) {
  if (type === 'K2CO3') return 2.43;
  if (type === 'KCL') return 1.98;
  if (type === 'NACL') return 2.16;
  if (type === 'CACL2') return 2.15;
  return 2.2;
}

function safe(n: number, min = 0) {
  return Number.isFinite(n) ? Math.max(min, n) : min;
}

export function calculateSolids(input: SolidsInput) {
  const SG = input.mudSg;

  const Rsol = safe(input.solidsPct) / 100;
  const Roil = safe(input.oilPct) / 100;
  const Rwater = safe(input.waterPct) / 100;

  const rhoWeight = input.mode === 'weighted' ? input.weightingSg : input.avgSg;
  const rhoLGS = input.avgSg;
  const rhoOil = input.oilSg;

  const mSalt = saltCompound(input.saltType, input.basis, input.conc);
  const rhoSaltDry = drySaltSg(input.saltType);
  const rhoBrine = brineSg(input.saltType, mSalt);

  const vSaltDry = mSalt / (rhoSaltDry * 1000);
  const vTrueSolids = safe(Rsol - vSaltDry);

  let vHGS = 0;

  if (input.mode === 'weighted') {
    const denom = rhoWeight - rhoLGS;

    if (Math.abs(denom) > 1e-12) {
      vHGS = (
        SG
        - (Rwater * rhoBrine)
        - (Roil * rhoOil)
        - (vTrueSolids * rhoLGS)
        - (mSalt / 1000)
      ) / denom;
    }

    vHGS = Math.min(safe(vHGS), vTrueSolids);
  }

  const vLGS = safe(vTrueSolids - vHGS);

  const hgsKgM3 = vHGS * rhoWeight * 1000;
  const lgsKgM3 = vLGS * rhoLGS * 1000;

  const activeClayKgM3 = Math.min(safe(input.mbt), lgsKgM3);
  const vMBT = activeClayKgM3 / (rhoLGS * 1000);

  const vDrillSolids = safe(vLGS - vMBT);
  const drillSolidsKgM3 = vDrillSolids * rhoLGS * 1000;

  const oilKgM3 = Roil * rhoOil * 1000;
  const brinePhaseKgM3 = Rwater * rhoBrine * 1000;
  const cleanWaterEquivalentKgM3 = Rwater * input.waterSg * 1000;
  const mudMassKgM3 = SG * 1000;

  const chemicalConcentration = mSalt + oilKgM3 + activeClayKgM3 + safe(input.polymerKgM3);

  const massBalanceKgM3 = brinePhaseKgM3 + oilKgM3 + mSalt + hgsKgM3 + lgsKgM3;
  const retortClosurePct = (Rwater + Roil + Rsol) * 100;
  const kgTotal = mSalt * input.systemVolumeM3;
  const bags = input.bagKg > 0 ? kgTotal / input.bagKg : 0;

  return {
    mode: input.mode,

    SG,
    Rsol,
    Roil,
    Rwater,
    retortClosurePct,

    compound: mSalt,
    brineSg: rhoBrine,
    saltSg: rhoSaltDry,

    saltKg: mSalt,
    saltVolPct: vSaltDry * 100,
    saltMassPct: mudMassKgM3 > 0 ? mSalt / mudMassKgM3 * 100 : 0,

    oilKgM3,
    waterKgM3: cleanWaterEquivalentKgM3,
    brinePhaseKgM3,

    retortSolidsVolPct: Rsol * 100,
    retortOilVolPct: Roil * 100,
    retortWaterVolPct: Rwater * 100,

    trueSolidsVolPct: vTrueSolids * 100,
    correctedVolPct: vTrueSolids * 100,

    hgs: hgsKgM3,
    hgsVolPct: vHGS * 100,
    hgsMassPct: mudMassKgM3 > 0 ? hgsKgM3 / mudMassKgM3 * 100 : 0,

    lgs: lgsKgM3,
    lgsVolPct: vLGS * 100,
    lgsMassPct: mudMassKgM3 > 0 ? lgsKgM3 / mudMassKgM3 * 100 : 0,

    activeClay: activeClayKgM3,
    activeClayVolPct: vMBT * 100,
    activeClayMassPct: mudMassKgM3 > 0 ? activeClayKgM3 / mudMassKgM3 * 100 : 0,

    drillSolids: drillSolidsKgM3,
    drillSolidsVolPct: vDrillSolids * 100,
    drillSolidsMassPct: mudMassKgM3 > 0 ? drillSolidsKgM3 / mudMassKgM3 * 100 : 0,

    chemicalConcentration,
    polymerKgM3: input.polymerKgM3,

    kgTotal,
    bags,
    lbBbl: mSalt * 0.3505,

    massBalanceKgM3,
    massBalanceError: massBalanceKgM3 - mudMassKgM3,
    massBalanceErrorPct: mudMassKgM3 > 0 ? (massBalanceKgM3 - mudMassKgM3) / mudMassKgM3 * 100 : 0,

    weightingSgUsed: rhoWeight,
    lgsSgUsed: rhoLGS,
    oilSgUsed: rhoOil,
    waterSgUsed: input.waterSg
  };
}
