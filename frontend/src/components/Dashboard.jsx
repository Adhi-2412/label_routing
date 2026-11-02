import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ScanTable } from "./ui.jsx";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [scans, setScans] = useState([]);

  useEffect(() => {
    api("/api/stats").then(setStats);
    api("/api/scans").then((r) => setScans(r.slice(0, 10)));
  }, []);

  if (!stats) return <p>Loading...</p>;
  const cards = [
    ["Labels read", stats.total],
    ["Auto-routed", stats.auto_routed],
    ["Needs review", stats.review],
    ["Automation rate", Math.round(stats.automation_rate * 100) + "%"],
    ["Avg confidence", Math.round(stats.avg_confidence * 100) + "%"],
  ];
  const hubs = Object.entries(stats.by_hub);
  const max = Math.max(1, ...hubs.map(([, v]) => v));

  return (
    <>
      <h2>Today at the sorting line</h2>
      <div className="stats panel">
        {cards.map(([label, value]) => (
          <div className="stat" key={label}><b>{value}</b><span>{label}</span></div>
        ))}
      </div>
      <div className="panel">
        <h2>Parcels per hub</h2>
        {hubs.length ? hubs.map(([name, n]) => (
          <div className="row" style={{ marginBottom: 6 }} key={name}>
            <span style={{ width: 140 }}>{name}</span>
            <div className="bar" style={{ flex: 1 }}><i style={{ width: `${(n / max) * 100}%` }} /></div>
            <b>{n}</b>
          </div>
        )) : <p>No routed parcels yet.</p>}
      </div>
      <div className="panel scroll">
        <h2>Recent scans</h2>
        <ScanTable rows={scans} />
      </div>
    </>
  );
}
