'use client';

import React, { useEffect, useRef } from 'react';
import { Vehicle } from '../app/page';
import maplibregl from 'maplibre-gl';

interface MapViewProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
}

export default function MapView({
  vehicles,
  selectedVehicleId,
  onSelectVehicle
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

  // 1. 地図の初期化
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // CartoDBのDark Matter無料タイルを使用して、ダッシュボードのダークモードデザインと美しく統一
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'cartodb-voyager': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO'
          }
        },
        layers: [
          {
            id: 'cartodb-voyager-layer',
            type: 'raster',
            source: 'cartodb-voyager',
            minzoom: 0,
            maxzoom: 20
          }
        ]
      },
      center: [135.2195, 35.0740], // 丹波篠山市・篠山城跡の中心点
      zoom: 14.2,
      pitch: 45, // 立体感のある鳥瞰視点
      bearing: -10
    });


    // ズーム＆回転コントローラーの追加
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // 2. マーカーの配置・更新
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 既存のマーカーで、今回送られてきていない車両のマーカーを削除
    const currentDeviceIds = new Set(vehicles.map(v => v.device_id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentDeviceIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // マーカーの追加と更新
    vehicles.forEach(vehicle => {
      const { device_id, battery_soc, current_lat, current_lng, status, timestamp } = vehicle;

      // ピンの色を決定
      let pinColor = '#10B981'; // 緑 (70%以上)
      if (status === 'error') {
        pinColor = '#374151'; // ダークチャコール (要整備)
      } else if (battery_soc <= 30) {
        pinColor = '#EF4444'; // 赤 (30%以下)
      } else if (battery_soc <= 69) {
        pinColor = '#F59E0B'; // 黄 (31-69%)
      }

      // ポップアップHTMLの定義
      const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const statusText = status === 'error' ? '🔴 要整備' : status === 'in_use' ? '🔵 使用中' : status === 'charging' ? '🟡 充電中' : '🟢 利用可能';
      const locationText = vehicle.location_name || '丹波篠山エリア';
      
      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 2px;">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: #152E18; display: flex; align-items: center; gap: 6px;">
            <span>ID: ${device_id}</span>
          </div>
          <div style="font-size: 11px; color: #4B5563; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>ステータス:</span>
            <span style="font-weight: 600; color: #152E18;">${statusText}</span>
          </div>
          <div style="font-size: 11px; color: #4B5563; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>バッテリー:</span>
            <span style="font-weight: 700; color: ${pinColor}">${battery_soc}%</span>
          </div>
          <div style="font-size: 11px; color: #4B5563; margin-bottom: 6px; display: flex; justify-content: space-between; gap: 10px;">
            <span>現在地:</span>
            <span style="font-weight: 500; color: #152E18; text-align: right;">${locationText}</span>
          </div>
          <div style="font-size: 10px; color: #9CA3AF; border-top: 1px solid rgba(0,0,0,0.06); margin-top: 8px; padding-top: 6px; text-align: right;">最終同期: ${formattedTime}</div>
        </div>
      `;


      // すでにマーカーが存在する場合は位置と表示内容を更新、ない場合は新規作成
      if (markersRef.current[device_id]) {
        const marker = markersRef.current[device_id];
        marker.setLngLat([current_lng, current_lat]);

        // DOM要素のスタイルおよびパルスリングの動的更新 (再作成を避けパフォーマンスを向上)
        const el = marker.getElement();
        el.style.backgroundColor = pinColor;

        const pulseRing = el.querySelector('.pulse-ring');
        if (battery_soc <= 30 || status === 'error') {
          if (!pulseRing) {
            const pulse = document.createElement('div');
            pulse.className = 'pulse-ring absolute -inset-2 rounded-full animate-pulse-ring opacity-60 pointer-events-none';
            pulse.style.border = `2px solid ${pinColor}`;
            el.appendChild(pulse);
          } else {
            (pulseRing as HTMLDivElement).style.borderColor = pinColor;
          }
        } else if (pulseRing) {
          pulseRing.remove();
        }

        const popup = marker.getPopup();
        if (popup) {
          popup.setHTML(popupContent);
        }
      } else {
        // マーカー用のカスタムHTML要素を作成
        const el = document.createElement('div');
        el.className = `custom-marker marker-${device_id} relative flex items-center justify-center`;
        el.style.width = '26px';
        el.style.height = '26px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = pinColor;
        el.style.border = '2.5px solid rgba(255, 255, 255, 0.95)';
        el.style.boxShadow = '0 4px 12px rgba(21,46,24,0.18)';
        
        // 中心点（デザインのアクセント）
        const innerDot = document.createElement('div');
        innerDot.style.width = '6px';
        innerDot.style.height = '6px';
        innerDot.style.borderRadius = '50%';
        innerDot.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        el.appendChild(innerDot);

        // バッテリー30%以下、またはエラー状態の時はアニメーションパルス（波紋）をまとわせて警戒度アップ！
        if (battery_soc <= 30 || status === 'error') {
          const pulse = document.createElement('div');
          pulse.className = 'pulse-ring absolute -inset-2 rounded-full animate-pulse-ring opacity-60 pointer-events-none';
          pulse.style.border = `2px solid ${pinColor}`;
          el.appendChild(pulse);
        }

        const popup = new maplibregl.Popup({ offset: 15, closeButton: true })
          .setHTML(popupContent);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([current_lng, current_lat])
          .setPopup(popup)
          .addTo(map);

        // ピンがクリックされた時の処理
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectVehicle(device_id);
        });

        markersRef.current[device_id] = marker;
      }
    });

  }, [vehicles, onSelectVehicle]);

  // 2.5. 選択中のマーカーにアクティブクラスを付与
  useEffect(() => {
    Object.keys(markersRef.current).forEach(id => {
      const markerEl = markersRef.current[id].getElement();
      markerEl.classList.remove('active-marker');
    });

    if (selectedVehicleId && markersRef.current[selectedVehicleId]) {
      const markerEl = markersRef.current[selectedVehicleId].getElement();
      markerEl.classList.add('active-marker');
    }
  }, [selectedVehicleId, vehicles]);

  // 3. 外部から車両が選択されたとき、その場所へスムーズにズーム＆カメラ移動
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVehicleId) return;

    const targetVehicle = vehicles.find(v => v.device_id === selectedVehicleId);
    if (targetVehicle) {
      // カメラを自転車の位置にスライド移動 (flyTo)
      map.flyTo({
        center: [targetVehicle.current_lng, targetVehicle.current_lat],
        zoom: 16.8,
        speed: 1.1,
        curve: 1.35,
        essential: true
      });

      // 対応するピンのポップアップを開く
      const marker = markersRef.current[selectedVehicleId];
      if (marker) {
        const popup = marker.getPopup();
        if (popup && !popup.isOpen()) {
          // 少し遅らせてポップアップを開くことで、カメラの移動アニメーションと調和させる
          setTimeout(() => {
            marker.togglePopup();
          }, 350);
        }
      }
    }
  }, [selectedVehicleId]); // vehiclesを依存配列から除外して不必要なカメラ飛び出しを防止

  return (
    <div className="w-full h-full">
      {/* マウント先のコンテナ */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
