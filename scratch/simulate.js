/**
 * 高精度バッテリー監視システム 自動テスト＆シミュレーター (High-Fidelity Automated Simulator)
 * 
 * このスクリプトは、以下のシナリオを自動的に実行し、システムの信頼性、
 * バリデーション、認証、およびビジネスロジックの動作を確認します。
 * 
 * 1. APIキー認証テスト (正当なキー、無効なキー、キーなし)
 * 2. 車載端末からのリアルタイムデータ送信と状態更新 (Upsert & Master Creation)
 * 3. 低バッテリー警告ロジックのトリガー (Soc 10%以下の警告アラート)
 * 4. メンテナンス履歴の追加と取得
 * 
 * 実行方法:
 *   node scratch/simulate.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const EXPECTED_API_KEY = process.env.API_KEY || 'test-api-key';

// コンソールの文字色指定用カラーコード
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function logHeader(title) {
  console.log(`\n${COLORS.bright}${COLORS.blue}================================================================================`);
  console.log(`  ${title}`);
  console.log(`================================================================================${COLORS.reset}`);
}

function logSuccess(msg) {
  console.log(`${COLORS.green}✔ [SUCCESS] ${msg}${COLORS.reset}`);
}

function logError(msg, details = '') {
  console.error(`${COLORS.red}✘ [FAILED] ${msg}${COLORS.reset}`, details);
}

function logInfo(msg) {
  console.log(`${COLORS.yellow}ℹ [INFO] ${msg}${COLORS.reset}`);
}

function logStep(stepNum, title) {
  console.log(`\n${COLORS.bright}STEP ${stepNum}: ${title}${COLORS.reset}`);
  console.log('-'.repeat(50));
}

// 共通リクエスト関数
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();
  return { status: response.status, data };
}

// テレメトリ送信ヘルパー
async function sendTelemetry(payload, apiKey = EXPECTED_API_KEY) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey !== null) {
    headers['X-Device-API-Key'] = apiKey;
  }

  return await apiRequest('/api/v1/telemetry', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
}

// メンテナンスログ登録ヘルパー
async function addMaintenanceLog(deviceId, payload) {
  return await apiRequest(`/api/v1/vehicles/${deviceId}/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// メンテナンスログ取得ヘルパー
async function getMaintenanceLogs(deviceId) {
  return await apiRequest(`/api/v1/vehicles/${deviceId}/maintenance`);
}

// 車両一覧取得ヘルパー
async function getVehicles(batteryLessThan) {
  let query = '';
  if (batteryLessThan !== undefined) {
    query = `?battery_less_than=${batteryLessThan}`;
  }
  return await apiRequest(`/api/v1/vehicles${query}`);
}

// メイン実行関数
async function run() {
  logHeader('バッテリー監視システム 高精度QA信頼性シミュレーター (QA Simulator)');
  logInfo(`対象サーバー: ${BASE_URL}`);
  logInfo(`検証用APIキー: "${EXPECTED_API_KEY}"`);

  // 0. ヘルスチェックの確認
  try {
    const health = await apiRequest('/health');
    if (health.status !== 200) {
      throw new Error(`Healthcheck returned status ${health.status}`);
    }
    logSuccess('APIサーバーへの接続が確認されました。(/health OK)');
  } catch (err) {
    logError('APIサーバーが起動していないか、指定されたポートでアクセスできません。', err.message);
    logInfo('次のコマンドでサーバーを起動してください：');
    console.log(`  ${COLORS.bright}$ npm run dev${COLORS.reset}\n`);
    process.exit(1);
  }

  // ==========================================
  // STEP 1: APIキー認証の検証 (Security Verification)
  // ==========================================
  logStep(1, 'APIキー認証の堅牢性テスト (X-Device-API-Key)');

  const testPayload = {
    device_id: 'QA-DEV-999',
    battery_soc: 100,
    battery_voltage: 4200,
    current_lat: 35.6895,
    current_lng: 139.6917,
    status: 'available',
    timestamp: new Date().toISOString()
  };

  // 1-1. APIキーなし
  logInfo('APIキーヘッダーなしでデータ送信中...');
  const resNoKey = await sendTelemetry(testPayload, null);
  if (resNoKey.status === 401) {
    logSuccess('キーなしリクエストが正しく拒否されました (401 Unauthorized)。');
  } else {
    logError('キーなしリクエストが拒否されませんでした！', `Status: ${resNoKey.status}`);
  }

  // 1-2. 不正なAPIキー
  logInfo('無効なAPIキー ("invalid-key-example") でデータ送信中...');
  const resBadKey = await sendTelemetry(testPayload, 'invalid-key-example');
  if (resBadKey.status === 401) {
    logSuccess('無効なキーでのリクエストが正しく拒否されました (401 Unauthorized)。');
  } else {
    logError('無効なキーでのリクエストが拒否されませんでした！', `Status: ${resBadKey.status}`);
  }

  // 1-3. 正当なAPIキー
  logInfo('正しいAPIキーでデータ送信中...');
  const resGoodKey = await sendTelemetry(testPayload, EXPECTED_API_KEY);
  if (resGoodKey.status === 201) {
    logSuccess('正しいキーでのリクエストが承認され、登録に成功しました (201 Created)。');
  } else {
    logError('正しいキーでのリクエストが失敗しました！', JSON.stringify(resGoodKey.data));
  }

  // ==========================================
  // STEP 2: リアルタイム状態更新テスト (Real-time State Update)
  // ==========================================
  const targetDevice = 'QA-SIM-001';
  logStep(2, `リアルタイム端末状態更新 & マスター自動作成の検証 (${targetDevice})`);

  // 2-1. 端末からの初回データ送信
  const initPayload = {
    device_id: targetDevice,
    battery_soc: 85,
    battery_voltage: 4100,
    current_lat: 35.6895,
    current_lng: 139.6917,
    status: 'available',
    timestamp: new Date().toISOString()
  };

  logInfo(`端末 "${targetDevice}" の初期データ (SOC: 85%, Status: available) を送信中...`);
  const resInit = await sendTelemetry(initPayload);
  if (resInit.status === 201) {
    logSuccess('初期データの登録に成功しました。');
  } else {
    logError('初期データの登録に失敗しました。', JSON.stringify(resInit.data));
  }

  // 2-2. 最新状態の一覧を取得し、反映を確認
  logInfo('車両一覧 API を呼び出して登録状態を確認中...');
  const resVehicles1 = await getVehicles();
  if (resVehicles1.status === 200) {
    const v = resVehicles1.data.find(x => x.device_id === targetDevice);
    if (v) {
      logSuccess(`登録確認: デバイス "${v.device_id}" が見つかりました。`);
      console.log(`        [DB状態] SOC: ${v.battery_soc}%, 電圧: ${v.battery_voltage}mV, ステータス: ${v.status}`);
      if (v.battery_soc === 85 && v.status === 'available') {
        logSuccess('初期ステータスとバッテリー残量が一致しています。');
      } else {
        logError('登録データの不整合を検知しました！');
      }
    } else {
      logError(`車両一覧からデバイス "${targetDevice}" が見つかりません！`);
    }
  } else {
    logError('車両一覧の取得に失敗しました。', JSON.stringify(resVehicles1.data));
  }

  // 2-3. 端末のデータを更新（稼働開始、バッテリー減少、移動）
  const updatePayload = {
    device_id: targetDevice,
    battery_soc: 80,
    battery_voltage: 4000,
    current_lat: 35.6920,
    current_lng: 139.6935,
    status: 'in_use',
    timestamp: new Date().toISOString()
  };

  logInfo(`端末 "${targetDevice}" の更新データ (SOC: 80%, Status: in_use, 位置変更) を送信中...`);
  const resUpdate = await sendTelemetry(updatePayload);
  if (resUpdate.status === 201) {
    logSuccess('更新データの登録に成功しました。');
  } else {
    logError('更新データの登録に失敗しました。', JSON.stringify(resUpdate.data));
  }

  // 2-4. 最新状態の一覧を取得し、更新を確認
  logInfo('車両一覧を再取得して更新の反映を確認中...');
  const resVehicles2 = await getVehicles();
  if (resVehicles2.status === 200) {
    const v = resVehicles2.data.find(x => x.device_id === targetDevice);
    if (v) {
      console.log(`        [更新後DB状態] SOC: ${v.battery_soc}%, 電圧: ${v.battery_voltage}mV, ステータス: ${v.status}, 緯度/経度: ${v.current_lat}/${v.current_lng}`);
      if (v.battery_soc === 80 && v.status === 'in_use' && v.current_lat === 35.6920) {
        logSuccess('リアルタイム状態の更新（Upsert処理）が正しく機能しています。');
      } else {
        logError('更新データが正しく反映されていません！');
      }
    } else {
      logError(`車両一覧からデバイス "${targetDevice}" が消去されています！`);
    }
  } else {
    logError('車両一覧の再取得に失敗しました。', JSON.stringify(resVehicles2.data));
  }

  // ==========================================
  // STEP 3: 低バッテリー警告ロジックの検証 (Low Battery Alert Logic)
  // ==========================================
  logStep(3, '低バッテリー警告ロジック (SoC 10%以下) の動作検証');

  // 3-1. バッテリー残量 15% (通常状態)
  const soc15Payload = {
    device_id: targetDevice,
    battery_soc: 15,
    battery_voltage: 3500,
    current_lat: 35.6930,
    current_lng: 139.6940,
    status: 'in_use',
    timestamp: new Date().toISOString()
  };
  logInfo(`端末 "${targetDevice}" のデータ (SOC: 15% - 正常範囲) を送信中...`);
  await sendTelemetry(soc15Payload);
  logInfo('（サーバーログに [ALERT] 警告が出力されないことを確認してください）');

  // 3-2. バッテリー残量 8% (低バッテリー状態)
  const soc8Payload = {
    device_id: targetDevice,
    battery_soc: 8,
    battery_voltage: 3300,
    current_lat: 35.6935,
    current_lng: 139.6945,
    status: 'in_use',
    timestamp: new Date().toISOString()
  };
  logInfo(`端末 "${targetDevice}" のデータ (SOC: 8% - 警告閾値以下) を送信中...`);
  const resAlert = await sendTelemetry(soc8Payload);
  if (resAlert.status === 201) {
    logSuccess('低バッテリーデータの送信に成功しました。');
    console.log(`${COLORS.yellow}📢 [バックエンドコンソールを確認してください]${COLORS.reset}`);
    console.log(`   サーバーの標準出力に以下の警告ログが出力されているはずです：`);
    console.log(`   "${COLORS.red}warn: [ALERT] Low battery warning for device ID: "${targetDevice}". Current SoC is 8%!${COLORS.reset}"`);
  } else {
    logError('低バッテリーデータの送信に失敗しました。', JSON.stringify(resAlert.data));
  }

  // 3-3. 低バッテリーフィルタリング機能の検証
  logInfo('低バッテリー車両フィルタリング (battery_less_than=10) を呼び出し中...');
  const resLowVehicles = await getVehicles(10);
  if (resLowVehicles.status === 200) {
    const lowVehicles = resLowVehicles.data;
    console.log(`        [フィルタ結果] 件数: ${lowVehicles.length}台`);
    lowVehicles.forEach(x => {
      console.log(`        - 車両: ${x.device_id}, SOC: ${x.battery_soc}%`);
    });

    const isTargetIncluded = lowVehicles.some(x => x.device_id === targetDevice);
    const areAllLow = lowVehicles.every(x => x.battery_soc <= 10);

    if (isTargetIncluded && areAllLow) {
      logSuccess('低バッテリー車両のクエリフィルタリングが正しく機能しています。');
    } else {
      logError('低バッテリーフィルタの絞り込み条件にエラーが発生しています。');
    }
  } else {
    logError('低バッテリー車両フィルタリングの取得に失敗しました。', JSON.stringify(resLowVehicles.data));
  }

  // ==========================================
  // STEP 4: メンテナンスログ機能の検証 (Maintenance Log Integration)
  // ==========================================
  logStep(4, 'メンテナンス記録 (Maintenance Log) の登録および取得検証');

  // 4-1. メンテナンス履歴の追加 (バッテリー交換)
  const maintenancePayload = {
    type: 'battery_replacement',
    description: 'シミュレーションテスト：低残量アラート発生のため、バッテリーを急速充電済みのものと交換。コネクタ検査完了。'
  };

  logInfo(`端末 "${targetDevice}" にメンテナンス履歴 (バッテリー交換) を登録中...`);
  const resAddMaint = await addMaintenanceLog(targetDevice, maintenancePayload);
  if (resAddMaint.status === 201) {
    logSuccess('メンテナンス履歴の登録に成功しました。');
    console.log(`        [登録ログID] ${resAddMaint.data.id}`);
  } else {
    logError('メンテナンス履歴の登録に失敗しました。', JSON.stringify(resAddMaint.data));
  }

  // 4-2. メンテナンス履歴の取得
  logInfo(`端末 "${targetDevice}" のメンテナンス履歴リストを取得中...`);
  const resGetMaint = await getMaintenanceLogs(targetDevice);
  if (resGetMaint.status === 200) {
    const logs = resGetMaint.data;
    console.log(`        [履歴件数] ${logs.length} 件`);
    logs.forEach((log, index) => {
      console.log(`        - #${index + 1} 種類: ${log.type}, 作業日: ${log.performed_at}`);
      console.log(`          内容: ${log.description}`);
    });

    const hasBatteryReplacement = logs.some(x => x.type === 'battery_replacement');
    if (hasBatteryReplacement) {
      logSuccess('メンテナンス履歴のデータ永続化とリレーション取得が正常に完了しました。');
    } else {
      logError('追加したはずのバッテリー交換ログが見つかりません。');
    }
  } else {
    logError('メンテナンス履歴リストの取得に失敗しました。', JSON.stringify(resGetMaint.data));
  }

  // 4-3. メンテナンス完了後のバッテリー復旧テレメトリ送信
  const restoredPayload = {
    device_id: targetDevice,
    battery_soc: 100, // フル充電
    battery_voltage: 4200,
    current_lat: 35.6895,
    current_lng: 139.6917,
    status: 'available',
    timestamp: new Date().toISOString()
  };

  logInfo(`メンテナンス完了に伴い、復旧データ (SOC: 100%, Status: available) を送信中...`);
  const resRestore = await sendTelemetry(restoredPayload);
  if (resRestore.status === 201) {
    logSuccess('復旧データの送信に成功しました。');
    
    // 確認
    const resFinal = await getVehicles();
    const finalState = resFinal.data.find(x => x.device_id === targetDevice);
    if (finalState && finalState.battery_soc === 100 && finalState.status === 'available') {
      logSuccess(`検証成功: 車両 "${targetDevice}" の状態は完全に復旧されました。`);
    } else {
      logError('復旧状態の不整合が発生しています。');
    }
  } else {
    logError('復旧データの送信に失敗しました。', JSON.stringify(resRestore.data));
  }

  // ==========================================
  // シミュレーション終了
  // ==========================================
  console.log(`\n${COLORS.bright}${COLORS.green}================================================================================`);
  console.log('🎉 すべてのQAシミュレーションテストシナリオが正常に終了しました！');
  console.log(`================================================================================${COLORS.reset}\n`);
}

run().catch(error => {
  logError('予期せぬエラーによりシミュレーションが中断されました。', error);
  process.exit(1);
});
