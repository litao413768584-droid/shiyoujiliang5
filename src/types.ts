export interface Unit {
  id: string;
  name_en: string;
  name_zh: string;
  factor: number; // Factor relative to standard unit
  offset?: number; // Optional offset (for temperature)
}

export type UnitType = 'volume' | 'length' | 'weight' | 'temperature' | 'energy' | 'density' | 'pressure' | 'area';

export interface UnitCategory {
  type: UnitType;
  name: string;
  units: Unit[];
  standardUnit: string;
}

export interface TankCalculationResult {
  totalVolume: number; // Total tank volume (m3)
  liquidVolume: number; // Volume of liquid (m3)
  waterVolume: number; // Volume of bottom water (m3)
  oilVolume: number; // Volume of oil inside (m3)
  oilWeightAir: number; // Weight of oil in air (t)
  oilWeightVac: number; // Weight of oil in vacuum (t)
}

export interface TankParams {
  type: 'vertical' | 'horizontal' | 'spherical';
  diameter: number; // m
  height: number; // m (or length for horizontal)
  oilHeight: number; // m (liquid level dip)
  waterHeight: number; // m (bottom water layer)
  densityObs: number; // g/cm³ (or kg/m³)
  tempObs: number; // °C
  standardTemp: 15 | 20; // Standard temp reference
  oilType?: 'crude' | 'product' | 'lube' | 'asphalt';
}

export interface TankerCompartment {
  id: string;
  name: string;
  capacity: number; // m³
  ullage: number; // m (or volume)
  waterDip: number; // m
  temp: number; // °C
  observedDensity: number; // g/cm³
  vcf?: number;
  weightVac?: number; // t
  weightAir?: number; // t
}

export interface TankerResult {
  totalObsVolume: number;
  totalWaterVolume: number;
  totalGsVolume: number; // Gross Standard Volume (GSV)
  totalNetWeightVac: number;
  totalNetWeightAir: number;
}
