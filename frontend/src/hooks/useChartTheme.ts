import { useTheme } from '../context/ThemeContext';

export interface ChartThemeTokens {
  gridStroke: string;
  textColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  isDark: boolean;
  theme: 'light' | 'dark';
}

export const useChartTheme = (): ChartThemeTokens => {
  const { theme, isDark } = useTheme();

  return {
    gridStroke: isDark ? '#1F293D' : '#E2E8F0',
    textColor: isDark ? '#94A3B8' : '#64748B',
    tooltipBg: isDark ? '#0F172A' : '#FFFFFF',
    tooltipBorder: isDark ? '#334155' : '#CBD5E1',
    tooltipText: isDark ? '#F8FAFC' : '#0F172A',
    isDark,
    theme,
  };
};

export default useChartTheme;
