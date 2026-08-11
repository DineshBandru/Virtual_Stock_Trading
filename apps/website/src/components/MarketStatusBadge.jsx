import { Clock3 } from "lucide-react";
import { getNseMarketStatus } from "../utils/marketStatus";

const MarketStatusBadge = ({ quote, compact = false }) => {
  const status = getNseMarketStatus(quote);

  return (
    <div className={`rounded-lg border px-3 py-2 ${status.tone}`}>
      <div className="flex items-center gap-2">
        <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold">{status.label}</span>
      </div>
      {!compact ? (
        <p className="mt-1 text-xs leading-5 text-current/90">
          {status.helper} {status.hours}
        </p>
      ) : null}
    </div>
  );
};

export default MarketStatusBadge;
