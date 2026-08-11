import { ArrowRight, BookOpenCheck, MousePointerClick, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import {
  beforeFirstTradeConcepts,
  beginnerMistakes,
  firstTradeGuideEventName,
  firstTradeWalkthroughSteps,
  glossaryTerms,
  orderLifecycleSteps,
  orderStatusGuide,
  orderTypeDecisionGuide,
  orderTypeGuide,
  replayTourEventName,
  workedTradingExample
} from "../data/beginnerGuidance";

const GuideCard = ({ id, title, eyebrow, children, className = "" }) => (
  <GlassPanel id={id} className={`scroll-mt-24 space-y-3 ${className}`}>
    {eyebrow ? <p className="text-xs font-semibold uppercase text-cyan">{eyebrow}</p> : null}
    <h2 className="text-lg font-semibold text-white">{title}</h2>
    <div className="text-sm leading-6 text-[#C2C4D2]">{children}</div>
  </GlassPanel>
);

const Flow = ({ steps }) => (
  <div className="flex flex-wrap items-center gap-2 text-sm">
    {steps.map((step, index) => (
      <span key={step} className="inline-flex items-center gap-2">
        <span className="rounded-lg border border-white/10 bg-[#080910] px-3 py-2 text-[#E7E9F3]">{step}</span>
        {index < steps.length - 1 ? <ArrowRight className="h-4 w-4 text-cyan" aria-hidden="true" /> : null}
      </span>
    ))}
  </div>
);

const dispatchEvent = (eventName) => {
  window.dispatchEvent(new CustomEvent(eventName));
};

const TradingGuide = () => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Trading Guide"
          subtitle="Learn by doing: understand the basics, place a careful virtual order, then review what changed."
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => dispatchEvent(firstTradeGuideEventName)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20"
          >
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            Start First Virtual Trade
          </button>
          <button
            type="button"
            onClick={() => dispatchEvent(replayTourEventName)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Replay Trading Tour
          </button>
        </div>
      </div>

      <GlassPanel className="border-cyan/20 bg-cyan/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan">Practice note</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#C2C4D2]">
              Trade Abhyas is a virtual stock trading platform. Orders here do not reach a real exchange, and this guide explains platform usage only. It is not investment advice or a stock recommendation.
            </p>
          </div>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan">
            Open Dashboard
          </Link>
        </div>
      </GlassPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <GuideCard id="before-first-trade" title="Before Your First Trade" eyebrow="Start here">
          <div className="grid gap-3 sm:grid-cols-2">
            {beforeFirstTradeConcepts.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-[#080910] p-4">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2">{item.body}</p>
              </div>
            ))}
          </div>
        </GuideCard>

        <GuideCard title="How a Complete Trade Flows" eyebrow="Learning path">
          <Flow steps={["Search", "Open Stock", "Review Price", "Review Order", "Confirm", "Check Portfolio", "Check Transactions"]} />
          <p className="mt-4">
            You choose the stock and quantity. The platform helps you understand what each order field means before you confirm.
          </p>
        </GuideCard>

        <GuideCard id="worked-example" title="Complete Worked Trading Example" eyebrow={workedTradingExample.title}>
          <p>{workedTradingExample.scenario}</p>
          <ol className="mt-4 space-y-2">
            {workedTradingExample.steps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-lg border border-white/10 bg-[#080910] p-3">
                <span className="font-mono text-xs font-semibold text-cyan">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </GuideCard>

        <GuideCard id="order-types" title="Order Types" eyebrow="Choose intentionally">
          <div className="grid gap-3 sm:grid-cols-2">
            {orderTypeGuide.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-[#080910] p-4">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2">{item.body}</p>
              </div>
            ))}
          </div>
        </GuideCard>

        <GuideCard title="Which Order Type Should I Use?" eyebrow="Decision helper">
          <div className="grid gap-3">
            {orderTypeDecisionGuide.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-[#080910] p-4">
                <p className="text-xs font-semibold uppercase text-[#A1A1B5]">{item.title}</p>
                <h3 className="mt-1 font-semibold text-white">{item.recommendation}</h3>
                <p className="mt-2">{item.body}</p>
              </div>
            ))}
          </div>
        </GuideCard>

        <GuideCard id="order-lifecycle" title="Order Lifecycle Explainer" eyebrow="After you click confirm">
          <div className="space-y-3">
            {orderLifecycleSteps.map((item, index) => (
              <div key={item.title} className="flex gap-3 rounded-lg border border-white/10 bg-[#080910] p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-xs font-semibold text-cyan">{index + 1}</span>
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </GuideCard>

        <GuideCard id="order-statuses" title="Order Statuses" eyebrow="Reading the result">
          <div className="grid gap-3 sm:grid-cols-2">
            {orderStatusGuide.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-[#080910] p-4">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2">{item.body}</p>
              </div>
            ))}
          </div>
        </GuideCard>

        <GuideCard id="portfolio" title="Portfolio vs Positions" eyebrow="Where to look next">
          <p>
            Portfolio focuses on what you currently hold, including quantity, average buy price, current value, and holding P&L. Positions shows open, partially closed, and closed trading outcomes, including realized and unrealized P&L.
          </p>
        </GuideCard>

        <GuideCard id="pnl" title="Understanding P&L" eyebrow="Profit and loss">
          <div className="space-y-3">
            <p><span className="font-semibold text-white">Average Price:</span> Weighted average purchase price of currently held shares.</p>
            <p><span className="font-semibold text-white">Unrealized P&L:</span> Profit or loss on shares still held. It changes as market price changes.</p>
            <p><span className="font-semibold text-white">Realized P&L:</span> Profit or loss recorded after selling shares.</p>
          </div>
        </GuideCard>

        <GuideCard title="Orders vs Transactions" eyebrow="Important difference">
          <p><span className="font-semibold text-white">Orders</span> = every submitted trading instruction and its status.</p>
          <p className="mt-2"><span className="font-semibold text-white">Transactions</span> = trades that actually executed.</p>
        </GuideCard>

        <GuideCard id="market-hours" title="Market Hours" eyebrow="Timing matters">
          <p>
            NSE session: 09:15 AM - 03:30 PM Asia/Kolkata, Monday-Friday, excluding configured exchange holidays. Eligible Market orders outside trading hours may remain Pending.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="font-semibold text-white">Market Open</p>
              <p className="mt-2">Eligible Market orders may execute using available market data.</p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-semibold text-white">Market Closed</p>
              <p className="mt-2">Eligible Market orders remain Pending until a valid trading session.</p>
            </div>
          </div>
          <p className="mt-3">Limit and Stop orders still depend on their configured price and trigger rules.</p>
        </GuideCard>
      </div>

      <GuideCard id="beginner-mistakes" title="Beginner Mistakes & Safeguards" eyebrow="Avoid common confusion">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {beginnerMistakes.map((item) => (
            <div key={item.title} className="rounded-lg border border-white/10 bg-[#080910] p-4">
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="mt-2">{item.safeguard}</p>
            </div>
          ))}
        </div>
      </GuideCard>

      <GuideCard title="Improving Your Trading" eyebrow="Optional intermediate tools">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Risk Calculator", "Practise sizing a long position from balance, entry, stop-loss, and risk percentage."],
            ["Performance Analytics", "Measure closed-trade win rate, realized P&L, average win/loss, and drawdown."],
            ["Technical Indicators", "Add SMA, EMA, RSI, and MACD to charts for study, not automatic signals."],
            ["Market Movers", "Discover validated NSE movers without fake rankings or recommendations."],
            ["Trade Review", "Write reflections after a position is fully closed."]
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-white/10 bg-[#080910] p-4">
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/analytics" className="inline-flex min-h-11 items-center rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
            Open Analytics
          </Link>
          <Link to="/market" className="inline-flex min-h-11 items-center rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan">
            Open Market Movers
          </Link>
        </div>
      </GuideCard>

      <GuideCard title="Guided First Virtual Trade" eyebrow="Hands-on walkthrough">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {firstTradeWalkthroughSteps.map((step, index) => (
            <div key={step} className="rounded-lg border border-white/10 bg-[#080910] p-4">
              <p className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10 text-xs font-semibold text-cyan">{index + 1}</p>
              <p className="mt-3">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => dispatchEvent(firstTradeGuideEventName)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
          >
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            Start Guided Practice
          </button>
          <Link to="/trading-guide#glossary" className="inline-flex min-h-11 items-center rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan">
            Open Glossary
          </Link>
        </div>
      </GuideCard>

      <GuideCard id="glossary" title="Trading Glossary" eyebrow="Alphabetical quick reference">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {glossaryTerms.map(([term, definition]) => (
            <div key={term} className="rounded-lg border border-white/10 bg-[#080910] p-4">
              <h3 className="font-semibold text-white">{term}</h3>
              <p className="mt-2">{definition}</p>
            </div>
          ))}
        </div>
      </GuideCard>
    </div>
  );
};

export default TradingGuide;
