/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0F19',
          800: '#151D30',
          700: '#1F2B48',
          600: '#2E3F66',
        },
        satoyama: {
          50: '#F4F7F4',   /* 優しい薄緑の背景色 */
          100: '#E8EFE8',  /* 少し濃い薄緑 */
          200: '#D1E0D1',
          600: '#4B7F52',  /* 里山グリーン */
          700: '#3A6340',  /* 深いグリーン */
          800: '#2A472E',
          900: '#152E18',  /* ほぼ黒に近いダークオリーブ */
        },
        brand: {
          green: '#059669',  /* 鮮やかなエメラルド */
          yellow: '#D97706', /* 落ち着いたゴールド */
          red: '#DC2626',    /* 警告の赤 */
          black: '#152E18',  /* 里山のダークオリーブ */
          blue: '#2563EB',
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(21, 46, 24, 0.15)',
      }
    },
  },
  plugins: [],
}
