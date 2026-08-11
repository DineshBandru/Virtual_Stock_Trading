import {
  Activity,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  GraduationCap,
  Home,
  LayoutList,
  ListOrdered,
  SearchCheck,
  ReceiptText,
  Settings,
  Trophy,
  UsersRound
} from "lucide-react";

export const navigationGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: Home, exact: true, aliases: ["/dashboard"] }
    ]
  },
  {
    label: "Trading",
    items: [
      { label: "Portfolio", path: "/portfolio", icon: BriefcaseBusiness },
      { label: "Positions", path: "/positions", icon: Activity },
      { label: "Transactions", path: "/transactions", icon: ReceiptText },
      { label: "Orders", path: "/orders", icon: ListOrdered }
    ]
  },
  {
    label: "Market Tools",
    items: [
      { label: "Watchlist", path: "/watchlist", icon: LayoutList },
      { label: "Alerts", path: "/alerts", icon: Bell },
      { label: "Market Movers", path: "/market", icon: SearchCheck },
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
      { label: "Trading Guide", path: "/trading-guide", icon: GraduationCap }
    ]
  },
  {
    label: "Community",
    items: [
      { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
      { label: "Competitions", path: "/competitions", icon: UsersRound }
    ]
  },
  {
    label: "Account",
    items: [
      { label: "Settings", path: "/settings/account", icon: Settings, activePrefix: "/settings" }
    ]
  }
];

export const allNavigationItems = navigationGroups.flatMap((group) => group.items);

export const isNavigationItemActive = (item, pathname) => {
  if (item.aliases?.includes(pathname)) {
    return true;
  }

  if (item.activePrefix && (pathname === item.activePrefix || pathname.startsWith(`${item.activePrefix}/`))) {
    return true;
  }

  if (item.exact) {
    return pathname === item.path;
  }

  return pathname === item.path || pathname.startsWith(`${item.path}/`);
};
