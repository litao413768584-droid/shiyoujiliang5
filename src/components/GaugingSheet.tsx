import React, { useState } from 'react';
import { calculateStandardDensity, calculateVCF, calculateAsphaltVCF_D4311, calculateSteelExpansionFactor } from '../utils/calculations';
import { 
  Calculator, 
  ClipboardList, 
  HelpCircle, 
  AlertCircle, 
  X, 
  Info, 
  BookOpen, 
  Trash2, 
  Copy, 
  ArrowUpRight, 
  History, 
  Check,
  Thermometer,
  Box,
  Layers
} from 'lucide-react';

interface HistoryItem {
  id: string;
  timestamp: string;
  oilType: 'crude' | 'product' | 'lube' | 'asphalt';
  standardTemp: 15 | 20 | '60F';
  inputs: {
    tempObs: string;
    densityObs: string;
    volumeObs: string;
    tempVol?: string;
    enableSteelExpansion?: boolean;
    steelMaterial?: string;
  };
  results: {
    rhoStd: number;
    vcf: number;
    fst?: number;
    volCorrected?: number;
    gsv: number;
    weightVac: number;
    weightAir: number;
    gsvBbl: number;
  };
}

export default function GaugingSheet() {
  const [densityObs, setDensityObs] = useState<string>('820'); // kg/m³
  const [tempObs, setTempObs] = useState<string>('24.5'); // °C (密度测定温度)
  const [volumeObs, setVolumeObs] = useState<string>('5000'); // m³ (Observed Volume)
  const [tempVol, setTempVol] = useState<string>('24.5'); // °C (体积计算温度)
  const [enableSteelExpansion, setEnableSteelExpansion] = useState<boolean>(false); // 是否计算钢膨
  const [steelMaterial, setSteelMaterial] = useState<'carbon_3a' | 'carbon_2a' | 'stainless_3a' | 'stainless_2a' | 'custom'>('carbon_3a');
  const [customSteelCoeff, setCustomSteelCoeff] = useState<string>('0.000036');

  const [oilType, setOilType] = useState<'crude' | 'product' | 'lube' | 'asphalt'>('product');
  const [standardTemp, setStandardTemp] = useState<15 | 20 | '60F'>(20);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [tempError, setTempError] = useState<string | null>(null);
  const [tempVolError, setTempVolError] = useState<string | null>(null);
  const [densityError, setDensityError] = useState<string | null>(null);
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  // States for outputs
  const [results, setResults] = useState<{
    rhoStd: number;
    vcf: number;
    fst: number;          // 钢膨修正系数
    volCorrected: number; // 修正后体积 (m³)
    gsv: number;
    weightVac: number;
    weightAir: number;
    gsvBbl: number;       // 输油桶数 (bbl)
    rhoStd15: number;     // 15°C下标准密度
    rhoStd20: number;     // 20°C下标准密度
    bblFactor15: number;  // 15°C下的桶/t换算系数
    bblFactor20: number;  // 20°C下的桶/t换算系数
  } | null>(null);

  // Calculation History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('gauging_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const densityRanges = {
    product: { min: 610, max: 1076, desc: '成品油 (推荐: 610.0 ~ 1076.0 kg/m³)' },
    crude: { min: 610, max: 1076, desc: '原油 (推荐: 610.0 ~ 1076.0 kg/m³)' },
    lube: { min: 800, max: 1164, desc: '润滑油 (推荐: 800.0 ~ 1164.0 kg/m³)' },
    asphalt: { min: 850, max: 1200, desc: '沥青 (推荐: 850.0 ~ 1200.0 kg/m³)' },
  };

  const currentRange = densityRanges[oilType];
  const obsDenFloat = parseFloat(densityObs) || 0;
  const isOutOfRange = obsDenFloat > 0 && (obsDenFloat < currentRange.min || obsDenFloat > currentRange.max);

  // Validation helper functions
  const validateTemp = (val: string) => {
    if (val.trim() === '') {
      setTempError('温度值不能为空');
      return false;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setTempError('请输入合法的温度数值');
      return false;
    }
    if (oilType === 'asphalt' && standardTemp === '60F') {
      if (num < -58 || num > 482) {
        setTempError('温度必须在合理物理范围内 (-58.0°F ~ 482.0°F)');
        return false;
      }
    } else {
      if (num < -50 || num > 250) {
        setTempError('温度必须在合理物理范围内 (-50.0°C ~ 250.0°C)');
        return false;
      }
    }
    setTempError(null);
    return true;
  };

  const validateTempVol = (val: string) => {
    if (val.trim() === '') {
      setTempVolError('体积温度不能为空');
      return false;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setTempVolError('请输入合法的数值');
      return false;
    }
    if (oilType === 'asphalt' && standardTemp === '60F') {
      if (num < -58 || num > 482) {
        setTempVolError('温度必须在 (-58.0°F ~ 482.0°F) 范围内');
        return false;
      }
    } else {
      if (num < -50 || num > 250) {
        setTempVolError('温度必须在 (-50.0°C ~ 250.0°C) 范围内');
        return false;
      }
    }
    setTempVolError(null);
    return true;
  };

  const validateDensity = (val: string, currentOilType = oilType) => {
    if (val.trim() === '') {
      setDensityError('密度/API/比重值不能为空');
      return false;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setDensityError('请输入合法的数值');
      return false;
    }
    if (currentOilType === 'asphalt') {
      if (standardTemp === '60F') {
        if (num <= 0) {
          setDensityError('数值必须大于0');
          return false;
        }
      } else {
        if (num < 850 || num > 1200) {
          setDensityError('15°C 沥青标密建议在 850 ~ 1200 kg/m³ 之间');
          return false;
        }
      }
    } else {
      const bounds = densityRanges[currentOilType];
      if (num < bounds.min || num > bounds.max) {
        setDensityError(`密度必须在合理物理范围内 (${bounds.min} ~ ${bounds.max} kg/m³)`);
        return false;
      }
    }
    setDensityError(null);
    return true;
  };

  const validateVolume = (val: string) => {
    if (val.trim() === '') {
      setVolumeError('体积值不能为空');
      return false;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setVolumeError('请输入合法的体积数值');
      return false;
    }
    if (num < 0) {
      setVolumeError('体积不能为负数');
      return false;
    }
    if (num > 10000000) {
      setVolumeError('体积超过合理上限 (最大允许 10,000,000 m³)');
      return false;
    }
    setVolumeError(null);
    return true;
  };

  const calculateGauging = () => {
    setValidationError(null);

    // Run all validations
    const isTempValid = validateTemp(tempObs);
    const isTempVolValid = validateTempVol(tempVol);
    const isDensityValid = validateDensity(densityObs);
    const isVolumeValid = validateVolume(volumeObs);

    if (!isTempValid || !isTempVolValid || !isDensityValid || !isVolumeValid) {
      setValidationError('请修正输入框下方的红色错误提示后再行计算！');
      return;
    }

    const rho = parseFloat(densityObs);
    const tempD = parseFloat(tempObs); // 密度测定温度
    const tempV = parseFloat(tempVol); // 体积测量温度
    const vol = parseFloat(volumeObs) || 0;

    let rhoStd = 0;
    let vcf = 0;

    if (oilType === 'asphalt') {
      // 沥青：参照 ASTM D4311-04
      let rhoInKg = rho;
      if (standardTemp === '60F') {
        if (rho < 2.0) {
          // 比重 SG
          rhoInKg = rho * 999.016;
        } else if (rho <= 50.0) {
          // API 度
          const sg = 141.5 / (rho + 131.5);
          rhoInKg = sg * 999.016;
        }
      }
      rhoStd = rhoInKg;
      // VCF 按照体积温度 tempV 计算
      vcf = calculateAsphaltVCF_D4311(rho, tempV, standardTemp);
    } else {
      const numericTempD = standardTemp === '60F' ? 15 : standardTemp;
      rhoStd = calculateStandardDensity(rho, tempD, numericTempD, oilType);

      // VCF 按照体积温度 tempV 计算
      const numericTempV = standardTemp === '60F' ? 15 : standardTemp;
      vcf = calculateVCF(rhoStd, tempV, numericTempV, oilType);
    }

    // 钢膨修正系数 Fst (按体积温度 tempV 计算)
    let alphaCoeff = 0.000036; // 默认碳钢 3α: 1 + 0.0000120 * 3 * (t - t_std)
    if (steelMaterial === 'carbon_2a') {
      alphaCoeff = 0.000024; // 碳钢 2α: 1 + 0.0000120 * 2 * (t - t_std)
    } else if (steelMaterial === 'stainless_3a') {
      alphaCoeff = 0.000051; // 不锈钢 3α
    } else if (steelMaterial === 'stainless_2a') {
      alphaCoeff = 0.000034; // 不锈钢 2α
    } else if (steelMaterial === 'custom') {
      alphaCoeff = parseFloat(customSteelCoeff) || 0.000036;
    }

    const fst = enableSteelExpansion ? calculateSteelExpansionFactor(tempV, standardTemp, alphaCoeff) : 1.0;

    // 修正后观测体积
    const volCorrected = vol * fst;

    // Gross Standard Volume (GSV) = 修正后体积 * VCF
    const gsv = volCorrected * vcf;

    // Weight in Vacuum (t)
    const weightVac = gsv * (rhoStd / 1000);

    // Weight in Air (t)
    const rhoAir = rhoStd - 1.1;
    const weightAir = gsv * (rhoAir / 1000);

    // Calculate both standard densities to render comparison and barrels factors
    let rhoStd15 = rhoStd;
    let rhoStd20 = rhoStd;
    let bblFactor15 = rhoStd15 > 0 ? 6289.81 / rhoStd15 : 0;
    let bblFactor20 = rhoStd20 > 0 ? 6289.81 / rhoStd20 : 0;

    if (oilType !== 'asphalt') {
      if (standardTemp === 20) {
        rhoStd20 = rhoStd;
        const vcf15 = calculateVCF(rhoStd20, 15, 20, oilType);
        rhoStd15 = rhoStd20 * vcf15;
      } else {
        rhoStd15 = rhoStd;
        const vcf20 = calculateVCF(rhoStd15, 20, 15, oilType);
        rhoStd20 = rhoStd15 * vcf20;
      }
      bblFactor15 = rhoStd15 > 0 ? 6289.81 / rhoStd15 : 0;
      bblFactor20 = rhoStd20 > 0 ? 6289.81 / rhoStd20 : 0;
    }

    // 输油桶数 (GSV in cubic meters * 6.28981 barrels per m³)
    const gsvBbl = gsv * 6.28981;

    const newResults = {
      rhoStd,
      vcf,
      fst,
      volCorrected: parseFloat(volCorrected.toFixed(3)),
      gsv: parseFloat(gsv.toFixed(3)),
      weightVac: parseFloat(weightVac.toFixed(3)),
      weightAir: parseFloat(weightAir.toFixed(3)),
      gsvBbl: parseFloat(gsvBbl.toFixed(2)),
      rhoStd15: parseFloat(rhoStd15.toFixed(2)),
      rhoStd20: parseFloat(rhoStd20.toFixed(2)),
      bblFactor15: parseFloat(bblFactor15.toFixed(5)),
      bblFactor20: parseFloat(bblFactor20.toFixed(5)),
    };

    setResults(newResults);

    // Save to calculation history
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      oilType,
      standardTemp,
      inputs: { tempObs, densityObs, volumeObs, tempVol, enableSteelExpansion, steelMaterial },
      results: {
        rhoStd,
        vcf,
        fst,
        volCorrected: newResults.volCorrected,
        gsv: newResults.gsv,
        weightVac: newResults.weightVac,
        weightAir: newResults.weightAir,
        gsvBbl: newResults.gsvBbl,
      }
    };

    setHistory((prev) => {
      const updated = [historyItem, ...prev].slice(0, 50);
      localStorage.setItem('gauging_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleOilTypeChange = (type: 'crude' | 'product' | 'lube' | 'asphalt') => {
    setOilType(type);
    setValidationError(null);
    setTempError(null);
    setDensityError(null);
    setVolumeError(null);

    let defaultDensity = '820';
    let defaultTemp = '24.5';

    if (type === 'product') {
      defaultDensity = '820';
      defaultTemp = '24.5';
      if (standardTemp === '60F') setStandardTemp(20);
    } else if (type === 'crude') {
      defaultDensity = '860';
      defaultTemp = '28.0';
      if (standardTemp === '60F') setStandardTemp(20);
    } else if (type === 'lube') {
      defaultDensity = '885';
      defaultTemp = '35.0';
      if (standardTemp === '60F') setStandardTemp(20);
    } else if (type === 'asphalt') {
      defaultDensity = '1015';
      if (standardTemp === 20) setStandardTemp(15);
      defaultTemp = standardTemp === '60F' ? '275.0' : '135.0';
    }

    setDensityObs(defaultDensity);
    setTempObs(defaultTemp);
    setResults(null);
  };

  const handleClear = () => {
    setValidationError(null);
    setTempError(null);
    setTempVolError(null);
    setDensityError(null);
    setVolumeError(null);

    let defaultTemp = '24.5';
    if (oilType === 'product') {
      setDensityObs('820');
      defaultTemp = '24.5';
    } else if (oilType === 'crude') {
      setDensityObs('860');
      defaultTemp = '28.0';
    } else if (oilType === 'lube') {
      setDensityObs('885');
      defaultTemp = '35.0';
    } else if (oilType === 'asphalt') {
      setDensityObs('1015');
      defaultTemp = standardTemp === '60F' ? '275.0' : '135.0';
    }
    setTempObs(defaultTemp);
    setTempVol(defaultTemp);
    setVolumeObs('5000');
    setEnableSteelExpansion(false);
    setResults(null);
  };

  // History action handlers
  const handleLoadItem = (item: HistoryItem) => {
    setOilType(item.oilType);
    setStandardTemp(item.standardTemp);
    setTempObs(item.inputs.tempObs);
    setDensityObs(item.inputs.densityObs);
    setVolumeObs(item.inputs.volumeObs);
    setTempVol(item.inputs.tempVol || item.inputs.tempObs);
    setEnableSteelExpansion(item.inputs.enableSteelExpansion || false);
    
    // Clear errors
    setValidationError(null);
    setTempError(null);
    setTempVolError(null);
    setDensityError(null);
    setVolumeError(null);

    const rho = parseFloat(item.inputs.densityObs);
    const tempD = parseFloat(item.inputs.tempObs);
    const tempV = parseFloat(item.inputs.tempVol || item.inputs.tempObs);
    const vol = parseFloat(item.inputs.volumeObs) || 0;

    let rhoStd = 0;
    let vcf = 0;

    if (item.oilType === 'asphalt') {
      rhoStd = rho;
      vcf = calculateAsphaltVCF_D4311(rhoStd, tempV, item.standardTemp);
    } else {
      const numericTempD = item.standardTemp === '60F' ? 15 : item.standardTemp;
      rhoStd = calculateStandardDensity(rho, tempD, numericTempD, item.oilType);

      const numericTempV = item.standardTemp === '60F' ? 15 : item.standardTemp;
      vcf = calculateVCF(rhoStd, tempV, numericTempV, item.oilType);
    }

    let alphaCoeffHist = 0.000036;
    if (item.inputs.steelMaterial === 'carbon_2a') {
      alphaCoeffHist = 0.000024;
    } else if (item.inputs.steelMaterial === 'stainless_3a') {
      alphaCoeffHist = 0.000051;
    } else if (item.inputs.steelMaterial === 'stainless_2a') {
      alphaCoeffHist = 0.000034;
    }

    const fst = item.inputs.enableSteelExpansion
      ? calculateSteelExpansionFactor(tempV, item.standardTemp, alphaCoeffHist)
      : 1.0;

    const volCorrected = vol * fst;
    const gsv = volCorrected * vcf;
    const weightVac = gsv * (rhoStd / 1000);
    const rhoAir = rhoStd - 1.1;
    const weightAir = gsv * (rhoAir / 1000);

    let rhoStd15 = rhoStd;
    let rhoStd20 = rhoStd;
    let bblFactor15 = rhoStd15 > 0 ? 6289.81 / rhoStd15 : 0;
    let bblFactor20 = rhoStd20 > 0 ? 6289.81 / rhoStd20 : 0;

    if (item.oilType !== 'asphalt') {
      if (item.standardTemp === 20) {
        rhoStd20 = rhoStd;
        const vcf15 = calculateVCF(rhoStd20, 15, 20, item.oilType);
        rhoStd15 = rhoStd20 * vcf15;
      } else {
        rhoStd15 = rhoStd;
        const vcf20 = calculateVCF(rhoStd15, 20, 15, item.oilType);
        rhoStd20 = rhoStd15 * vcf20;
      }
      bblFactor15 = rhoStd15 > 0 ? 6289.81 / rhoStd15 : 0;
      bblFactor20 = rhoStd20 > 0 ? 6289.81 / rhoStd20 : 0;
    }

    const gsvBbl = gsv * 6.28981;

    setResults({
      rhoStd,
      vcf,
      fst,
      volCorrected: parseFloat(volCorrected.toFixed(3)),
      gsv: parseFloat(gsv.toFixed(3)),
      weightVac: parseFloat(weightVac.toFixed(3)),
      weightAir: parseFloat(weightAir.toFixed(3)),
      gsvBbl: parseFloat(gsvBbl.toFixed(2)),
      rhoStd15: parseFloat(rhoStd15.toFixed(2)),
      rhoStd20: parseFloat(rhoStd20.toFixed(2)),
      bblFactor15: parseFloat(bblFactor15.toFixed(5)),
      bblFactor20: parseFloat(bblFactor20.toFixed(5)),
    });
  };

  const handleDeleteItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem('gauging_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('gauging_history');
  };

  const handleCopyItem = (item: HistoryItem) => {
    const tempUnit = item.standardTemp === '60F' ? '°F' : '°C';
    const volTemp = item.inputs.tempVol || item.inputs.tempObs;
    const hasSteelExp = item.inputs.enableSteelExpansion;

    const text = `【石油及沥青计量计算结果】
油品类型：${item.oilType === 'product' ? '成品油' : item.oilType === 'crude' ? '原油' : item.oilType === 'lube' ? '润滑油' : '沥青 (ASTM D4311)'}
标准参考：${item.standardTemp === '60F' ? '60°F' : item.standardTemp + '°C'}
--- 输入参数 ---
密度测定温度: ${item.inputs.tempObs} ${tempUnit}
${item.oilType === 'asphalt' ? '标准密度' : '观察密度'}: ${item.inputs.densityObs} kg/m³
计算体积: ${item.inputs.volumeObs} m³
体积计算温度: ${volTemp} ${tempUnit}
钢壁膨胀修正: ${hasSteelExp ? `已开启 (@${volTemp}${tempUnit})` : '未开启'}
--- 计算结果 ---
标准参考密度: ${item.results.rhoStd} kg/m³
体积修正系数 (VCF @ ${volTemp}${tempUnit}): ${item.results.vcf.toFixed(5)}
${hasSteelExp && item.results.fst ? `钢膨修正系数 (Fst @ ${volTemp}${tempUnit}): ${item.results.fst.toFixed(6)}\n钢膨修正后体积: ${item.results.volCorrected?.toLocaleString()} m³\n` : ''}标准体积 (GSV [${hasSteelExp ? `含钢膨@${volTemp}${tempUnit}与VCF` : `含VCF, 无钢膨`}]): ${item.results.gsv.toLocaleString()} m³
商检空气重量 (Mass in Air): ${item.results.weightAir.toLocaleString()} t
真空质量 (Mass in Vac): ${item.results.weightVac.toLocaleString()} t
输油桶数 (GSV bbl): ${item.results.gsvBbl.toLocaleString()} bbl
时间：${item.timestamp}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div id="gauging-sheet-container" className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 overflow-y-auto w-full max-w-2xl mx-auto transition-colors duration-200">
      {/* Title block */}
      <div id="gauging-title" className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 p-3 rounded-2xl mb-4 flex items-start space-x-2">
        <ClipboardList className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-orange-950 dark:text-orange-300">石油及沥青计量表计算 (ASTM D1250 / D4311)</h3>
          <p className="text-xs text-orange-850 dark:text-orange-200/80 leading-normal mt-0.5">
            单机离线版：计算标准密度、体积修正系数 (VCF)、标准体积以及商检空气重量，提供温度-质量-体积转换。
          </p>
          <div className="mt-2.5">
            <button
              onClick={() => setShowFormulaModal(true)}
              id="show-formula-modal-btn"
              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 text-white font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>🔍 ASTM D1250 / D4311 公式计算细节说明</span>
            </button>
          </div>
        </div>
      </div>

      <div id="gauging-main-card" className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-200">
        {/* Toggle Oil Type */}
        <div id="oil-type-selector" className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">油品及沥青种类</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'product', label: '成品油' },
              { id: 'crude', label: '原油' },
              { id: 'lube', label: '润滑油' },
              { id: 'asphalt', label: '沥青' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleOilTypeChange(t.id as any)}
                className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                  oilType === t.id
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Standard Temperature */}
        <div id="std-temp-selector" className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">标准参考温度 (Standard Temp)</label>
          <div className="grid grid-cols-2 gap-2">
            {oilType === 'asphalt' ? (
              [
                { id: 15, label: '15°C (ASTM D4311M 公制)' },
                { id: '60F', label: '60°F (ASTM D4311 英制)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    const newTemp = t.id as any;
                    setStandardTemp(newTemp);
                    if (newTemp === '60F' && (tempObs === '135.0' || tempObs === '24.5')) {
                      setTempObs('275.0');
                    } else if (newTemp === 15 && (tempObs === '275.0' || tempObs === '24.5')) {
                      setTempObs('135.0');
                    }
                    setResults(null);
                  }}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                    standardTemp === t.id
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))
            ) : (
              [
                { id: 20, label: '20°C (中国国标/常规)' },
                { id: 15, label: '15°C (美制/国际)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setStandardTemp(t.id as any);
                    setResults(null);
                  }}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                    standardTemp === t.id
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))
            )}
          </div>
        </div>

        {/* inputs form parameters */}
        <div className="space-y-4">
          {/* Density parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {oilType === 'asphalt'
                  ? `密度测定温度 (${standardTemp === '60F' ? '°F' : '°C'})`
                  : '密度测定温度 / 视温度 (°C)'}
              </label>
              <input
                type="number"
                step="any"
                placeholder={oilType === 'asphalt' ? (standardTemp === '60F' ? '例如 275.0' : '例如 135.0') : '例如 24.5'}
                value={tempObs}
                onChange={(e) => {
                  const val = e.target.value;
                  setTempObs(val);
                  validateTemp(val);
                  setResults(null);
                }}
                className={`w-full bg-slate-50 dark:bg-slate-800 border focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm transition-all focus:outline-hidden font-mono text-slate-800 dark:text-slate-100 ${
                  tempError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
                }`}
              />
              {tempError && (
                <p className="text-red-500 text-[11px] font-sans font-semibold mt-0.5">{tempError}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {oilType === 'asphalt'
                  ? (standardTemp === '60F' ? '60°F API度 (°API) / 比重 (SG 60/60°F)' : '15°C 标准密度 (kg/m³)')
                  : '视密度 / 观察密度 (kg/m³)'}
              </label>
              <input
                type="number"
                step="any"
                placeholder={
                  oilType === 'asphalt'
                    ? (standardTemp === '60F' ? '例如 12.5 (°API) 或 0.985 (SG)' : '例如 1015')
                    : '例如 820'
                }
                value={densityObs}
                onChange={(e) => {
                  const val = e.target.value;
                  setDensityObs(val);
                  validateDensity(val);
                  setResults(null);
                }}
                className={`w-full bg-slate-50 dark:bg-slate-800 border focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm transition-all focus:outline-hidden font-mono text-slate-800 dark:text-slate-100 ${
                  densityError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
                }`}
              />
              {densityError ? (
                <p className="text-red-500 text-[11px] font-sans font-semibold mt-0.5">{densityError}</p>
              ) : (
                /* Dynamic Recommended Range Info */
                <div className="flex justify-between items-center text-[10px] mt-0.5 px-1 leading-none">
                  <span className="text-slate-400 dark:text-slate-500 font-sans">
                    {oilType === 'asphalt'
                      ? (standardTemp === '60F'
                          ? '支持 API度 (≤14.9°A列, 15°~35°B列) / SG (≥0.967A列, 0.85~0.966B列)'
                          : '15°C 标准密度 (A列: ≥966 kg/m³, B列: 850 ~ 965 kg/m³)')
                      : `设计适用范围: ${currentRange.min} ~ ${currentRange.max} kg/m³`}
                  </span>
                  {isOutOfRange && oilType !== 'asphalt' && (
                    <span className="text-amber-600 dark:text-amber-400 font-extrabold font-sans animate-pulse">超出推荐范围</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Volume and Volume Temp section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                计算体积 (Observed Volume - m³)
              </label>
              <input
                type="number"
                step="any"
                placeholder="例如 5000"
                value={volumeObs}
                onChange={(e) => {
                  const val = e.target.value;
                  setVolumeObs(val);
                  validateVolume(val);
                  setResults(null);
                }}
                className={`w-full bg-slate-50 dark:bg-slate-800 border focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm transition-all focus:outline-hidden font-mono text-slate-800 dark:text-slate-100 ${
                  volumeError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
                }`}
              />
              {volumeError && (
                <p className="text-red-500 text-[11px] font-sans font-semibold mt-0.5">{volumeError}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  体积温度 / 罐内油温 ({standardTemp === '60F' ? '°F' : '°C'})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTempVol(tempObs);
                    validateTempVol(tempObs);
                    setResults(null);
                  }}
                  className="text-[10px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer font-sans"
                  title="同密度测定温度"
                >
                  [同密度温度]
                </button>
              </div>
              <input
                type="number"
                step="any"
                placeholder={standardTemp === '60F' ? '例如 76.0' : '例如 24.5'}
                value={tempVol}
                onChange={(e) => {
                  const val = e.target.value;
                  setTempVol(val);
                  validateTempVol(val);
                  setResults(null);
                }}
                className={`w-full bg-slate-50 dark:bg-slate-800 border focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm transition-all focus:outline-hidden font-mono text-slate-800 dark:text-slate-100 ${
                  tempVolError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
                }`}
              />
              {tempVolError ? (
                <p className="text-red-500 text-[11px] font-sans font-semibold mt-0.5">{tempVolError}</p>
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  VCF 与钢膨修正均以此体积温度计算
                </p>
              )}
            </div>
          </div>

          {/* Steel Tank Expansion Option (钢膨选项) */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-steel-expansion"
                  checked={enableSteelExpansion}
                  onChange={(e) => {
                    setEnableSteelExpansion(e.target.checked);
                    setResults(null);
                  }}
                  className="w-4 h-4 rounded-md text-orange-500 focus:ring-orange-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <label htmlFor="enable-steel-expansion" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  计算钢壁热膨胀修正 (钢膨修正 Fst / CTSH)
                </label>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {enableSteelExpansion ? `按温度 ${tempVol}${standardTemp === '60F' ? '°F' : '°C'} 修正` : '未开启 (Fst = 1.0)'}
              </span>
            </div>

            {enableSteelExpansion && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">油罐材质与膨胀计算模式</label>
                  <select
                    value={steelMaterial}
                    onChange={(e) => {
                      setSteelMaterial(e.target.value as any);
                      setResults(null);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-mono text-slate-800 dark:text-slate-200"
                  >
                    <option value="carbon_3a">碳钢罐 - 体膨胀 3α [ Fst = 1 + 0.0000120 × 3 × (t - {standardTemp === '60F' ? '60' : standardTemp}) ]</option>
                    <option value="carbon_2a">碳钢罐 - 罐壁面积 2α [ Fst = 1 + 0.0000120 × 2 × (t - {standardTemp === '60F' ? '60' : standardTemp}) - GB/T 19779 ]</option>
                    <option value="stainless_3a">不锈钢罐 - 体膨胀 3α [ Fst = 1 + 0.0000170 × 3 × (t - {standardTemp === '60F' ? '60' : standardTemp}) ]</option>
                    <option value="stainless_2a">不锈钢罐 - 罐壁面积 2α [ Fst = 1 + 0.0000170 × 2 × (t - {standardTemp === '60F' ? '60' : standardTemp}) ]</option>
                    <option value="custom">自定义系数 (手动输入)</option>
                  </select>
                </div>
                {steelMaterial === 'custom' && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">自定义膨胀总系数 K (1/°C)</label>
                    <input
                      type="number"
                      step="any"
                      value={customSteelCoeff}
                      onChange={(e) => {
                        setCustomSteelCoeff(e.target.value);
                        setResults(null);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-mono text-slate-800 dark:text-slate-200"
                      placeholder="例如 0.000036"
                    />
                  </div>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 sm:col-span-2">
                  * 示例说明：碳钢线膨胀系数 α = 12×10⁻⁶ /°C (0.0000120)。体膨胀公式 Fst = 1 + 0.0000120 × 3 × (t_vol - t_std)；罐壁面积修正公式 Fst = 1 + 0.0000120 × 2 × (t_vol - t_std)。
                </p>
              </div>
            )}
          </div>
        </div>

        {validationError && (
          <div id="validation-alert" className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-2.5 rounded-xl flex items-center space-x-2 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{validationError}</span>
          </div>
        )}

        {/* buttons block */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={calculateGauging}
            className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 text-white font-medium py-2.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-1 cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>开始计算</span>
          </button>
          <button
            onClick={handleClear}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-medium py-2.5 px-4 rounded-xl text-sm transition-all cursor-pointer"
          >
            重置
          </button>
        </div>
      </div>

      {results && (
        <div id="gauging-results" className="mt-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in pb-6 transition-colors duration-200">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">计算结果</h4>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 font-sans">基础标准密度 (ρ{standardTemp})</p>
              <p id="res-rho-std" className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {results.rhoStd} <span className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">kg/m³</span>
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 font-sans">体积修正系数 (VCF @ {tempVol}{standardTemp === '60F' ? '°F' : '°C'})</p>
              <p id="res-vcf" className="text-base font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                {results.vcf.toFixed(5)}
              </p>
            </div>

            {/* Steel Expansion Factor and Corrected Volume */}
            {enableSteelExpansion && (
              <>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-400 dark:text-slate-500 font-sans">钢膨修正系数 (Fst)</p>
                  <p id="res-fst" className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {results.fst.toFixed(6)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-400 dark:text-slate-500 font-sans">钢膨修正后体积 (V_cor)</p>
                  <p id="res-vol-cor" className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {results.volCorrected.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">m³</span>
                  </p>
                </div>
              </>
            )}

            {/* GSV in Barrels (输油桶数) - Required High Visibility Field */}
            <div className="bg-amber-500/10 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-500/20 dark:border-amber-900/30 col-span-2 flex justify-between items-center px-4">
              <div>
                <p className="text-amber-800/80 dark:text-amber-300 font-sans text-[11px] font-bold uppercase tracking-wider">输油桶数 (Standard barrels - bbl)</p>
                <p id="res-gsv-bbl" className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                  {results.gsvBbl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-sans font-normal text-amber-700/80 dark:text-amber-300/80">bbl</span>
                </p>
              </div>
              <div className="text-right border-l border-amber-500/20 dark:border-amber-900/30 pl-4 py-1">
                <p className="text-slate-500 dark:text-slate-400 font-sans text-[11px] font-semibold">标准体积 (GSV)</p>
                <p className="text-[9px] text-amber-700/80 dark:text-amber-300/80 font-sans font-medium">
                  {enableSteelExpansion
                    ? `(含钢膨@${tempVol}${standardTemp === '60F' ? '°F' : '°C'} & VCF)`
                    : `(含VCF@${tempVol}${standardTemp === '60F' ? '°F' : '°C'}, 无钢膨)`}
                </p>
                <p id="res-gsv" className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {results.gsv.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">m³</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 font-sans">真空质量 (Mass in Vac)</p>
              <p id="res-vac" className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {results.weightVac.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">t (吨)</span>
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 font-sans">空气质量 (商检空气重量)</p>
              <p id="res-air" className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {results.weightAir.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">t (吨)</span>
              </p>
            </div>

            {/* BBL/T conversion factors section */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800 col-span-2 space-y-2.5">
              <p className="text-slate-600 dark:text-slate-300 font-sans font-bold border-b border-slate-200/50 dark:border-slate-800 pb-1 text-[11px]">桶/吨 (bbl/t) 换算关系系数 (在各自参考温度下)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-850">
                  <p className="text-slate-400 dark:text-slate-500 font-sans text-[10px]">15°C 标密 ➔ bbl/t 换算系数</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    标密: <span className="font-bold">{results.rhoStd15.toFixed(1)}</span> kg/m³
                  </p>
                  <p className="text-orange-600 dark:text-orange-500 font-extrabold text-[12px] font-mono mt-0.5">
                    {results.bblFactor15.toFixed(5)} <span className="text-[9px] font-sans font-normal text-slate-400 dark:text-slate-500">bbl/t</span>
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-850">
                  <p className="text-slate-400 dark:text-slate-500 font-sans text-[10px]">20°C 标密 ➔ bbl/t 换算系数</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    标密: <span className="font-bold">{results.rhoStd20.toFixed(1)}</span> kg/m³
                  </p>
                  <p className="text-orange-600 dark:text-orange-500 font-extrabold text-[12px] font-mono mt-0.5">
                    {results.bblFactor20.toFixed(5)} <span className="text-[9px] font-sans font-normal text-slate-400 dark:text-slate-500">bbl/t</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculation History Section */}
      <div id="calculation-history-section" className="mt-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 space-y-3 transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">计算历史纪录</h4>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg border border-rose-100 dark:border-rose-950/20 hover:border-rose-200 transition-all cursor-pointer bg-rose-50/50 dark:bg-rose-950/10"
            >
              清空历史
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            暂无计算历史纪录，点击“开始计算”可自动保存
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2 hover:border-orange-200 dark:hover:border-orange-950 transition-all text-xs"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {item.oilType === 'product' ? '成品油' : item.oilType === 'crude' ? '原油' : item.oilType === 'lube' ? '润滑油' : '沥青'}
                    </span>
                    <span className="text-[10px] bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded-md font-semibold font-sans">
                      {item.standardTemp === '60F' ? (item.oilType === 'asphalt' ? '60°F API/SG' : '60°F标密') : `${item.standardTemp}°C标密`}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {item.timestamp}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-850">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 font-sans font-semibold">输入参数</p>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                      密度温: {item.inputs.tempObs} {item.standardTemp === '60F' ? '°F' : '°C'}<br />
                      体积温: {item.inputs.tempVol || item.inputs.tempObs} {item.standardTemp === '60F' ? '°F' : '°C'}<br />
                      密: {item.inputs.densityObs} kg/m³ | 体: {parseFloat(item.inputs.volumeObs).toLocaleString()} m³
                    </p>
                  </div>
                  <div className="sm:col-span-2 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-1.5 sm:pt-0 sm:pl-2">
                    <p className="text-slate-400 dark:text-slate-500 font-sans font-semibold">计算结果</p>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                      标密: <span className="font-bold">{item.results.rhoStd}</span> kg/m³ | 
                      VCF(@{item.inputs.tempVol || item.inputs.tempObs}{item.standardTemp === '60F' ? '°F' : '°C'}): <span className="font-bold text-orange-600 dark:text-orange-400">{item.results.vcf.toFixed(5)}</span><br />
                      标体(GSV): <span className="font-bold">{item.results.gsv.toLocaleString()}</span> m³ 
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans ml-1">
                        [{item.inputs.enableSteelExpansion ? `含钢膨@${item.inputs.tempVol || item.inputs.tempObs}${item.standardTemp === '60F' ? '°F' : '°C'} & VCF` : `无钢膨, 含VCF`}]
                      </span><br />
                      {item.inputs.enableSteelExpansion && item.results.fst ? (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-sans block my-0.5">
                          钢膨修正 Fst(@{item.inputs.tempVol || item.inputs.tempObs}${item.standardTemp === '60F' ? '°F' : '°C'}): <span className="font-mono font-bold">{item.results.fst.toFixed(6)}</span> (修正后体积: {item.results.volCorrected?.toLocaleString()} m³)
                        </span>
                      ) : null}
                      商检空气重: <span className="font-bold text-slate-800 dark:text-slate-200">{item.results.weightAir.toLocaleString()}</span> t | 
                      桶数: <span className="font-bold text-amber-600 dark:text-amber-400">{item.results.gsvBbl.toLocaleString()}</span> bbl
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    onClick={() => handleCopyItem(item)}
                    className="flex items-center space-x-1 px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">已复制!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>复制结果</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleLoadItem(item)}
                    className="flex items-center space-x-1 px-2.5 py-1 text-[11px] rounded-lg border border-orange-200 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-orange-700 dark:text-orange-400 transition-all cursor-pointer"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>加载数据</span>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex items-center justify-center p-1 rounded-lg border border-rose-100 dark:border-rose-950/30 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-600 transition-all cursor-pointer"
                    title="删除记录"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ASTM D1250 / GB/T 1885 Formula Explanation Modal Popup */}
      {showFormulaModal && (
        <div id="formula-explanation-overlay" className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div id="formula-explanation-modal" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-2xl w-full rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/30 dark:bg-slate-900">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">ASTM D1250 计量公式标准细节</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">ASTM D1250-04 / API Ch.11.1 / GB/T 1885</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Contents */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              
              {/* Introduction Badge */}
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/30 rounded-xl p-3 flex items-start space-x-2 text-[11px] text-orange-900 dark:text-orange-300">
                <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <p>
                  本系统内嵌计量算法完全遵循 <strong>ASTM D1250-04 标准物理常数公式</strong>，该标准由美国石油学会 (API MPMS Chapter 11.1) 与美国材料试验学会联合发布。在国内等效采用国家标准 <strong>GB/T 1885-1998《石油计量表》</strong>，专为石油液体计量在不同观察温度下的高精度密度、体积和质量换算而设计，具备高度行业公信力。
                </p>
              </div>

              {/* Formula Section 1 */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 border-l-2 border-orange-500 pl-2">
                  1. 标准密度计算（迭代求解法）
                </h4>
                <p className="text-slate-500 dark:text-slate-400">
                  我们在现场直接测得的是油品在观察温度 t 下的观察密度（视密度 ρ_obs）。要折算到标准参考温度下（中国国标为 20°C，国际结算为 15°C）的标准密度 ρ_std，由于热修正参数与标准密度是隐式关联的，必须采用迭代计算：
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-150 dark:border-slate-800 flex justify-center text-center font-mono font-bold text-[13px] text-slate-800 dark:text-slate-100">
                  ρ_std^(n + 1) = ρ_obs / VCF(ρ_std^(n))
                </div>
                <p className="text-[11px] text-slate-400">
                  * 初始值猜想：设第0次迭代值为观察密度 ρ_std(0) = ρ_obs，经过高精度非线性连续迭代器，直到误差低于 0.01 kg/m³ 时收敛，输出真实的标准参考密度。
                </p>
              </div>

              {/* Formula Section 2 */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 border-l-2 border-orange-500 pl-2">
                  2. 体积修正系数 (VCF) 计算原理
                </h4>
                <p className="text-slate-500 dark:text-slate-400">
                  体积修正系数 (Volume Correction Factor, 俗称温度修正系数) 是标准计量表的核心，它用于修正油品温度背离标准温度所引发的热胀冷缩效应：
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-150 dark:border-slate-800 flex justify-center text-center font-mono font-bold text-[13px] text-slate-800 dark:text-slate-100">
                  VCF = exp( -α · Δt · (1.0 + 0.8 · α · Δt) )
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  其中：
                </p>
                <ul className="list-disc pl-5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <li><strong>Δt</strong> = 观察温度 t - 标准参考温度 t_std (15°C 或 20°C)</li>
                  <li><strong>α</strong> = 对应标准温度下的油液瞬间热膨胀系数。</li>
                </ul>
              </div>

              {/* Formula Section 3 */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 border-l-2 border-orange-500 pl-2">
                  3. 油品膨胀系数分类计算参数
                </h4>
                <p className="text-slate-500 dark:text-slate-400">
                  标准温度下的热膨胀系数 α 并不是常数，而是依据标准密度 ρ_std 通过以下物理特征方程动态计算而得：
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-150 dark:border-slate-800 flex justify-center text-center font-mono font-bold text-[13px] text-slate-800 dark:text-slate-100">
                  α = (K_0 / ρ_std^2) + (K_1 / ρ_std)
                </div>
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl mt-2">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="p-2.5">对应油品及适用标准表</th>
                        <th className="p-2.5 font-mono">K_0</th>
                        <th className="p-2.5 font-mono">K_1</th>
                        <th className="p-2.5">设计适用范围</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <td className="p-2.5 font-semibold">原油 (Crude Oil - Table 53A)</td>
                        <td className="p-2.5 font-mono">613.9723</td>
                        <td className="p-2.5 font-mono">0.0</td>
                        <td className="p-2.5">610.0 ~ 1076.0 kg/m³</td>
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                        <td className="p-2.5 font-semibold">成品油 (Refined Product - Table 53B)</td>
                        <td className="p-2.5 font-mono">186.9696</td>
                        <td className="p-2.5 font-mono">0.48618</td>
                        <td className="p-2.5">610.0 ~ 1076.0 kg/m³</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold">润滑油 (Lubricating Oils - Table 53D)</td>
                        <td className="p-2.5 font-mono">0.0</td>
                        <td className="p-2.5 font-mono">0.6278</td>
                        <td className="p-2.5">800.0 ~ 1164.0 kg/m³</td>
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                        <td className="p-2.5 font-semibold">沥青 (Asphalt - ASTM D4311 / D4311M)</td>
                        <td className="p-2.5 text-center text-slate-500" colSpan={2}>
                          D4311-04 沥青多项式 (Group A/B 多项式拟合计算)
                        </td>
                        <td className="p-2.5">850.0 ~ 1200.0 kg/m³</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formula Section 4 */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 border-l-2 border-orange-500 pl-2">
                  4. 真空质量与空气质量（商业浮力扣除）
                </h4>
                <p className="text-slate-500 dark:text-slate-400">
                  液体石油在大宗海运、仓储检尺交易时，由于存在庞大空气浮力，需要折算为商检法定商业空气重量：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">真空质量 (Mass in Vac)</p>
                    <p className="font-mono text-orange-600 dark:text-orange-400 font-bold text-[12px]">W_vac = GSV · (ρ_std / 1000)</p>
                    <p className="text-[10px] text-slate-400">物理学上的绝对真空条件质量（无空气浮力影响）</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">空气质量 (Weight in Air - 商检净重)</p>
                    <p className="font-mono text-orange-600 dark:text-orange-400 font-bold text-[12px]">W_air = GSV · ((ρ_std - 1.1) / 1000)</p>
                    <p className="text-[10px] text-slate-400">减去 1.1 kg/m³ 浮力常量，为港口天平及地磅所得真实商检重量</p>
                  </div>
                </div>
              </div>

              {/* Formula Section 5 */}
              <div className="space-y-2 pb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 border-l-2 border-orange-500 pl-2">
                  5. 国际桶数换算与双标准温度换算因子
                </h4>
                <p className="text-slate-500 dark:text-slate-400">
                  本套件自带国际、国内双参考温度（15°C / 20°C）双向密度转换引擎：
                </p>
                <ul className="list-disc pl-5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <li><strong>标准容积 (GSV) 折算美制桶 (bbl)</strong>：1 立方米 (m³) 恒等于 6.289811 标准桶 (bbl)。</li>
                  <li><strong>桶/吨 (bbl/t) 转换系数</strong>：在大宗交割中常用于对单价进行结算：</li>
                </ul>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-150 dark:border-slate-800 flex justify-center text-center font-mono font-bold text-[12px] text-slate-800 dark:text-slate-100">
                  Factor_bbl/t = 6289.81 / ρ_std
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                我知道了，返回计算
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
