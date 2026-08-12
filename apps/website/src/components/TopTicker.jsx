import { Link } from "react-router-dom";

const quickLinks = [
  { label: "Market Pulse", to: "/", tone: "text-amber" },
  { label: "Live Quotes", to: "/watchlist" },
  { label: "Price Chart", to: "/stocks/RELIANCE" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Market News", to: "/#market-news" },
  { label: "Leaderboard", to: "/leaderboard" }
];

const TopTicker = () => {
  return (
    <div className="ticker-band relative overflow-hidden rounded-2xl border" aria-label="Quick access">
      <div className="ticker-scroll relative z-10 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-300">
        {quickLinks.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`rounded-lg px-3 py-2 outline-none transition hover:bg-white/5 hover:text-cyan focus-visible:ring-2 focus-visible:ring-cyan/20 ${item.tone || ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TopTicker;
