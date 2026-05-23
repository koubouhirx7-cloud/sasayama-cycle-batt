import React, { useState, useMemo } from 'react';
import { Vehicle, MaintenanceLog } from '../app/page';
import { X, Battery, Settings, PenTool, CheckCircle2, History, AlertTriangle, AlertCircle, Search, Filter } from 'lucide-react';

interface VehicleDetailProps {
  vehicle: Vehicle;
  logs: MaintenanceLog[];
  onClose: () => void;
  onAddMaintenance: (deviceId: string, type: string, description: string) => Promise<void>;
  isUsingRealApi: boolean;
}

export default function VehicleDetail({
  vehicle,
  logs,
  onClose,
  onAddMaintenance,
  isUsingRealApi
}: VehicleDetailProps) {
  const [type, setType] = useState('puncture_repair');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // タイムライン検索＆カテゴリフィルタの状態
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'repair' | 'replacement' | 'inspection' | 'other'>('all');

  // 出来事の選択肢マッピング
  const maintenanceTypes = [
    { value: 'puncture_repair', label: '🔧 パンク修理' },
    { value: 'tire_replacement', label: '🚲 タイヤ交換' },
    { value: 'battery_replacement', label: '🔋 バッテリー交換' },
    { value: 'brake_adjustment', label: '🔩 ブレーキ調整' },
    { value: 'regular_inspection', label: '✅ 定期点検' },
    { value: 'other', label: '📝 その他' }
  ];

  // フォーム送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddMaintenance(vehicle.device_id, type, description);
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // タイムライン上のバッジと日本語ラベルの取得
  const getLogTypeInfo = (logType: string) => {
    switch (logType) {
      case 'puncture_repair':
        return { label: 'パンク修理', color: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'tire_replacement':
        return { label: 'タイヤ交換', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'battery_replacement':
        return { label: 'バッテリー交換', color: 'bg-emerald-50 text-emerald-750 border-emerald-200' };
      case 'brake_adjustment':
        return { label: 'ブレーキ調整', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'regular_inspection':
        return { label: '定期点検', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return { label: 'その他', color: 'bg-satoyama-100 text-satoyama-700 border-satoyama-200' };
    }
  };

  // 検索とカテゴリフィルターの適用
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. カテゴリフィルター
      if (logFilter !== 'all') {
        const isRepair = log.type === 'puncture_repair' || log.type === 'brake_adjustment';
        const isReplacement = log.type === 'tire_replacement' || log.type === 'battery_replacement';
        const isInspection = log.type === 'regular_inspection';
        
        if (logFilter === 'repair' && !isRepair) return false;
        if (logFilter === 'replacement' && !isReplacement) return false;
        if (logFilter === 'inspection' && !isInspection) return false;
        if (logFilter === 'other' && (isRepair || isReplacement || isInspection)) return false;
      }
      
      // 2. 検索ワードフィルター
      if (logSearch.trim()) {
        const query = logSearch.toLowerCase();
        const typeInfo = getLogTypeInfo(log.type).label.toLowerCase();
        const desc = log.description.toLowerCase();
        return typeInfo.includes(query) || desc.includes(query);
      }
      
      return true;
    });
  }, [logs, logFilter, logSearch]);

  const isLowBattery = vehicle.battery_soc <= 30;

  return (
    <div className="fixed md:absolute right-0 bottom-0 z-30 flex flex-col bg-white/95 md:bg-white/80 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-satoyama-600/10 shadow-glass transition-all duration-300 w-full h-[85vh] md:w-96 md:h-full rounded-t-3xl md:rounded-t-none animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
      
      {/* ドラッグハンドルバー (モバイルのみ表示してプレミアム感を演出) */}
      <div className="md:hidden flex justify-center py-2.5">
        <div className="w-12 h-1 bg-satoyama-200 rounded-full" />
      </div>

      {/* ヘッダーパネル */}
      <div className="p-5 md:p-6 border-b border-satoyama-600/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-satoyama-900 tracking-wide">{vehicle.device_id} 詳細スペック</h2>
          <p className="text-xs text-satoyama-600 mt-0.5">{vehicle.location_name || '丹波篠山エリア'} ・ 遠隔ステータス</p>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg bg-satoyama-100 border border-satoyama-200 text-satoyama-600 hover:text-satoyama-900 transition-all active:scale-95"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* コンテンツ領域 */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
        
        {/* ローバッテリー警告バナー (残量30%以下) */}
        {isLowBattery && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 animate-alert-breath space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-brand-red animate-bounce" />
              <span className="text-xs font-bold text-brand-red animate-text-breath">警告: バッテリー残量低下 ({vehicle.battery_soc}%)</span>
            </div>
            <p className="text-[11px] text-rose-955 leading-relaxed">
              現在の残量が危険領域に入っています。現場に要員を派遣し、充電済みバッテリーへの交換作業を行ってください。
            </p>
            <button
              onClick={() => {
                setType('battery_replacement');
                setDescription('【バッテリー低下アラート対応】現場にて、充電済みのバッテリーパック（100%新品）に速やかに交換しました。接続部およびGPS通信の正常復旧を確認済みです。');
                const formElement = document.getElementById('maintenance-form');
                if (formElement) {
                  formElement.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full bg-rose-100 hover:bg-rose-200 text-brand-red border border-rose-300 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all active:scale-[0.98]"
            >
              🔋 バッテリー交換日誌を下書き入力する
            </button>
          </div>
        )}

        {/* 主要ステータスカード */}
        <div className="bg-satoyama-50 border border-satoyama-600/5 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs text-satoyama-600 font-semibold">バッテリー残量</span>
            <div className="flex items-center gap-2">
              <Battery className={`w-4 h-4 ${isLowBattery ? 'text-brand-red animate-pulse' : vehicle.battery_soc <= 69 ? 'text-brand-yellow' : 'text-brand-green'}`} />
              <span className="text-base font-extrabold text-satoyama-900">{vehicle.battery_soc}%</span>
            </div>
          </div>

          {/* バッテリー残量バー */}
          <div className="w-full bg-satoyama-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${isLowBattery ? 'bg-brand-red' : vehicle.battery_soc <= 69 ? 'bg-brand-yellow' : 'bg-brand-green'}`} 
              style={{ width: `${vehicle.battery_soc}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-satoyama-600/10 text-xs text-satoyama-700">
            <div>
              <div>バッテリー電圧</div>
              <div className="font-semibold text-satoyama-900 mt-1">{(vehicle.battery_voltage / 1000).toFixed(2)} V</div>
            </div>
            <div>
              <div>ステータス</div>
              <div className="font-semibold text-satoyama-900 mt-1 uppercase">
                {vehicle.status === 'available' ? '利用可能' : vehicle.status === 'in_use' ? '使用中' : vehicle.status === 'charging' ? '充電中' : '要整備'}
              </div>
            </div>
          </div>
        </div>

        {/* メンテナンス日誌登録フォーム */}
        <div id="maintenance-form" className="bg-satoyama-50/40 border border-satoyama-600/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-satoyama-900 flex items-center gap-2">
            <PenTool className="w-4 h-4 text-satoyama-600" />
            <span>新しいメンテナンス日誌をつける</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 出来事の選択 */}
            <div>
              <label className="block text-[10px] text-satoyama-700 uppercase font-bold tracking-wider mb-1.5">出来事の種類</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-white border border-satoyama-600/15 rounded-xl py-2.5 px-3.5 text-xs text-satoyama-900 focus:outline-none focus:border-satoyama-600 cursor-pointer shadow-sm"
              >
                {maintenanceTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 詳細メモ */}
            <div>
              <label className="block text-[10px] text-satoyama-700 uppercase font-bold tracking-wider mb-1.5">詳しい内容（メモ）</label>
              <textarea 
                rows={3}
                placeholder="タイヤを新品に交換、空気圧チェック..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-satoyama-600/15 rounded-xl p-3 text-xs text-satoyama-900 placeholder-satoyama-600/40 focus:outline-none focus:border-satoyama-600 resize-none transition-all shadow-sm"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="w-full bg-gradient-to-r from-satoyama-600 to-emerald-600 hover:from-satoyama-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-[0.98]"
            >
              {isSubmitting ? '登録中...' : '日誌を登録する'}
            </button>
          </form>
        </div>

        {/* 過去のメンテナンス記録 */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2.5 border-b border-satoyama-600/10 pb-3">
            <h3 className="text-sm font-bold text-satoyama-900 flex items-center gap-2">
              <History className="w-4 h-4 text-satoyama-600" />
              <span>過去のメンテナンス記録 ({filteredLogs.length})</span>
            </h3>
            
            {/* タイムライン検索＆フィルタツールバー */}
            <div className="space-y-2 mt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-satoyama-600" />
                <input 
                  type="text"
                  placeholder="記録を検索..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full bg-white border border-satoyama-600/10 rounded-lg py-1.5 pl-9 pr-3 text-[11px] text-satoyama-900 placeholder-satoyama-600/40 focus:outline-none focus:border-satoyama-600/50 shadow-sm"
                />
              </div>
              
              {/* カテゴリクイックフィルター */}
              <div className="flex flex-wrap gap-1">
                {(['all', 'repair', 'replacement', 'inspection', 'other'] as const).map((filter) => {
                  const labels = {
                    all: 'すべて',
                    repair: '修理',
                    replacement: '交換',
                    inspection: '点検',
                    other: 'その他'
                  };
                  const active = logFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setLogFilter(filter)}
                      className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${
                        active 
                          ? 'bg-satoyama-600/10 text-satoyama-700 border-satoyama-600/20' 
                          : 'bg-white text-satoyama-600 border-satoyama-600/10 hover:bg-satoyama-50'
                      }`}
                    >
                      {labels[filter]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* タイムラインリスト */}
          <div className="relative pl-4 border-l border-satoyama-600/20 space-y-5 mt-4">
            {filteredLogs.map((log) => {
              const typeInfo = getLogTypeInfo(log.type);
              const formattedDate = new Date(log.performed_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={log.id} className="relative group animate-in fade-in duration-300 timeline-item">
                  {/* タイムラインの丸ピン */}
                  <div className="timeline-dot w-2.5 h-2.5 rounded-full bg-satoyama-600 absolute -left-[21.5px] top-1.5 border-2 border-white transition-all duration-300" />
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-[10px] text-satoyama-600 font-medium">{formattedDate}</span>
                    </div>
                    <p className="text-xs text-satoyama-800 bg-white border border-satoyama-600/10 rounded-xl p-3 leading-relaxed group-hover:bg-satoyama-50 group-hover:border-satoyama-600/20 transition-all shadow-sm">
                      {log.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-satoyama-600 border border-dashed border-satoyama-600/20 rounded-2xl pl-0 -ml-4 bg-white/50">
                <CheckCircle2 className="w-6 h-6 text-satoyama-600 mx-auto mb-2" />
                <p className="text-xs">条件に合う修理履歴はありません</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
