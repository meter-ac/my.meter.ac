import NetworkSnapshot from './NetworkSnapshot.jsx';
import CalendarHeatmap from './CalendarHeatmap.jsx';

export default function OverviewView({ stations, currentReadings, onOpenNode }) {
  return (
    <div className="overview-view">
      <section className="overview-view__section">
        <h2>Right now</h2>
        <NetworkSnapshot stations={stations} currentReadings={currentReadings} onOpenNode={onOpenNode} />
      </section>

      <section className="overview-view__section overview-view__section--wide">
        <h2>Long-term trend</h2>
        <p className="overview-view__hint">Average daily low/high — pick a station, region, or the whole network.</p>
        <CalendarHeatmap stations={stations} />
      </section>
    </div>
  );
}
