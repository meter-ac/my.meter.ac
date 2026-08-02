import NetworkSnapshot from './NetworkSnapshot.jsx';
import CalendarHeatmap from './CalendarHeatmap.jsx';

export default function OverviewView({ stations, currentReadings, onOpenNode }) {
  return (
    <div className="overview-view">
      <section className="overview-view__section">
        <h2>Right now</h2>
        <NetworkSnapshot stations={stations} currentReadings={currentReadings} onOpenNode={onOpenNode} />
      </section>

      <section className="overview-view__section">
        <h2>Long-term trend</h2>
        <p className="overview-view__hint">Network-wide daily average, last 12 months.</p>
        <CalendarHeatmap />
      </section>
    </div>
  );
}
