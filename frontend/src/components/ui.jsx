export const Confidence = ({ value }) => (
  <div className="row" style={{ gap: 6 }}>
    <div className="bar" style={{ width: 80 }}><i style={{ width: `${Math.round(value * 100)}%` }} /></div>
    {Math.round(value * 100)}%
  </div>
);

export const Tag = ({ status }) => <span className={`tag ${status}`}>{status.replace("_", " ")}</span>;

export function ScanTable({ rows }) {
  if (!rows.length) return <p>No scans yet. Upload a label on the Scan tab.</p>;
  return (
    <table>
      <thead>
        <tr><th>Time</th><th>AWB</th><th>PIN</th><th>Recipient</th><th>Hub</th><th>Confidence</th><th>Status</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{new Date(r.created + "Z").toLocaleString()}</td>
            <td>{r.awb || "-"}</td>
            <td>{r.pin || "-"}</td>
            <td>{r.matched_recipient || "-"}</td>
            <td>{r.hub || "-"}</td>
            <td><Confidence value={r.confidence} /></td>
            <td><Tag status={r.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
