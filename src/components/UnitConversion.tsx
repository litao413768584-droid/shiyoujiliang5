import React, { useState } from 'react';
import { UnitCategory, UnitType } from '../types';
import { BookOpen, HelpCircle } from 'lucide-react';

const UNIT_CATEGORIES: UnitCategory[] = [
  {
    type: 'volume',
    name: '体积 (Volume)',
    standardUnit: 'm3',
    units: [
      { id: 'm3', name_en: 'm³', name_zh: '立方米', factor: 1.0 },
      { id: 'l', name_en: 'l', name_zh: '升', factor: 0.001 },
      { id: 'us_gal', name_en: 'us gal', name_zh: '(美)加仑', factor: 0.003785411784 },
      { id: 'bbl', name_en: 'bbl', name_zh: '(美)桶', factor: 0.158987294928 },
      { id: 'uk_gal', name_en: 'uk gal', name_zh: '(英)加仑', factor: 0.00454609 },
      { id: 'cu_yd', name_en: 'cu yd', name_zh: '立方码', factor: 0.764554857984 },
      { id: 'oz_uk', name_en: 'oz (UK)', name_zh: '英制液体盎司', factor: 0.0000284130625 },
      { id: 'oz_us', name_en: 'oz (US)', name_zh: '美制液体盎司', factor: 0.0000295735295625 },
      { id: 'cu_ft', name_en: 'cu ft', name_zh: '立方英尺', factor: 0.028316846592 },
      { id: 'cu_in', name_en: 'cu in', name_zh: '立方英寸', factor: 0.000016387064 },
    ],
  },
  {
    type: 'length',
    name: '长度 (Length)',
    standardUnit: 'm',
    units: [
      { id: 'km', name_en: 'km', name_zh: '公里', factor: 1000.0 },
      { id: 'm', name_en: 'm', name_zh: '米', factor: 1.0 },
      { id: 'yd', name_en: 'yd', name_zh: '码', factor: 0.9144 },
      { id: 'ft', name_en: 'ft', name_zh: '英尺', factor: 0.3048 },
      { id: 'in', name_en: 'in', name_zh: '英寸', factor: 0.0254 },
      { id: 'fur', name_en: 'fur', name_zh: '弗隆', factor: 201.168 },
      { id: 'nmi', name_en: 'nmi', name_zh: '海里', factor: 1852.0 },
      { id: 'mi', name_en: 'mi', name_zh: '英里', factor: 1609.344 },
    ],
  },
  {
    type: 'weight',
    name: '重量/质量 (Weight/Mass)',
    standardUnit: 'kg',
    units: [
      { id: 't', name_en: 't', name_zh: '吨', factor: 1000.0 },
      { id: 'kg', name_en: 'kg', name_zh: '公斤/千克', factor: 1.0 },
      { id: 'st', name_en: 'st', name_zh: '短吨', factor: 907.18474 },
      { id: 'lt', name_en: 'lt', name_zh: '长吨', factor: 1016.0469088 },
      { id: 'lb', name_en: 'lb', name_zh: '磅', factor: 0.45359237 },
      { id: 'oz', name_en: 'oz', name_zh: '盎司', factor: 0.028349523125 },
    ],
  },
  {
    type: 'temperature',
    name: '温度 (Temperature)',
    standardUnit: 'C',
    units: [
      { id: 'C', name_en: '°C', name_zh: '摄氏度', factor: 1.0 },
      { id: 'F', name_en: '°F', name_zh: '华氏度', factor: 1.0 },
      { id: 'K', name_en: 'K', name_zh: '开氏度', factor: 1.0 },
      { id: 'Ra', name_en: 'Ra', name_zh: '兰氏度', factor: 1.0 },
      { id: 'Re', name_en: 'Re', name_zh: '列氏度', factor: 1.0 },
    ],
  },
  {
    type: 'energy',
    name: '热功 (Energy)',
    standardUnit: 'J',
    units: [
      { id: 'J', name_en: 'J', name_zh: '焦耳', factor: 1.0 },
      { id: 'cal', name_en: 'cal', name_zh: '卡', factor: 4.1868 },
      { id: 'kcal', name_en: 'kcal', name_zh: '千卡 (大卡)', factor: 4186.8 },
      { id: 'btu', name_en: 'btu', name_zh: '英热单位', factor: 1055.05585262 },
      { id: 'kg_m', name_en: 'kg·m', name_zh: '公斤·米', factor: 9.80665 },
      { id: 'ft_lb', name_en: 'ft·lb', name_zh: '英尺·磅', factor: 1.35581794833 },
      { id: 'ps_h', name_en: 'ps·h', name_zh: '米制马力·时', factor: 2647795.5 },
      { id: 'hp_h', name_en: 'hp·h', name_zh: '英制马力·时', factor: 2684519.5 },
      { id: 'kw_h', name_en: 'kW·h', name_zh: '千瓦·时', factor: 3600000.0 },
    ],
  },
  {
    type: 'density',
    name: '密度 (Density)',
    standardUnit: 'kg_m3',
    units: [
      { id: 'kg_m3', name_en: 'kg/m³', name_zh: '千克/立方米', factor: 1.0 },
      { id: 'lb_ft3', name_en: 'lb/ft³', name_zh: '磅/立方英尺', factor: 16.018463 },
      { id: 'lb_in3', name_en: 'lb/in³', name_zh: '磅/立方英寸', factor: 27679.9 },
      { id: 'lb_us_gal', name_en: 'lb/gal(US)', name_zh: '磅/美加仑', factor: 119.826427 },
      { id: 'lb_uk_gal', name_en: 'lb/gal(UK)', name_zh: '磅/英加仑', factor: 99.776372 },
      { id: 'lb_bbl', name_en: 'lb/bbl', name_zh: '磅/石油桶', factor: 2.85301 },
    ],
  },
  {
    type: 'pressure',
    name: '压力 (Pressure)',
    standardUnit: 'Pa',
    units: [
      { id: 'MPa', name_en: 'MPa', name_zh: '兆帕', factor: 1000000.0 },
      { id: 'kPa', name_en: 'kPa', name_zh: '千帕', factor: 1000.0 },
      { id: 'Pa', name_en: 'Pa', name_zh: '帕斯卡', factor: 1.0 },
      { id: 'psi', name_en: 'psi', name_zh: '磅力/平方英寸', factor: 6894.757 },
      { id: 'psf', name_en: 'psf', name_zh: '磅力/平方英尺', factor: 47.880258 },
      { id: 'kgf_cm2', name_en: 'kgf/cm²', name_zh: '公斤力/平方厘米', factor: 98066.5 },
      { id: 'atm', name_en: 'atm', name_zh: '标准大气压', factor: 101325.0 },
      { id: 'bar', name_en: 'bar', name_zh: '巴', factor: 100000.0 },
      { id: 'mmHg', name_en: 'mmHg', name_zh: '毫米汞柱', factor: 133.322387 },
      { id: 'inHg', name_en: 'in Hg', name_zh: '英寸汞柱', factor: 3386.388 },
      { id: 'mmH2O', name_en: 'mm H2O', name_zh: '毫米水柱', factor: 9.80665 },
    ],
  },
  {
    type: 'area',
    name: '面积 (Area)',
    standardUnit: 'm2',
    units: [
      { id: 'm2', name_en: 'm²', name_zh: '平方米', factor: 1.0 },
      { id: 'km2', name_en: 'km²', name_zh: '平方千米', factor: 1000000.0 },
      { id: 'sq_ft', name_en: 'sq.ft', name_zh: '平方英尺', factor: 0.09290304 },
      { id: 'sq_in', name_en: 'sq.in', name_zh: '平方英寸', factor: 0.00064516 },
      { id: 'sq_mi', name_en: 'sq.mi', name_zh: '平方英里', factor: 2589988.110336 },
      { id: 'ha', name_en: 'ha', name_zh: '公顷', factor: 10000.0 },
      { id: 'acre', name_en: 'acre', name_zh: '英亩', factor: 4046.8564224 },
      { id: 'sq_yd', name_en: 'sq.yd', name_zh: '平方码', factor: 0.83612736 },
      { id: 'qing', name_en: '顷', name_zh: '中国顷', factor: 66666.666667 },
      { id: 'sq_chi', name_en: 'sq.chi', name_zh: '平方尺', factor: 0.11111111 },
    ],
  },
];

export default function UnitConversion() {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [values, setValues] = useState<{ [key: string]: string }>({});

  const activeCategory = UNIT_CATEGORIES[activeCategoryIndex];

  // Temperature conversions need separate math logic
  const handleTempConvert = (tempVal: number, fromId: string) => {
    let c = 0;
    // Map to standard Celsius first
    if (fromId === 'C') c = tempVal;
    else if (fromId === 'F') c = (tempVal - 32) / 1.8;
    else if (fromId === 'K') c = tempVal - 273.15;
    else if (fromId === 'Ra') c = (tempVal - 491.67) / 1.8;
    else if (fromId === 'Re') c = tempVal / 0.8;

    // Convert from standard Celsius to all other targets
    const newValues: { [key: string]: string } = {};
    activeCategory.units.forEach((u) => {
      let targetVal = 0;
      if (u.id === 'C') targetVal = c;
      else if (u.id === 'F') targetVal = c * 1.8 + 32;
      else if (u.id === 'K') targetVal = c + 273.15;
      else if (u.id === 'Ra') targetVal = (c + 273.15) * 1.8;
      else if (u.id === 'Re') targetVal = c * 0.8;

      newValues[u.id] = (Math.round(targetVal * 100000) / 100000).toString();
    });
    setValues(newValues);
  };

  const handleValueChange = (valStr: string, unitId: string) => {
    if (valStr === '') {
      setValues({});
      return;
    }

    const numericVal = parseFloat(valStr);
    if (isNaN(numericVal)) {
      setValues((prev) => ({ ...prev, [unitId]: valStr }));
      return;
    }

    if (activeCategory.type === 'temperature') {
      handleTempConvert(numericVal, unitId);
      return;
    }

    // Convert non-temperature units based on factors
    const currentUnit = activeCategory.units.find((u) => u.id === unitId)!;
    const stdValue = numericVal * currentUnit.factor;

    const newValues: { [key: string]: string } = {};
    activeCategory.units.forEach((u) => {
      const targetVal = stdValue / u.factor;
      // Precision formatting
      newValues[u.id] = (Math.round(targetVal * 10000000) / 10000000).toString();
    });
    setValues(newValues);
  };

  const clearAll = () => {
    setValues({});
  };

  return (
    <div id="unit-conversion-container" className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Horizontal Subtask Category Icons Picker */}
      <div id="unit-tabs shadow-sm" className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 overflow-x-auto">
        <div className="flex px-4 py-2 space-x-2 min-w-max">
          {UNIT_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.type}
              id={`tab-btn-${cat.type}`}
              onClick={() => {
                setActiveCategoryIndex(idx);
                setValues({});
              }}
              className={`px-4 py-2 rounded-full text-xs font-medium cursor-pointer transition-all ${
                activeCategoryIndex === idx
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div id="unit-main-content" className="p-4 flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
        <div id="conversion-notice" className="mb-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl p-3 flex items-start space-x-2">
          <BookOpen id="icon-notice" className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
            <strong>温馨提示：</strong>请在下方任意一个输入框中填入数值，其他所有单位的换算数值将会<strong>实时自动计算</strong>。
          </p>
        </div>

        {/* Units Forms Card */}
        <div id="conversion-form" className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {activeCategory.name}
            </span>
            <button
              id="clear-btn"
              onClick={clearAll}
              className="text-xs text-rose-500 hover:text-rose-600 border border-rose-100 dark:border-rose-950/30 hover:border-rose-200 px-2 py-1 rounded-lg cursor-pointer dark:bg-rose-950/10"
            >
              清空重置
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCategory.units.map((unit) => (
              <div key={unit.id} id={`field-wrap-${unit.id}`} className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>{unit.name_zh}</span>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{unit.name_en}</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="any"
                    placeholder={`输入 ${unit.name_zh}`}
                    id={`input-${unit.id}`}
                    value={values[unit.id] || ''}
                    onChange={(e) => handleValueChange(e.target.value, unit.id)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2 px-3 text-sm transition-all focus:outline-hidden font-mono text-slate-850 dark:text-slate-100"
                  />
                  <div className="absolute right-3 text-xs font-mono font-medium text-slate-400 dark:text-slate-500 select-none pointer-events-none">
                    {unit.id === 'C' || unit.id === 'F' ? unit.name_en : unit.name_en.toLowerCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
