import { useEffect, useState } from "react";
import { api, postJson } from "../api.js";

const EMPTY = { awb: "", recipient: "", address: "", pin: "", phone: "" };

export default function Manifest() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const load = () => api("/api/shipments").then(setRows);
  useEffect(() => { load(); }, []);

  const field = (key, placeholder, size) => (
    <input type="text" placeholder={placeholder} size={size} value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
  );

  async function add() {
    try { await postJson("/api/shipments", form); setForm(EMPTY); setError(""); load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <>
      <h2>Manifest</h2>
      <div className="panel">
        <div className="row">
          {field("awb", "AWB")}{field("recipient", "Recipient")}{field("address", "Address", 30)}
          {field("pin", "PIN", 8)}{field("phone", "Phone", 12)}
          <button className="pri" onClick={add}>Add shipment</button>
        </div>
        {error && <p className="err">{error}</p>}
      </div>
      <div className="panel scroll">
        <table>
          <thead><tr><th>AWB</th><th>Recipient</th><th>Address</th><th>PIN</th><th>Phone</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{r.awb}</td><td>{r.recipient}</td><td>{r.address}</td><td>{r.pin}</td><td>{r.phone}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
