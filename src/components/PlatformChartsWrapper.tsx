import { Suspense, lazy } from 'react';
const PlatformCharts = lazy(() => import('./PlatformCharts'));

export default function PlatformChartsWrapper({ platformData, platformCompareMode }: { platformData: any[]; platformCompareMode: 'overall' | 'monthly' }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Suspense fallback={
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }>
        <PlatformCharts
          platformData={platformData}
          platformCompareMode={platformCompareMode}
        />
      </Suspense>
    </div>
  );
}
