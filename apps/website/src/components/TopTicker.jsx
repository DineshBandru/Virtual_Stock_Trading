const TopTicker = () => {
  return (
    <div className="ticker-band relative overflow-hidden rounded-full border border-borderGlow/70">
      <div className="ticker-gradient absolute inset-0 opacity-80" />
      <div className="ticker-scroll relative z-10 flex items-center gap-8 whitespace-nowrap px-6 py-2 text-xs font-mono uppercase tracking-[0.3em] text-black">
        <span>Market Pulse</span>
        <span>Live Quotes</span>
        <span>AI Signals</span>
        <span>Portfolio Sync</span>
        <span>Breaking News</span>
        <span>Leaderboard Updates</span>
      </div>
    </div>
  );
};

export default TopTicker;
