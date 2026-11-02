import { useState } from "react";
import { api } from "../api.js";
import { Tag } from "./ui.jsx";

export default function Scan() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return setError("Choose an image first.");
    setBusy(true); setError(""); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try { setResult(await api("/api/scan", { method: "POST", body: fd })); }
    catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <>
      <h2>Scan a label</h2>
      <div className="panel">
        <p className="muted" style={{ marginTop: 0 }}>
          Upload a photo of a label with a damaged or missing barcode. The system reads the text,
          matches it to the manifest, and picks a hub.
        </p>
        <div className="row">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          <button className="pri" onClick={submit} disabled={busy}>{busy ? "Reading..." : "Read label"}</button>
        </div>
        {error && <p className="err">{error}</p>}
        {result && (
          <>
            <p><Tag status={result.status} /> Confidence {Math.round(result.confidence * 100)}%</p>
            <table><tbody>
              <tr><th>AWB</th><td>{result.awb || "-"}</td></tr>
              <tr><th>PIN</th><td>{result.pin || "-"}</td></tr>
              <tr><th>Recipient</th><td>{result.matched_recipient || "-"}</td></tr>
              <tr><th>Hub</th><td>{result.hub || "Sent to review queue"}</td></tr>
            </tbody></table>
            <h2 style={{ marginTop: 16 }}>Text read from the label</h2>
            <pre>{result.raw_text}</pre>
          </>
        )}
      </div>
    </>
  );
}
