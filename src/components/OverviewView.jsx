import { useState } from 'react';
import NetworkSnapshot from './NetworkSnapshot.jsx';
import CalendarHeatmap from './CalendarHeatmap.jsx';
import NimhSummary from './NimhSummary.jsx';
import EarthquakeSummary from './EarthquakeSummary.jsx';
import EeaCalendar from './EeaCalendar.jsx';

const CATEGORIES = [
  ['network', 'Network'],
  ['nimh', 'NIMH'],
  ['earthquakes', 'Earthquakes'],
  ['radiation', 'Radiation'],
];

export default function OverviewView({ stations, currentReadings, onOpenNode }) {
  const [category, setCategory] = useState('network');

  return (
    <div className="overview-view">
      <div className="layer-controls__segmented overview-view__categories">
        {CATEGORIES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={category === key ? 'is-active' : ''}
            onClick={() => setCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {category === 'network' && (
        <>
          <section className="overview-view__section">
            <h2>Right now</h2>
            <NetworkSnapshot stations={stations} currentReadings={currentReadings} onOpenNode={onOpenNode} />
          </section>

          <section className="overview-view__section overview-view__section--wide">
            <h2>Long-term trend</h2>
            <p className="overview-view__hint">Average daily low/high — pick a station, region, or the whole network.</p>
            <CalendarHeatmap stations={stations} />
          </section>
        </>
      )}

      {category === 'nimh' && (
        <section className="overview-view__section overview-view__section--wide">
          <h2>NIMH weather stations</h2>
          <p className="overview-view__hint">
            Distribution across all 44 official Bulgarian met-institute stations for the selected window.
          </p>
          <NimhSummary />
        </section>
      )}

      {category === 'earthquakes' && (
        <section className="overview-view__section overview-view__section--wide">
          <h2>Regional earthquakes</h2>
          <p className="overview-view__hint">Distribution by region for the selected window.</p>
          <EarthquakeSummary />
        </section>
      )}

      {category === 'radiation' && (
        <section className="overview-view__section overview-view__section--wide">
          <h2>Background radiation (EEA)</h2>
          <p className="overview-view__hint">
            Daily gamma dose rate history per location — a reference dataset, not a live feed.
          </p>
          <EeaCalendar />
        </section>
      )}
    </div>
  );
}
