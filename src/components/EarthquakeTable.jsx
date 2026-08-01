export default function EarthquakeTable({ earthquakes }) {
  return (
    <div className="table-view">
      <div className="table-view__scroll">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Location</th>
              <th>Magnitude</th>
              <th>Depth [km]</th>
              <th>Lat</th>
              <th>Lon</th>
            </tr>
          </thead>
          <tbody>
            {earthquakes.map((eq, i) => (
              <tr key={`${eq.id}-${i}`}>
                <td>{eq.time}</td>
                <td>{eq.location}</td>
                <td>{eq.magnitude}</td>
                <td>{eq.depth}</td>
                <td>{eq.lat}</td>
                <td>{eq.lon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-view__count">{earthquakes.length} recent earthquakes</div>
    </div>
  );
}
