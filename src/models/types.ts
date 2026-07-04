export type SectionType = 'casing' | 'liner' | 'openhole';
export type MudMode = 'weighted' | 'unweighted';
export type SaltType = 'K2CO3' | 'KCL' | 'NACL' | 'CACL2';
export type SaltBasis = 'k' | 'cl' | 'salt';

export interface ProjectMeta {
  wellName: string;
  rig: string;
  client: string;
  company: string;
  engineer: string;
}

export interface WellSection {
  id: string;
  type: SectionType;
  name: string;
  top: number;
  bottom: number;
  idIn: number;
  washoutPct: number;
}

export interface BhaItem {
  id: string;
  name: string;
  len: number;
  od: number;
  idIn: number;
}

export interface FluidStage {
  id: string;
  name: string;
  volume: number;
  start: number;
  sg: number;
  color: string;
}

export interface SolidsInput {
  mudSg: number;
  oilPct: number;
  waterPct: number;
  solidsPct: number;
  mode: MudMode;
  weightingSg: number;
  avgSg: number;
  oilSg: number;
  waterSg: number;
  saltType: SaltType;
  basis: SaltBasis;
  conc: number;
  mbt: number;
  polymerKgM3: number;
  systemVolumeM3: number;
  bagKg: number;
}

export interface ProjectState {
  meta: ProjectMeta;
  td: number;
  tool: number;
  pump: number;
  strokeLiters: number;
  mudSg: number;
  pressure: number;
  annLoss: number;
  startTime: string;
  sections: WellSection[];
  bha: BhaItem[];
  fluids: FluidStage[];
  solids: SolidsInput;
}
