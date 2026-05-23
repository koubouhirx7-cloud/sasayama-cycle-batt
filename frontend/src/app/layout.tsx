import '../styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '管理者ダッシュボード | 遠隔バッテリー ＆ 位置情報管理',
  description: '電動自転車のバッテリー残量、位置情報、およびメンテナンス日誌の管理ダッシュボード',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
