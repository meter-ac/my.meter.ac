export default function RadiationTable({ date, readings }) {
  const sorted = [...readings].sort((a, b) => a.location.localeCompare(b.location));
  return (
    <div className="table-view">
      <div className="table-view__note">
        Data as of {date} — this feed is a daily reference dataset, not live, and hasn't been updated more recently.
      </div>
      <div className="table-view__scroll">
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Gamma dose rate [µSv/h]</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.location}>
                <td>{r.location}</td>
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-view__count">{sorted.length} locations</div>
    </div>
  );
}
