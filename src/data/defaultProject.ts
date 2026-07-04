import { ProjectState } from '../models/types';

export const defaultProject: ProjectState = {
  meta: {
    wellName: 'Laufzorn TH4a',
    rig: 'RED',
    client: 'Eavor',
    company: 'Sirius-ES',
    engineer: 'DJ'
  },

  td: 4318,
  tool: 1525,
  pump: 2200,
  strokeLiters: 2.70,
  mudSg: 1.45,
  pressure: 85,
  annLoss: 5,
  startTime: '11:00',

  sections: [
    { id: 's1', type: 'casing', name: '30" Conductor', top: 0, bottom: 39, idIn: 29, washoutPct: 0 },
    { id: 's2', type: 'casing', name: '20" Casing', top: 0, bottom: 1150, idIn: 18.5, washoutPct: 0 },
    { id: 's3', type: 'casing', name: '13⅜" Casing', top: 0, bottom: 2564, idIn: 12.415, washoutPct: 0 },
    { id: 's4', type: 'openhole', name: '12¼" Open Hole', top: 2564, bottom: 4318, idIn: 12.25, washoutPct: 15 }
  ],

  bha: [
    { id: 'b1', name: 'Tricone Bit', len: 0.5, od: 12.25, idIn: 2.25 },
    { id: 'b2', name: 'Motor', len: 8, od: 8, idIn: 2.25 },
    { id: 'b3', name: 'MWD', len: 9, od: 6.75, idIn: 2.25 },
    { id: 'b4', name: 'HWDP', len: 190, od: 5.5, idIn: 3.25 },
    { id: 'b5', name: 'DP', len: 1317.5, od: 5, idIn: 4.276 }
  ],

  fluids: [
    { id: 'f1', name: 'Spacer', volume: 10, start: 0, sg: 1.02, color: '#ffd23b' },
    { id: 'f2', name: 'HiVis Pill', volume: 7, start: 5, sg: 1.10, color: '#56d364' },
    { id: 'f3', name: 'Mud', volume: 65, start: 8, sg: 1.45, color: '#a35d2d' },
    { id: 'f4', name: 'Cement', volume: 58, start: 38, sg: 1.92, color: '#ef3f5b' },
    { id: 'f5', name: 'Displacement', volume: 85, start: 64, sg: 1.45, color: '#128cff' }
  ],

  solids: {
    mudSg: 1.45,
    oilPct: 2.8,
    waterPct: 79.2,
    solidsPct: 18,
    mode: 'weighted',
    weightingSg: 4.20,
    avgSg: 2.65,
    oilSg: 0.80,
    waterSg: 1.00,
    saltType: 'K2CO3',
    basis: 'k',
    conc: 66,
    mbt: 24.5,
    polymerKgM3: 11.4,
    systemVolumeM3: 180,
    bagKg: 25
  }
};
