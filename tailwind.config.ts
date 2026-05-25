import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./features/**/*.{ts,tsx}'],
  theme: {extend:{colors:{bg:'#020817',primary:'#14B8A6',secondary:'#22D3EE',text:'#F8FAFC',muted:'#94A3B8'}}},
  plugins: []
} satisfies Config;
