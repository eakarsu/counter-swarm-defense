import { Layers } from 'lucide-react';
import ThreatDetectionTimeline from '../components/customViews/ThreatDetectionTimeline';
import SensorCoverageHeatmap from '../components/customViews/SensorCoverageHeatmap';
import EngagementReportPdf from '../components/customViews/EngagementReportPdf';
import RoeEditor from '../components/customViews/RoeEditor';

export default function CustomViewsPage() {
  return (
    <div className="p-6 space-y-5" data-testid="custom-views-page">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers size={24} className="text-red-400" /> Defense Views
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Counter-swarm defense custom views — threat timeline, sensor coverage heatmap, engagement after-action PDF, and ROE editor.
          Defensive security research only.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ThreatDetectionTimeline />
        <SensorCoverageHeatmap />
      </div>
      <EngagementReportPdf />
      <RoeEditor />
    </div>
  );
}
