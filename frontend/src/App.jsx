import { useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import Scan from "./components/Scan.jsx";
import Review from "./components/Review.jsx";
import Manifest from "./components/Manifest.jsx";

const TABS = [
  ["dash", "Dashboard", Dashboard],
  ["scan", "Scan a label", Scan],
  ["review", "Review queue", Review],
  ["manifest", "Manifest", Manifest],
];

export default function App() {
  const [tab, setTab] = useState("dash");
  const Active = TABS.find(([id]) => id === tab)[2];
  return (
    <>
      <header>
        <h1>LabelRoute</h1>
        <nav>
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        <Active />
      </main>
    </>
  );
}
