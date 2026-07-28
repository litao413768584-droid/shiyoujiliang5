import React, { useState } from 'react';
import {
  densityToAPI,
  apiToDensity,
  blendFlashPoint,
  calculateVCF,
} from '../utils/calculations';
import { Settings, Sparkles, Info } from 'lucide-react';

interface CalculationTool {
  id: string;
  name: string;
  description: string;
  category: string;
  component: React.ComponentType;
}

// 1. API Gravity & Density @ 60°F
function APIDensityTool() {
  const [apiIn, setApiIn] = useState('32.0');
  const [sgIn, setSgIn] = useState('0.8654');
  const [mode, setMode] = useState<'api' | 'sg'>('api');

  const apiRes = apiToDensity(parseFloat(apiIn) || 0);
  const sgRes = densityToAPI(parseFloat(sgIn) || 0.0001);

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 transition-colors">
        <button
          onClick={() => setMode('api')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mode === 'api' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          API度 ➔ 比重 (SG)
        </button>
        <button
          onClick={() => setMode('sg')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mode === 'sg' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          比重 (SG) ➔ API度
        </button>
      </div>

      {mode === 'api' ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">输入 API 度 (0.0 ~ 100.0)</label>
          <input
            type="number"
            step="any"
            value={apiIn}
            onChange={(e) => setApiIn(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm transition-all focus:outline-hidden font-mono text-slate-800 dark:text-slate-100"
          />
          <div className="bg-orange-50/50 dark:bg-orange-950/10 p-3 rounded-xl border border-orange-100/30 dark:border-orange-900/20 text-xs text-slate-700 dark:text-slate-300 space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">15.6°C 对应比重 (SG)：</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{apiRes.sg}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">预计燃烧值 (kcal/g)：</span>
              <span className="font-bold text-slate-850 dark:text-slate-200">{apiRes.energy} kcal/g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">换算系数桶/吨 (bbl/t)：</span>
              <span className="font-bold text-slate-850 dark:text-slate-200">{apiRes.bblPerTonne}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">输入比重 SG @ 60°F / 15.6°C</label>
          <input
            type="number"
            step="any"
            value={sgIn}
            onChange={(e) => setSgIn(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm transition-all focus:outline-hidden font-mono text-slate-800 dark:text-slate-100"
          />
          <div className="bg-orange-50/50 dark:bg-orange-950/10 p-3 rounded-xl border border-orange-100/30 dark:border-orange-900/20 text-xs text-slate-700 dark:text-slate-300 space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">换算 API 度 (API Gravity)：</span>
              <span className="font-bold text-orange-600 dark:text-orange-400 text-sm">{sgRes.api}° API</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">预计燃烧值 (kcal/g)：</span>
              <span className="font-bold text-slate-850 dark:text-slate-200">{sgRes.energy} kcal/g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">系数桶/吨 (bbl/t)：</span>
              <span className="font-bold text-slate-850 dark:text-slate-200">{sgRes.bblPerTonne}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Weight & Volume Conversion with Air Buoyancy Correction
function VolMassTool() {
  const [activeTab, setActiveTab] = useState<'mass' | 'vol'>('mass');
  const [volume, setVolume] = useState('1000'); // L or m³
  const [volUnit, setVolUnit] = useState<'L' | 'm3'>('L');
  const [density, setDensity] = useState('840'); // kg/m³ or g/cm³
  const [mass, setMass] = useState('1.5'); // t
  const [massInputType, setMassInputType] = useState<'air' | 'vac'>('air'); // Known mass is Air mass or Vac mass
  const [enableBuoyancy, setEnableBuoyancy] = useState(true);
  const [airDensity, setAirDensity] = useState('1.1'); // kg/m³

  const denVal = parseFloat(density) || 0;
  // Normalize density to kg/m³
  const rhoKg = denVal > 10 ? denVal : denVal * 1000;
  const airRhoKg = enableBuoyancy ? (parseFloat(airDensity) || 1.1) : 0;
  const rhoAirKg = Math.max(0, rhoKg - airRhoKg);

  // Volume in m³
  const volVal = parseFloat(volume) || 0;
  const volM3 = volUnit === 'L' ? volVal / 1000 : volVal;

  // 1. Volume -> Mass
  const massVacT = (volM3 * rhoKg) / 1000;
  const massAirT = (volM3 * rhoAirKg) / 1000;
  const buoyancyDiffT = massVacT - massAirT;

  // 2. Mass -> Volume
  const massValT = parseFloat(mass) || 0;
  let compVolM3 = 0;
  let compVolM3Vac = 0;
  if (massInputType === 'air') {
    compVolM3 = rhoAirKg > 0 ? (massValT * 1000) / rhoAirKg : 0;
    compVolM3Vac = rhoKg > 0 ? (massValT * 1000) / rhoKg : 0;
  } else {
    compVolM3 = rhoKg > 0 ? (massValT * 1000) / rhoKg : 0;
    compVolM3Vac = compVolM3;
  }

  return (
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 transition-colors">
        <button
          onClick={() => setActiveTab('mass')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'mass' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          已知体积 ➔ 计算质量
        </button>
        <button
          onClick={() => setActiveTab('vol')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'vol' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          已知质量 ➔ 计算体积
        </button>
      </div>

      {/* Air Buoyancy Correction Control Panel */}
      <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-orange-950 dark:text-orange-300 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>空气浮力修正 (商检/国标 GB/T 1885)</span>
          </label>
          <button
            type="button"
            onClick={() => setEnableBuoyancy(!enableBuoyancy)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              enableBuoyancy
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {enableBuoyancy ? '已开启浮力修正' : '未开启 (纯真空)'}
          </button>
        </div>

        {enableBuoyancy && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">空气密度 ρ_air (kg/m³)</span>
              <input
                type="number"
                step="any"
                value={airDensity}
                onChange={(e) => setAirDensity(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 focus:border-orange-500 rounded-lg px-2.5 py-1 font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden"
                placeholder="1.1"
              />
            </div>
            <div className="flex flex-col justify-end text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 font-mono">
              <div>
                折算视密度 ρ_air = <span className="font-bold text-orange-600 dark:text-orange-400">{rhoAirKg.toFixed(1)}</span> kg/m³
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                (常规取 1.1 kg/m³，对应 ρ_air = ρ_vac - 1.1)
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Density Input */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300">油品密度</label>
            <span className="text-[11px] text-slate-400 font-mono">当前: {rhoKg.toFixed(1)} kg/m³ ({ (rhoKg / 1000).toFixed(4) } g/cm³)</span>
          </div>
          <input
            type="number"
            step="any"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            placeholder="例如 840 或 0.840"
            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm font-mono focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
        </div>

        {activeTab === 'mass' ? (
          <>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">输入体积数</label>
                <div className="flex space-x-1">
                  {(['L', 'm3'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setVolUnit(unit)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                        volUnit === unit
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {unit === 'L' ? '升 (L)' : '立方米 (m³)'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="any"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm font-mono focus:outline-hidden text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Results Grid */}
            <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-400">商检空气中质量 (Weight in Air)：</span>
                <span className="font-bold text-lg text-orange-600 dark:text-orange-400 font-mono">
                  {isNaN(massAirT) ? '0.000' : massAirT.toFixed(3)} t
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 dark:text-slate-400">真空中质量 (Weight in Vacuum)：</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {isNaN(massVacT) ? '0.000' : massVacT.toFixed(3)} t
                </span>
              </div>
              {enableBuoyancy && (
                <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 font-mono">
                  <span>空气浮力扣减值 (Δm)：</span>
                  <span>
                    -{(buoyancyDiffT * 1000).toFixed(2)} kg (-{buoyancyDiffT.toFixed(3)} t)
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">输入质量数 (单位：重量吨 / t)</label>
                <div className="flex space-x-1">
                  {(['air', 'vac'] as const).map((mType) => (
                    <button
                      key={mType}
                      type="button"
                      onClick={() => setMassInputType(mType)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                        massInputType === mType
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {mType === 'air' ? '商检空气重量' : '真空中重量'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="any"
                value={mass}
                onChange={(e) => setMass(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm font-mono focus:outline-hidden text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Results Grid */}
            <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-400">计算所得体积 (L / 升)：</span>
                <span className="font-bold text-lg text-orange-600 dark:text-orange-400 font-mono">
                  {isNaN(compVolM3) ? '0.00' : (compVolM3 * 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 dark:text-slate-400">计算所得体积 (m³ / 立方米)：</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {isNaN(compVolM3) ? '0.00' : compVolM3.toFixed(3)} m³
                </span>
              </div>
              {enableBuoyancy && massInputType === 'air' && (
                <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 font-mono">
                  <span>不修正浮力时(真空)体积：</span>
                  <span>
                    {compVolM3Vac.toFixed(3)} m³ (差异: {(compVolM3 - compVolM3Vac).toFixed(3)} m³)
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 3. 20°C / 15°C 标准密度双向换算
function StdDensityConvertTool() {
  const [oilType, setOilType] = useState<'crude' | 'product' | 'lube' | 'asphalt'>('product');
  const [direction, setDirection] = useState<'20to15' | '15to20'>('20to15');
  const [inputDensity, setInputDensity] = useState('830'); // kg/m³

  const denVal = parseFloat(inputDensity) || 0;
  
  let targetDensity = 0;
  let vcfUsed = 1.0;
  let alphaUsed = 0.0;

  if (denVal > 0) {
    if (direction === '20to15') {
      vcfUsed = calculateVCF(denVal, 15, 20, oilType);
      targetDensity = denVal * vcfUsed;
    } else {
      vcfUsed = calculateVCF(denVal, 20, 15, oilType);
      targetDensity = denVal * vcfUsed;
    }
    
    // Compute alpha used to show info
    if (oilType === 'asphalt') {
      alphaUsed = 0.00061;
    } else {
      const rhoStd = direction === '20to15' ? denVal : targetDensity;
      let k0 = 0.0;
      let k1 = 0.0;
      if (oilType === 'crude') {
        k0 = 613.9723;
      } else if (oilType === 'product') {
        k0 = 186.9696;
        k1 = 0.48618;
      } else {
        k0 = 0.0;
        k1 = 0.6278;
      }
      alphaUsed = k0 / (rhoStd * rhoStd) + k1 / rhoStd;
      if (alphaUsed <= 0) alphaUsed = 0.0008;
    }
  }

  const getRangeInfo = (type: typeof oilType) => {
    switch (type) {
      case 'product': return { label: '成品油', min: 610, max: 1076 };
      case 'crude': return { label: '原油', min: 610, max: 1076 };
      case 'lube': return { label: '润滑油', min: 800, max: 1164 };
      case 'asphalt': return { label: '沥青', min: 850, max: 1200 };
    }
  };

  const range = getRangeInfo(oilType);
  const isOutOfRange = denVal > 0 && (denVal < range.min || denVal > range.max);

  const bblTonneSource = denVal > 0 ? (6289.81 / denVal).toFixed(4) : '0.0000';
  const bblTonneTarget = targetDensity > 0 ? (6289.81 / targetDensity).toFixed(4) : '0.0000';

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 transition-colors">
        <button
          onClick={() => setDirection('20to15')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            direction === '20to15' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          20°C 标密 ➔ 15°C 标密
        </button>
        <button
          onClick={() => setDirection('15to20')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            direction === '15to20' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          15°C 标密 ➔ 20°C 标密
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">油品种类</label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: 'product', label: '成品油' },
            { id: 'crude', label: '原油' },
            { id: 'lube', label: '润滑油' },
            { id: 'asphalt', label: '沥青' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setOilType(item.id as any);
                if (item.id === 'asphalt') {
                  setInputDensity('1015');
                } else if (item.id === 'crude') {
                  setInputDensity('860');
                } else if (item.id === 'lube') {
                  setInputDensity('885');
                } else {
                  setInputDensity('830');
                }
              }}
              className={`py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                oilType === item.id
                  ? 'bg-orange-100 dark:bg-orange-950/40 border-orange-300 dark:border-orange-900/50 text-orange-700 dark:text-orange-400'
                  : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            底物标准密度 ({direction === '20to15' ? '20°C' : '15°C'})
          </label>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            适用建议: {range.min} ~ {range.max} kg/m³
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            step="any"
            value={inputDensity}
            onChange={(e) => setInputDensity(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm font-mono focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
          <span className="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-mono">kg/m³</span>
        </div>
        {isOutOfRange && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
            ⚠ 当前输入密度超出该油品的标准计量范围 ({range.min} ~ {range.max} kg/m³)。
          </p>
        )}
      </div>

      <div className="bg-orange-50/50 dark:bg-orange-950/10 p-3.5 rounded-xl border border-orange-100 dark:border-orange-900/20 text-xs text-slate-700 dark:text-slate-300 space-y-2 font-mono">
        <div className="flex justify-between items-baseline border-b border-orange-200/40 dark:border-orange-900/20 pb-1.5 mb-1.5">
          <span className="font-sans font-semibold text-orange-950 dark:text-orange-400">
            折算标准密度 ({direction === '20to15' ? '15°C' : '20°C'})：
          </span>
          <span className="text-base font-bold text-orange-600 dark:text-orange-400 text-right">
            {targetDensity > 0 ? targetDensity.toFixed(2) : '0.00'} <span className="text-xs text-orange-500">kg/m³</span>
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400 font-sans">对应克/立方厘米 (g/cm³)：</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {targetDensity > 0 ? (targetDensity / 1000).toFixed(5) : '0.00000'}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400 font-sans">热膨胀系数 (alpha @ 15°C)：</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {alphaUsed > 0 ? alphaUsed.toExponential(5) : '0.00000'}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400 font-sans">体积修正系数 (VCF)：</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {vcfUsed.toFixed(5)}
          </span>
        </div>
        <div className="pt-1.5 border-t border-orange-200/20 dark:border-orange-900/20 grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-orange-100/20 dark:border-orange-900/10 text-center">
            <p className="text-slate-400 dark:text-slate-500 font-sans">原温下桶/吨系数</p>
            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{bblTonneSource} bbl/t</p>
          </div>
          <div className="bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-orange-100/20 dark:border-orange-900/10 text-center">
            <p className="text-slate-400 dark:text-slate-500 font-sans">目标下桶/吨系数</p>
            <p className="font-bold text-orange-600 dark:text-orange-400 mt-0.5">{bblTonneTarget} bbl/t</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. Flash Point Blend (Wickey-Chittenden Method)
function FlashPointBlendTool() {
  const [fp1, setFp1] = useState('65');
  const [x1, setX1] = useState('50');
  const [fp2, setFp2] = useState('45');
  const [x2, setX2] = useState('50');

  const blended = blendFlashPoint(
    parseFloat(fp1) || 0,
    parseFloat(x1) || 0,
    parseFloat(fp2) || 0,
    parseFloat(x2) || 0
  );

  return (
    <div className="space-y-3 text-xs font-mono">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
          <p className="font-sans font-bold text-slate-700 dark:text-slate-300">油品 A</p>
          <div className="space-y-1">
            <span className="font-sans text-[10px] text-slate-400 dark:text-slate-500">闪点 (°C)</span>
            <input
              type="number"
              value={fp1}
              onChange={(e) => setFp1(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>
          <div className="space-y-1">
            <span className="font-sans text-[10px] text-slate-400 dark:text-slate-500">体积比例 (%)</span>
            <input
              type="number"
              value={x1}
              onChange={(e) => setX1(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
          <p className="font-sans font-bold text-slate-700 dark:text-slate-300">油品 B</p>
          <div className="space-y-1">
            <span className="font-sans text-[10px] text-slate-400 dark:text-slate-500">闪点 (°C)</span>
            <input
              type="number"
              value={fp2}
              onChange={(e) => setFp2(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>
          <div className="space-y-1">
            <span className="font-sans text-[10px] text-slate-400 dark:text-slate-500">体积比例 (%)</span>
            <input
              type="number"
              value={x2}
              onChange={(e) => setX2(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="bg-orange-50 dark:bg-orange-950/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/20 flex justify-between items-center font-sans text-xs">
        <span className="font-bold text-slate-800 dark:text-slate-200">混合后预测闪点：</span>
        <span id="blend-flash-out" className="font-bold text-lg text-orange-600 dark:text-orange-400 font-mono">
          {blended} °C
        </span>
      </div>
    </div>
  );
}

// 5. Mixed Density 加权密度计算
function MixedDensityTool() {
  const [da, setDa] = useState('0.825');
  const [va, setVa] = useState('60');
  const [db, setDb] = useState('0.875');
  const [vb, setVb] = useState('40');

  const mixedDen =
    (parseFloat(da) * parseFloat(va) + parseFloat(db) * parseFloat(vb)) /
    (parseFloat(va) + parseFloat(vb));

  return (
    <div className="space-y-3 text-xs font-mono">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-slate-700 dark:text-slate-300">
          <span className="font-sans text-slate-400 dark:text-slate-500 block">油品A比重/密度</span>
          <input
            type="number"
            value={da}
            onChange={(e) => setDa(e.target.value)}
            className="w-full p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md"
          />
          <span className="font-sans text-slate-400 dark:text-slate-500 block">配比/体积比 (L)</span>
          <input
            type="number"
            value={va}
            onChange={(e) => setVa(e.target.value)}
            className="w-full p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md"
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-slate-700 dark:text-slate-300">
          <span className="font-sans text-slate-400 dark:text-slate-500 block">油品B比重/密度</span>
          <input
            type="number"
            value={db}
            onChange={(e) => setDb(e.target.value)}
            className="w-full p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md"
          />
          <span className="font-sans text-slate-400 dark:text-slate-500 block">配比/体积比 (L)</span>
          <input
            type="number"
            value={vb}
            onChange={(e) => setVb(e.target.value)}
            className="w-full p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md"
          />
        </div>
      </div>

      <div className="bg-orange-50 dark:bg-orange-950/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/20 flex justify-between items-center font-sans">
        <span className="font-bold text-slate-800 dark:text-slate-200">调和所得质量平均密度：</span>
        <span id="mixed-den-out" className="text-lg font-bold font-mono text-orange-600 dark:text-orange-400">
          {mixedDen.toFixed(4)} g/cm³
        </span>
      </div>
    </div>
  );
}

// Core main parent component
export default function OtherCalculations() {
  const [activeToolId, setActiveToolId] = useState<string>('api_density');

  const tools: CalculationTool[] = [
    {
      id: 'api_density',
      name: 'API度与比重 15.6°C(60°F)',
      description: '华氏60度(15.6°C)下石油比重(SG)与美标API度双向互换计算并提取桶/吨因子。',
      category: '密度换算',
      component: APIDensityTool,
    },
    {
      id: 'vol_mass',
      name: '油品体积/质量计算',
      description: '在已知密度和体积数的情况下，快速折算净重（吨）；或已知质量折算公升/立方。',
      category: '数量计算',
      component: VolMassTool,
    },
    {
      id: 'std_density_convert',
      name: '20°C / 15°C 标准密度换算 (ASTM D1250)',
      description: '国家标准20°C标准真空密度与国际常用15°C标准密度在大宗油品下的双向ASTM高精度快速折算转换。',
      category: '密度换算',
      component: StdDensityConvertTool,
    },
    {
      id: 'flash_point_blend',
      name: '柴油调和/混合油品闪点计算 (Wickey)',
      description: '使用 Wickey-Chittenden 计算方法，根据非线性闪点指数进行液体调成混合闪点估算。',
      category: '品质计算',
      component: FlashPointBlendTool,
    },
    {
      id: 'mixed_density',
      name: '混合油品密度计算',
      description: '混合油品A与B（体积配比）重组后的多相工艺流密度混合加权计算。',
      category: '密度换算',
      component: MixedDensityTool,
    }
  ];

  const activeTool = tools.find((t) => t.id === activeToolId) || tools[0];
  const ActiveComponent = activeTool.component;

  return (
    <div id="others-calc-container" className="flex flex-col md:flex-row h-full min-h-[500px] transition-colors duration-200">
      {/* Side widgets directory tree list */}
      <div id="others-sidebar" className="w-full md:w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 overflow-y-auto max-h-[300px] md:max-h-full transition-colors">
        <div id="others-sidebar-header" className="p-3 bg-slate-100 dark:bg-slate-850 flex items-center space-x-2 text-slate-600 dark:text-slate-300 border-b border-slate-200/50 dark:border-slate-800">
          <Settings className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold font-sans uppercase tracking-wider">选择石油计算子工具</span>
        </div>
        <div className="p-2 space-y-1">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveToolId(t.id)}
              className={`w-full text-left p-2.5 rounded-xl cursor-pointer transition-all flex items-start space-x-2 border ${
                activeToolId === t.id
                  ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30 text-orange-950 dark:text-orange-300 font-semibold'
                  : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                <Sparkles className={`w-3.5 h-3.5 ${activeToolId === t.id ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`} />
              </div>
              <div className="leading-tight">
                <p className="text-xs">{t.name}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">{t.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main calculation sheet viewport */}
      <div id="others-main-view" className="flex-1 p-4 bg-white dark:bg-slate-900 flex flex-col justify-start overflow-y-auto transition-colors duration-200">
        <div id="others-view-header" className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
            <span>{activeTool.name}</span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 flex items-start space-x-1 leading-normal font-sans font-medium">
            <Info className="w-3.5 h-3.5 text-slate-300 dark:text-slate-500 shrink-0 mt-0.5" />
            <span>{activeTool.description}</span>
          </p>
        </div>

        {/* Dynamic calculation widget wrapper */}
        <div id="others-dynamic-widget" className="bg-white dark:bg-slate-900 max-w-xl transition-colors">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
