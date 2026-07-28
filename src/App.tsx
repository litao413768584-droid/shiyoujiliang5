import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Shield,
  Layers,
  PencilRuler,
  CircleUser,
  ClipboardList,
  Flame,
  Info,
  Sun,
  Moon,
} from 'lucide-react';
import GaugingSheet from './components/GaugingSheet';
import UnitConversion from './components/UnitConversion';
import OtherCalculations from './components/OtherCalculations';

type ActiveTab = 'gauging' | 'converter' | 'others';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('gauging');
  const [showHelp, setShowHelp] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Tabs structure with icons (Only keeping GaugingSheet, UnitConversion, and OtherCalculations)
  const mainTabs = [
    { id: 'gauging', label: '计量表', icon: ClipboardList, desc: '体积与温度修正 (VCF)' },
    { id: 'converter', label: '单位换算', icon: PencilRuler, desc: '多类别公英制双向换算' },
    { id: 'others', label: '其他功能', icon: Layers, desc: '双向密度、混合粘度与闪点计算' },
  ];

  return (
    <div id="petroleum-calc-app" className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans select-none antialiased text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Android-style App Header Bar */}
      <header id="android-bar" className="bg-orange-500 dark:bg-slate-900 text-white shadow-md sticky top-0 z-50 transition-all border-b dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-1.5 rounded-lg font-bold">
              <Flame className="w-5 h-5 animate-pulse text-amber-200" />
            </div>
            <div>
              <h1 id="app-title-cn" className="text-base font-bold tracking-wide">石油计量专家套件 (本地离线版)</h1>
              <p className="text-[10px] text-orange-200 dark:text-slate-400 uppercase tracking-wider font-semibold font-mono">Petroleum Measurement Expert Suite (Offline Pro)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs leading-none">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              id="dark-mode-toggle-btn"
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer"
              title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-slate-100" />}
            </button>

            <button
              onClick={() => setShowHelp(!showHelp)}
              id="help-trigger-btn"
              className="bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>说明</span>
            </button>
            <div id="surveyor-badge" className="hidden md:flex items-center space-x-1 border border-white/20 px-2.5 py-1.5 rounded-lg bg-orange-600/30 dark:bg-slate-800/50">
              <CircleUser className="w-3.5 h-3.5 text-orange-100 dark:text-slate-300" />
              <span className="font-semibold text-orange-100 dark:text-slate-300">完全单机离线运行 ➔ 无限期免费使用</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main categories top Horizontal navigation bar */}
      <nav id="categories-picker" className="bg-white dark:bg-slate-900 shadow-xs border-b border-slate-100 dark:border-slate-800 overflow-x-auto sticky top-[49px] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex justify-between md:justify-center md:space-x-8 px-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`main-nav-tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id as ActiveTab);
                  setShowHelp(false);
                }}
                className={`flex-1 md:flex-initial py-3 px-4 flex flex-col items-center justify-center space-y-1 cursor-pointer group transition-all`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-500 scale-105' 
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-bold transition-colors ${
                  isActive 
                    ? 'text-orange-600 dark:text-orange-500' 
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                }`}>
                  {tab.label}
                </span>

                {/* active line indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 dark:bg-orange-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Primary body component display */}
      <main id="app-body" className="flex-1 flex flex-col overflow-hidden max-w-7xl mx-auto w-full">
        {showHelp && (
          <div id="help-drawer" className="bg-orange-50 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900/30 p-4 transition-all">
            <h3 className="text-xs font-bold text-orange-950 dark:text-orange-300 flex items-center space-x-1">
              <Info className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>ASTM D1250 标准石油计量依据简介</span>
            </h3>
            <div className="text-[11px] text-orange-900 dark:text-orange-200/90 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 leading-relaxed">
              <p>
                <strong>一、体积修正系数 (VCF) 计算：</strong><br />
                本软件核心符合 ASTM D1250-04 标准（对应中国国家标准 GB/T 1885）与 ASTM D4311-04 沥青标准。通过输入热膨胀系数适配 原油 (D1250 A表)、成品油 (Table B表)、润滑油品 (Table D表) 以及 沥青 (D4311)，得到指定温度下的体积修正系数。
              </p>
              <p>
                <strong>二、空气中的油品质量 (吨) 折算：</strong><br />
                在石油大宗交易中，通常按{" "}
                <span className="bg-amber-100 dark:bg-amber-950/60 px-1 rounded-sm text-orange-700 dark:text-orange-300 font-bold font-mono">
                  空气净重 = 标准体积 (GSV) × (标准真空密度 - 0.0011)
                </span>{" "}
                折算，以冲抵水分及空气浮力，本计量套装依照此一原则输出吨位。
              </p>
            </div>
          </div>
        )}

        <div id="viewport-card" className="flex-1">
          {activeTab === 'gauging' && <GaugingSheet />}
          {activeTab === 'converter' && <UnitConversion />}
          {activeTab === 'others' && <OtherCalculations />}
        </div>
      </main>

      {/* Professional Footer Badge */}
      <footer id="app-footer" className="bg-slate-900 border-t border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] py-3 text-center tracking-wider font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>石油化工计量标准完全单机离线专版 © 2026</span>
          <div className="flex items-center space-x-3 text-[9px] text-slate-600 dark:text-slate-500">
            <span className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>本系统不发送任何网络请求 ➔ 绝对的数据隐私与安全</span>
            </span>
            <span>|</span>
            <span>依据标准：ASTM D1250 / API MPMS Ch.11.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
