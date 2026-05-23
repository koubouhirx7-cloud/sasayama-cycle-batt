'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-satoyama-50 flex items-center justify-center">
      <div className="text-satoyama-600 font-bold animate-pulse">地図を読み込み中...</div>
    </div>
  )
});
import VehicleDetail from '../components/VehicleDetail';
import { Menu } from 'lucide-react';

// 車両データの型定義
export interface Vehicle {
  device_id: string;
  battery_soc: number;
  battery_voltage: number;
  current_lat: number;
  current_lng: number;
  status: 'available' | 'in_use' | 'charging' | 'error';
  timestamp: string;
  location_name?: string; // 丹波篠山のローカルランドマーク名 (オプショナル)
}

// メンテナンスログの型定義
export interface MaintenanceLog {
  id: string;
  device_id: string;
  type: 'puncture_repair' | 'tire_replacement' | 'battery_replacement' | 'brake_adjustment' | 'regular_inspection' | 'other';
  description: string;
  performed_at: string;
}

// 初期モック車両データ (兵庫県丹波篠山市の城下町周辺に配置)
const INITIAL_MOCK_VEHICLES: Vehicle[] = [
  { device_id: '篠山-001', battery_soc: 85, battery_voltage: 39500, current_lat: 35.0725, current_lng: 135.2185, status: 'available', location_name: '篠山城跡 三の丸広場', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
  { device_id: '篠山-002', battery_soc: 8, battery_voltage: 32000, current_lat: 35.0755, current_lng: 135.2195, status: 'available', location_name: '丹波篠山市役所前', timestamp: new Date(Date.now() - 2 * 60000).toISOString() },
  { device_id: '篠山-003', battery_soc: 45, battery_voltage: 36200, current_lat: 35.0805, current_lng: 135.2150, status: 'in_use', location_name: '篠山鳳鳴高校周辺', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
  { device_id: '篠山-004', battery_soc: 28, battery_voltage: 34100, current_lat: 35.0728, current_lng: 135.2285, status: 'available', location_name: '河原町妻入商家群', timestamp: new Date(Date.now() - 1 * 60000).toISOString() },
  { device_id: '篠山-005', battery_soc: 95, battery_voltage: 41200, current_lat: 35.0742, current_lng: 135.2165, status: 'charging', location_name: '篠山城下町歴史美術館', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
  { device_id: '篠山-006', battery_soc: 50, battery_voltage: 36800, current_lat: 35.0780, current_lng: 135.2220, status: 'in_use', location_name: 'デカンショ街道沿い', timestamp: new Date(Date.now() - 8 * 60000).toISOString() },
  { device_id: '篠山-007', battery_soc: 72, battery_voltage: 38800, current_lat: 35.0775, current_lng: 135.2315, status: 'available', location_name: '王地山公園 駐車場', timestamp: new Date(Date.now() - 12 * 60000).toISOString() },
  { device_id: '篠山-008', battery_soc: 15, battery_voltage: 32800, current_lat: 35.0735, current_lng: 135.2140, status: 'error', location_name: '篠山小学校前', timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
  { device_id: '篠山-009', battery_soc: 4, battery_voltage: 31000, current_lat: 35.0750, current_lng: 135.2225, status: 'available', location_name: '二階町バス停付近', timestamp: new Date(Date.now() - 3 * 60000).toISOString() },
  { device_id: '篠山-010', battery_soc: 60, battery_voltage: 37500, current_lat: 35.0600, current_lng: 135.2400, status: 'available', location_name: '八上城跡登り口', timestamp: new Date(Date.now() - 6 * 60000).toISOString() }
];

// 初期モックメンテナンスログ
const INITIAL_MOCK_MAINTENANCE: Record<string, MaintenanceLog[]> = {
  '篠山-002': [
    { id: 'm-1', device_id: '篠山-002', type: 'puncture_repair', description: 'デカンショ街道沿いにて前輪のパンク修理。ゴムチューブを補修パッチ処理しました。', performed_at: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 'm-2', device_id: '篠山-002', type: 'tire_replacement', description: '後輪タイヤの摩耗限界のため、タイヤゴム本体およびインナーチューブを新品に全交換。', performed_at: new Date(Date.now() - 30 * 86400000).toISOString() }
  ],
  '篠山-008': [
    { id: 'm-3', device_id: '篠山-008', type: 'brake_adjustment', description: '左手リアブレーキの効きが甘いため、ワイヤー調整ネジ締め直し。シューは残量あり。', performed_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'm-4', device_id: '篠山-008', type: 'regular_inspection', description: '春季の定期点検実施。チェーンの油注し、各部ネジのトルク確認、ライト点灯良好。', performed_at: new Date(Date.now() - 60 * 86400000).toISOString() }
  ]
};


export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_MOCK_VEHICLES);
  const [maintenanceLogs, setMaintenanceLogs] = useState<Record<string, MaintenanceLog[]>>(INITIAL_MOCK_MAINTENANCE);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [filterBatteryLow, setFilterBatteryLow] = useState<boolean>(false);
  const [isUsingRealApi, setIsUsingRealApi] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // バックエンドAPIが起動しているか確認し、稼働中なら実データを取得する
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/v1/vehicles');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setVehicles(data);
            setIsUsingRealApi(true);
            console.log('Successfully connected to Real Backend API.');
          }
        }
      } catch (err) {
        // バックエンドが立ち上がっていない場合はエラーを出さず、モックで静かに動作し続ける
        console.log('Backend API is not running. Using simulated mock data.');
      }
    };

    fetchRealData();
    // 30秒ごとにポーリング
    const interval = setInterval(fetchRealData, 30000);
    return () => clearInterval(interval);
  }, []);

  // メンテナンス履歴の追加時にバックエンドAPI、またはローカル状態からロードする
  useEffect(() => {
    if (!selectedVehicleId) return;

    const fetchMaintenanceLogs = async () => {
      if (isUsingRealApi) {
        try {
          const response = await fetch(`http://localhost:3000/api/v1/vehicles/${selectedVehicleId}/maintenance`);
          if (response.ok) {
            const data = await response.json();
            setMaintenanceLogs(prev => ({
              ...prev,
              [selectedVehicleId]: data
            }));
          }
        } catch (err) {
          console.error('Failed to fetch maintenance logs from API:', err);
        }
      }
    };

    fetchMaintenanceLogs();
  }, [selectedVehicleId, isUsingRealApi]);

  // メンテナンス履歴の追加関数
  const handleAddMaintenance = async (deviceId: string, type: string, description: string) => {
    const newLog: MaintenanceLog = {
      id: `m-${Date.now()}`,
      device_id: deviceId,
      type: type as any,
      description,
      performed_at: new Date().toISOString()
    };

    // 1. まずフロントエンドのローカル状態を即時更新 (楽観的UI)
    setMaintenanceLogs(prev => ({
      ...prev,
      [deviceId]: [newLog, ...(prev[deviceId] || [])]
    }));

    // 2. 実APIに接続している場合はバックエンドに送信
    if (isUsingRealApi) {
      try {
        const response = await fetch(`http://localhost:3000/api/v1/vehicles/${deviceId}/maintenance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type, description }),
        });
        if (response.ok) {
          const savedLog = await response.json();
          // バックエンドが保存した正確なデータで上書き
          setMaintenanceLogs(prev => ({
            ...prev,
            [deviceId]: prev[deviceId].map(item => item.id.startsWith('m-') && item.performed_at === newLog.performed_at ? savedLog : item)
          }));
          console.log(`Synced maintenance log to database for ${deviceId}`);
        }
      } catch (err) {
        console.error('Failed to sync maintenance log to database:', err);
      }
    }
  };

  // 選択された車両データ
  const selectedVehicle = vehicles.find(v => v.device_id === selectedVehicleId) || null;

  // 絞り込み処理
  const displayedVehicles = filterBatteryLow
    ? vehicles.filter(v => v.battery_soc <= 30)
    : vehicles;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-satoyama-50 text-satoyama-900 font-sans relative">
      
      {/* モバイル用サイドバー背景オーバーレイ */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)} 
          className="fixed inset-0 bg-satoyama-900/40 backdrop-blur-sm z-30 md:hidden transition-all duration-300 animate-in fade-in"
        />
      )}

      {/* サイドバー */}
      <Sidebar 
        vehicles={vehicles}
        filterBatteryLow={filterBatteryLow}
        setFilterBatteryLow={setFilterBatteryLow}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        isUsingRealApi={isUsingRealApi}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
      />

      {/* メイン領域：地図 */}
      <main className="flex-1 relative h-full">
        <MapView 
          vehicles={displayedVehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={setSelectedVehicleId}
        />

        {/* プレミアム感のあるフローティングヘッダー */}
        <div className="absolute top-6 left-6 right-6 md:right-auto z-10 bg-white/90 backdrop-blur-md border border-satoyama-600/10 px-4 py-3 md:px-5 md:py-3.5 rounded-2xl shadow-md flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            {/* モバイル用ハンバーガーメニューボタン */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-satoyama-100 border border-satoyama-200 text-satoyama-600 hover:text-satoyama-900 transition-all active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <div>
                <h1 className="text-sm md:text-base font-bold text-satoyama-900 tracking-wide">丹波篠山サイクル管理システム</h1>
                <p className="text-[10px] md:text-xs text-satoyama-600 mt-0.5">
                  車両監視センター {isUsingRealApi ? '🟢 ライブ通信中' : '🔵 デモモード動作中'}
                </p>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* 詳細パネル（車両選択時に右側からスライドイン、またはモバイル時は下部からスライドアップ） */}
      {selectedVehicle && (
        <VehicleDetail 
          vehicle={selectedVehicle}
          logs={maintenanceLogs[selectedVehicle.device_id] || []}
          onClose={() => setSelectedVehicleId(null)}
          onAddMaintenance={handleAddMaintenance}
          isUsingRealApi={isUsingRealApi}
        />
      )}
    </div>
  );
}
