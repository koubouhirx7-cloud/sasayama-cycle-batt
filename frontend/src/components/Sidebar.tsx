import React, { useState } from 'react';
import { Vehicle } from '../app/page';
import { Battery, ShieldAlert, CheckCircle, Navigation, Search, Filter, X } from 'lucide-react';

interface SidebarProps {
  vehicles: Vehicle[];
  filterBatteryLow: boolean;
  setFilterBatteryLow: (val: boolean) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  isUsingRealApi: boolean;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (val: boolean) => void;
}

export default function Sidebar({
  vehicles,
  filterBatteryLow,
  setFilterBatteryLow,
  selectedVehicleId,
  setSelectedVehicleId,
  isUsingRealApi,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // 各ステータスの集計
  const totalCount = vehicles.length;
  const lowBatteryCount = vehicles.filter(v => v.battery_soc <= 30).length;
  const errorCount = vehicles.filter(v => v.status === 'error').length;
  const availableCount = vehicles.filter(v => v.status === 'available').length;

  // 検索とフィルターを適用したリスト
  const filteredVehicles = vehicles
    .filter(v => 
      v.device_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (v.location_name && v.location_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(v => !filterBatteryLow || v.battery_soc <= 30);

  // バッテリー残量に応じたカラークラス
  const getBatteryColor = (soc: number) => {
    if (soc <= 30) return 'text-brand-red';
    if (soc <= 69) return 'text-brand-yellow';
    return 'text-brand-green';
  };

  // ステータスバッジのスタイル
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide">利用可能</span>;
      case 'in_use':
        return <span className="bg-blue-500/10 text-brand-blue border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide">使用中</span>;
      case 'charging':
        return <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide">充電中</span>;
      case 'error':
        return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide animate-pulse">要整備</span>;
      default:
        return null;
    }
  };

  return (
    <aside className={`fixed md:relative top-0 left-0 w-80 h-full bg-white/90 md:bg-white/60 backdrop-blur-2xl md:backdrop-blur-xl border-r border-satoyama-600/10 flex flex-col z-40 md:z-20 transition-transform duration-300 ease-out ${
      isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      
      {/* ロゴ部分 */}
      <div className="p-6 border-b border-satoyama-600/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-satoyama-600 to-emerald-500 p-2.5 rounded-xl shadow-md">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-satoyama-900 to-satoyama-700 bg-clip-text text-transparent">丹波篠山サイクル</span>
            <div className="text-[10px] text-satoyama-600 tracking-wider mt-0.5 uppercase font-semibold">篠山城下町エリア</div>
          </div>
        </div>


        {/* モバイル用クローズボタン */}
        <button 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden p-1.5 rounded-lg bg-satoyama-100 border border-satoyama-200 text-satoyama-600 hover:text-satoyama-900 transition-all"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* ステータスサマリー */}
      <div className="grid grid-cols-2 gap-2.5 p-4 border-b border-satoyama-600/10">
        <div className="bg-satoyama-100/50 border border-satoyama-600/5 rounded-xl p-3 hover:bg-satoyama-100 transition-colors duration-200">
          <div className="text-[10px] text-satoyama-700 font-medium">全車両台数</div>
          <div className="text-xl font-bold text-satoyama-900 mt-1">{totalCount} <span className="text-xs font-normal text-gray-500">台</span></div>
        </div>
        <div className={`border rounded-xl p-3 transition-colors duration-300 ${
          lowBatteryCount > 0 
            ? 'border-rose-200 bg-rose-50 animate-alert-breath' 
            : 'border-satoyama-600/5 bg-satoyama-100/50'
        }`}>
          <div className={`text-[10px] font-medium ${lowBatteryCount > 0 ? 'text-brand-red animate-text-breath' : 'text-satoyama-700'}`}>
            要バッテリー交換
          </div>
          <div className={`text-xl font-bold mt-1 ${lowBatteryCount > 0 ? 'text-brand-red' : 'text-satoyama-900'}`}>
            {lowBatteryCount} <span className="text-xs font-normal text-gray-500">台</span>
          </div>
        </div>
      </div>

      {/* 検索 ＆ 絞り込みトグル */}
      <div className="p-4 space-y-4 border-b border-satoyama-600/10">
        
        {/* 検索バー */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-satoyama-600" />
          <input 
            type="text" 
            placeholder="車両IDで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/80 border border-satoyama-600/15 rounded-xl py-2.5 pl-10 pr-4 text-sm text-satoyama-900 placeholder-satoyama-600/50 focus:outline-none focus:border-satoyama-600 focus:ring-1 focus:ring-satoyama-600/30 transition-all duration-300"
          />
        </div>

        {/* 30%以下絞り込みスイッチ */}
        <div className="flex items-center justify-between bg-satoyama-50/60 border border-satoyama-600/5 rounded-xl p-3">
          <div className="flex items-center gap-2.5">
            <Filter className={`w-4 h-4 ${filterBatteryLow ? 'text-brand-red animate-pulse' : 'text-satoyama-600'}`} />
            <div className="text-xs font-semibold text-satoyama-800">バッテリー30%以下</div>
          </div>
          
          {/* トグルスイッチ */}
          <button 
            onClick={() => setFilterBatteryLow(!filterBatteryLow)}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 ${
              filterBatteryLow ? 'bg-brand-red' : 'bg-satoyama-200'
            }`}
          >
            <div className={`w-4.5 h-4.5 rounded-full bg-white transition-all duration-300 transform shadow ${
              filterBatteryLow ? 'translate-x-4.5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* 車料リスト */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-[10px] text-satoyama-600 uppercase font-bold tracking-wider px-1 mb-2">車両一覧 ({filteredVehicles.length}台)</div>
        
        {filteredVehicles.map((vehicle) => {
          const isSelected = vehicle.device_id === selectedVehicleId;
          const isLow = vehicle.battery_soc <= 30;
          return (
            <div 
              key={vehicle.device_id}
              onClick={() => {
                setSelectedVehicleId(isSelected ? null : vehicle.device_id);
                // モバイルの場合は選択と同時にサイドバーを自動で閉じる
                if (window.innerWidth < 768) {
                  setIsMobileSidebarOpen(false);
                }
              }}
              className={`relative p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col gap-2.5 active:scale-[0.98] ${
                isSelected 
                  ? 'bg-satoyama-100 border-satoyama-600/40 shadow-md translate-x-1' 
                  : isLow
                    ? 'bg-rose-500/[0.01] border-rose-500/15 hover:bg-rose-500/[0.03] hover:border-rose-500/30'
                    : 'bg-white/80 border-satoyama-600/10 hover:bg-satoyama-100 hover:border-satoyama-600/30 hover:translate-x-1'
              }`}
            >
              {/* アクティブ時の左側ライン */}
              <div className={`absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full transition-all duration-300 ${
                isSelected ? 'bg-satoyama-600 scale-y-100' : 'bg-transparent scale-y-0'
              }`} />

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-satoyama-900 tracking-wide">{vehicle.device_id}</span>
                {getStatusBadge(vehicle.status)}
              </div>
              
              <div className="flex items-center justify-between text-xs text-satoyama-700">
                <div className="flex items-center gap-1.5">
                  <Battery className={`w-4 h-4 ${getBatteryColor(vehicle.battery_soc)} ${isLow ? 'animate-pulse' : ''}`} />
                  <span className="font-semibold text-satoyama-800">{vehicle.battery_soc}%</span>
                </div>
                <span className="text-[10px] text-satoyama-500">
                  {vehicle.location_name || '丹波篠山エリア'}
                </span>
              </div>

            </div>
          );
        })}

        {filteredVehicles.length === 0 && (
          <div className="text-center py-10">
            <ShieldAlert className="w-8 h-8 text-satoyama-600 mx-auto mb-2" />
            <p className="text-xs text-satoyama-600">該当する車両が見つかりません</p>
          </div>
        )}
      </div>
    </aside>
  );
}
