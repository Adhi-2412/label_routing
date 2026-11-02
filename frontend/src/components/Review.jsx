import { useEffect, useState } from "react";
import { api, postJson } from "../api.js";
import { Confidence, Tag } from "./ui.jsx";

function Item({ scan, onDone }) {
  const [awb, setAwb] = useState(scan.awb || "");
  const [pin, setPin] = useState(scan.pin || "");
  const [error, setError] = useState("");

  async function route() {
    try { await postJson(`/api/scans/${scan.id}/resolve`, { awb: awb || null, pin }); onDone(); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="panel">
      <div className="row"><b>Scan #{scan.id}</b><Tag status={scan.status} /><Confidence value={scan.confidence} /></div>
      <pre>{scan.raw_text}</pre>
      <div className="row">
        <input type="text" placeholder="AWB" value={awb} onChange={(e) => setAwb(e.target.value)} />
        <input type="text" placeholder="PIN" size={8} value={pin} onChange={(e) => setPin(e.target.value)} />
        <button className="pri" onClick={route}>Route parcel</button>
        {error && <span className="err">{error}</span>}
      </div>
    </div>
  );
}

export default function Review() {
  const [rows, setRows] = useState(null);
  const load = () => api("/api/scans?status=review").then(setRows);
  useEffect(() => { load(); }, []);

  if (!rows) return <p>Loading...</p>;
  return (
    <>
      <h2>Review queue</h2>
      {rows.length
        ? rows.map((s) => <Item key={s.id} scan={s} onDone={load} />)
        : <div className="panel">The queue is empty. Every label was routed automatically.</div>}
    </>
  );
}
