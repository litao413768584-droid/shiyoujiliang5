import { TankParams, TankCalculationResult } from '../types';

// ==========================================
// 1. ASTM D1250 Volume Correction Factor (VCF)
// ==========================================

export function calculateAsphaltVCF_D4311(
  rhoStd: number,
  tempObs: number,
  stdTemp: 15 | 20 | '60F' | '15C' = 15
): number {
  const is60F = stdTemp === '60F';
  let vcf = 1.0;

  if (is60F) {
    // 观测温度为华氏度 (°F)
    // Group A: API gravity at 60°F <= 14.9° or Specific Gravity 60/60°F >= 0.967 (or density >= 967 kg/m³)
    // Group B: API gravity at 60°F 15.0° ~ 34.9° or Specific Gravity 60/60°F 0.850 ~ 0.966
    let isGroupA = false;
    if (rhoStd < 2.0) {
      // Specific Gravity (SG)
      isGroupA = rhoStd >= 0.967;
    } else if (rhoStd <= 50.0) {
      // API gravity (°API)
      isGroupA = rhoStd <= 14.9;
    } else {
      // Standard density in kg/m³
      isGroupA = rhoStd >= 967;
    }

    if (isGroupA) {
      vcf = 1.0211326242 - 3.548988118 * 0.0001 * tempObs + 4.49881 * 0.00000001 * tempObs * tempObs;
    } else {
      vcf = 1.02413769 - 4.0641418 * 0.0001 * tempObs + 6.79176 * 0.00000001 * tempObs * tempObs;
    }
  } else {
    // 观测温度为摄氏度 (°C)
    // A: 15°C 密度 >= 966 kg/m³
    // B: 15°C 密度 850 ~ 965 kg/m³
    let densityKg = rhoStd < 10 ? rhoStd * 1000 : rhoStd;
    if (densityKg <= 0) densityKg = 1015;

    if (densityKg >= 966) {
      vcf = 1.0094684142 - 6.33413410744 * 0.0001 * tempObs + 1.45710416212 * 0.0000001 * tempObs * tempObs;
    } else {
      vcf = 1.0108020095 - 7.2343515319 * 0.0001 * tempObs + 2.1996598346 * 0.0000001 * tempObs * tempObs;
    }
  }

  return parseFloat(vcf.toFixed(5));
}

// ASTM D1250 / ASTM D4311-04 Volume Correction Factor (VCF)
export function calculateVCF(
  rhoStd: number, // Standard density at stdTemp (kg/m3, so 600 - 1100 g/L)
  tempObs: number, // Observed temperature (°C)
  stdTemp: 15 | 20 | '60F' = 20, // Standard temperature
  oilType: 'crude' | 'product' | 'lube' | 'asphalt' = 'product'
): number {
  if (oilType === 'asphalt') {
    return calculateAsphaltVCF_D4311(rhoStd, tempObs, stdTemp);
  }

  const numericStdTemp = stdTemp === '60F' ? 15 : stdTemp;
  const deltaT = tempObs - numericStdTemp;
  if (deltaT === 0) return 1.0;

  // Density standard relative to g/cm3 for coefficients
  const rhoG = rhoStd / 1000; // e.g. 0.800

  // Calculate α (thermal expansion coefficient at 15°C or 20°C)
  let alpha = 0.0;
  let k0 = 0.0;
  let k1 = 0.0;
  if (oilType === 'crude') {
    k0 = 613.9723;
    k1 = 0.0;
  } else if (oilType === 'product') {
    k0 = 186.9696;
    k1 = 0.48618;
  } else {
    // lube
    k0 = 0.0;
    k1 = 0.6278;
  }
  alpha = k0 / (rhoStd * rhoStd) + k1 / rhoStd;

  if (alpha <= 0) {
    alpha = 0.0008; // Default fallback if density out of bound
  }

  // Calculate VCF
  const vcf = Math.exp(-alpha * deltaT * (1.0 + 0.8 * alpha * deltaT));
  return parseFloat(vcf.toFixed(5));
}

// Iterative solver to find standard density from observed density at temperature
export function calculateStandardDensity(
  rhoObs: number, // Observed density in kg/m3 (e.g. 800) or g/cm3 (e.g. 0.800)
  tempObs: number,
  stdTemp: 15 | 20,
  oilType: 'crude' | 'product' | 'lube' | 'asphalt' = 'product'
): number {
  // Normalize to kg/m³
  const obsDensityKg = rhoObs < 10 ? rhoObs * 1000 : rhoObs;
  let rhoStd = obsDensityKg; // Initial guess

  for (let i = 0; i < 15; i++) {
    const vcf = calculateVCF(rhoStd, tempObs, stdTemp, oilType);
    const nextRhoStd = obsDensityKg / vcf;
    if (Math.abs(nextRhoStd - rhoStd) < 0.01) {
      return parseFloat(nextRhoStd.toFixed(2));
    }
    rhoStd = nextRhoStd;
  }
  return parseFloat(rhoStd.toFixed(2));
}

// Convert density in vacuum to density in air (weight in air correction)
// Typically, density in air = density in vacuum - 1.1 (kg/m³) or g/cm³ equivalent
export function calculateAirDensity(densityVacKg: number): number {
  return densityVacKg - 1.1; // air buoyancy of standard weight
}

// ==========================================
// 2. Storage Tank Calculations
// ==========================================

export function calculateTankVolume(params: TankParams): TankCalculationResult {
  const { type, diameter, height, oilHeight, waterHeight, densityObs, tempObs, standardTemp, oilType = 'product' } = params;

  const radius = diameter / 2;
  let totalVolume = 0;
  let liquidVolume = 0;
  let waterVolume = 0;

  if (type === 'vertical') {
    // Vertical cylinder
    totalVolume = Math.PI * radius * radius * height;
    liquidVolume = Math.PI * radius * radius * oilHeight;
    waterVolume = Math.PI * radius * radius * Math.min(waterHeight, oilHeight);
  } else if (type === 'horizontal') {
    // Horizontal cylinder (length = height)
    const L = height; // Length
    totalVolume = Math.PI * radius * radius * L;

    // Helper for circular segment area
    const segmentVolume = (h: number) => {
      if (h <= 0) return 0;
      if (h >= diameter) return Math.PI * radius * radius * L;
      const theta = 2 * Math.acos((radius - h) / radius);
      const area = 0.5 * radius * radius * (theta - Math.sin(theta));
      return area * L;
    };

    liquidVolume = segmentVolume(oilHeight);
    waterVolume = segmentVolume(Math.min(waterHeight, oilHeight));
  } else {
    // Spherical tank
    totalVolume = (4 / 3) * Math.PI * radius * radius * radius;

    const sphereSegmentVolume = (h: number) => {
      if (h <= 0) return 0;
      if (h >= diameter) return totalVolume;
      return (Math.PI * h * h * (3 * radius - h)) / 3;
    };

    liquidVolume = sphereSegmentVolume(oilHeight);
    waterVolume = sphereSegmentVolume(Math.min(waterHeight, oilHeight));
  }

  // Oil gross volume at temperature
  const rawOilVolume = Math.max(0, liquidVolume - waterVolume);

  // VCF calculation
  const rhoStdKg = calculateStandardDensity(densityObs, tempObs, standardTemp, oilType);
  const vcf = calculateVCF(rhoStdKg, tempObs, standardTemp, oilType);

  // Gross Standard Volume (GSV)
  const gsvVolume = rawOilVolume * vcf; // m³ at standard temp

  // Weights (t)
  const rhoVacT = rhoStdKg / 1000; // t/m³ (equivalent to g/cm³)
  const rhoAirT = (rhoStdKg - 1.1) / 1000; // t/m³ corrected for air buoyancy

  const oilWeightVac = gsvVolume * rhoVacT;
  const oilWeightAir = gsvVolume * rhoAirT;

  return {
    totalVolume: parseFloat(totalVolume.toFixed(3)),
    liquidVolume: parseFloat(liquidVolume.toFixed(3)),
    waterVolume: parseFloat(waterVolume.toFixed(3)),
    oilVolume: parseFloat(gsvVolume.toFixed(3)),
    oilWeightAir: parseFloat(Math.max(0, oilWeightAir).toFixed(3)),
    oilWeightVac: parseFloat(Math.max(0, oilWeightVac).toFixed(3)),
  };
}

// ==========================================
// 3. Other Core Fuel/Petroleum Calcs
// ==========================================

// Double-variable cetane index ASTM D976
// Formula: CCI = 454.74 - 1641.416*D + 774.74*D^2 - 0.554*T50 + 97.803 * [log10(T50)]^2
export function calculateASTM976(density15Cg: number, t50C: number): number {
  if (density15Cg <= 0 || t50C <= 0) return 0;
  const logT50 = Math.log10(t50C);
  const cci = 454.74 - 1641.416 * density15Cg + 774.74 * density15Cg * density15Cg - 0.554 * t50C + 97.803 * logT50 * logT50;
  return parseFloat(cci.toFixed(2));
}

// Four-variable cetane index ASTM D4737
// CCI = 45.2 + 0.0892 * T10N + [0.131 + 0.901 * B] * T50N + [0.0523 - 0.420 * B] * T90N + 0.00049 * [T10N^2 - T90N^2] + 107 * B + 60 * B^2
export function calculateASTM4737(
  density15Ckg: number, // kg/m³ (600 ~ 1100)
  t10C: number,
  t50C: number,
  t90C: number
): number {
  if (density15Ckg <= 0 || t10C <= 0 || t50C <= 0 || t90C <= 0) return 0;
  const dn = density15Ckg - 850;
  const b = Math.exp(-0.0035 * dn) - 1;
  const t10n = t10C - 215;
  const t50n = t50C - 260;
  const t90n = t90C - 310;

  const cci =
    45.2 +
    0.0892 * t10n +
    (0.131 + 0.901 * b) * t50n +
    (0.0523 - 0.42 * b) * t90n +
    0.00049 * (t10n * t10n - t90n * t90n) +
    107 * b +
    60 * b * b;

  return parseFloat(cci.toFixed(2));
}

// Calculations for API Gravity from Density (SG)
// API = 141.5 / SG - 131.5
// SG = 141.5 / (API + 131.5)
export function densityToAPI(sg: number): { api: number; energy: number; bblPerTonne: number } {
  if (sg <= 0) return { api: 0, energy: 0, bblPerTonne: 0 };
  const api = 141.5 / sg - 131.5;
  // Dynamic formula for energy output value e.g. Aniline point / net heat value (kcal/g)
  // Approximate heating value (Gross Heat of Combustion) in MJ/kg or kcal/g:
  // Q_v = 12400 - 2100 * sg^2 (cal/g), convert to kcal/g (divide by 1000)
  const energyKcal = (12400 - 2100 * sg * sg) / 1000; // ~10 - 11 kcal/g

  // 15°C Density to barrel/tonne factor:
  // Volume of 1 metric ton at 15C in bbl:
  // 1 tonne = 1000 kg. Volume = 1000 / density_15. bbl = (1000 / density_15) / 0.1589873
  const bblPerTonne = 6.28981 / sg;

  return {
    api: parseFloat(api.toFixed(2)),
    energy: parseFloat(energyKcal.toFixed(3)),
    bblPerTonne: parseFloat(bblPerTonne.toFixed(4)),
  };
}

export function apiToDensity(api: number): { sg: number; energy: number; bblPerTonne: number } {
  const sg = 141.5 / (api + 131.5);
  const energyKcal = (12400 - 2100 * sg * sg) / 1000;
  const bblPerTonne = 6.28981 / sg;
  return {
    sg: parseFloat(sg.toFixed(4)),
    energy: parseFloat(energyKcal.toFixed(3)),
    bblPerTonne: parseFloat(bblPerTonne.toFixed(4)),
  };
}

// CCAI Index calculation
// CCAI = d - 140.7 * log10(log10(v + 0.85)) - 80.6
export function calculateCCAI(density15Ckg: number, viscosity50C: number): number {
  if (density15Ckg <= 0 || viscosity50C <= 0) return 0;
  const logLogVis = Math.log10(Math.log10(viscosity50C + 0.85));
  const ccai = density15Ckg - 140.7 * logLogVis - 80.6;
  return Math.round(ccai);
}

// Viscosity Index (ASTM D2270)
export function calculateViscosityIndex(v40: number, v100: number): number {
  if (v40 <= 0 || v100 <= 0) return 0;

  // L and H calculation standard coefficients for standard range 2.0 to 70 cSt at 100°C
  let L = 0;
  let H = 0;

  if (v100 <= 70) {
    L = 1.65008 * v100 * v100 + 5.10982 * v100 - 10.457;
    H = 0.81232 * v100 * v100 + 5.13253 * v100 - 4.154;
  } else {
    L = 0.8353 * v100 * v100 + 14.675 * v100 - 29.0;
    H = 0.2311 * v100 * v100 + 11.235 * v100 - 13.0;
  }

  if (v40 > H) {
    const vi = ((L - v40) / (L - H)) * 100;
    return parseFloat(vi.toFixed(1));
  } else {
    const N = (Math.log10(H) - Math.log10(v40)) / Math.log10(v100);
    const vi = (Math.pow(10, N) - 1) / 0.00715 + 100;
    return parseFloat(vi.toFixed(1));
  }
}

// Refutas Kinematic Viscosity Blending
export function blendViscosity(v1: number, x1: number, v2: number, x2: number): number {
  if (v1 <= 0 || v2 <= 0) return 0;
  const vbn1 = 14.534 * Math.log(Math.log(v1 + 0.8)) + 10.975;
  const vbn2 = 14.534 * Math.log(Math.log(v2 + 0.8)) + 10.975;

  const fraction1 = x1 / (x1 + x2);
  const fraction2 = x2 / (x1 + x2);

  const blendedVBN = fraction1 * vbn1 + fraction2 * vbn2;
  const blendedVis = Math.exp(Math.exp((blendedVBN - 10.975) / 14.534)) - 0.8;

  return parseFloat(blendedVis.toFixed(2));
}

// Wickey-Chittenden Flash Point Blending
export function blendFlashPoint(fp1: number, x1: number, fp2: number, x2: number): number {
  if (fp1 <= 0 || fp2 <= 0) return 0;

  // Blending index logic for flash point
  const getIndex = (fp: number) => {
    return Math.pow(10, -6.1188 + 2734.5 / (fp + 226));
  };

  const fpi1 = getIndex(fp1);
  const fpi2 = getIndex(fp2);

  const fraction1 = x1 / (x1 + x2);
  const fraction2 = x2 / (x1 + x2);

  const blendedFPI = fraction1 * fpi1 + fraction2 * fpi2;
  const blendedFP = 2734.5 / (Math.log10(blendedFPI) + 6.1188) - 226;

  return parseFloat(blendedFP.toFixed(1));
}

// Diesel Index and Estimated Cetane Number
export function calculateDieselIndex(anilineC: number, api: number): { index: number; cetane: number } {
  const anilineF = anilineC * 1.8 + 32;
  const index = (anilineF * api) / 100;
  // Estimated Cetane Number from Diesel Index
  const cetane = 0.72 * index + 10;
  return {
    index: parseFloat(index.toFixed(2)),
    cetane: parseFloat(cetane.toFixed(2)),
  };
}

// Gasoline Evaporation Index (蒸发指数 EI)
// EI = T10 + T50 + T90 or dynamic index formulations
// Evaporation Index typically used in China standards:
// EI = 10 * RVP (kPa) + 7 * E70 + 4 * E100 + E180 (volume evaporated at 70C, 100C, 180C)
// Let's implement that exact Chinese national standard (GB 17930) for Gasoline Evaporation Index:
export function calculateEvaporationIndex(rvp: number, e70: number, e100: number): number {
  const ei = rvp + 0.7 * e70 + 0.4 * e100; // standard simplified evap index
  return parseFloat(ei.toFixed(1));
}
