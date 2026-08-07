import {
  BarChart3,
  BriefcaseBusiness,
  Home,
  ListOrdered,
  LogOut,
  ReceiptText,
  UsersRound
} from "lucide-react";
import { websiteUrl } from "./urls";

export const adminNavigationGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: Home, exact: true }
    ]
  },
  {
    label: "Management",
    items: [
      { label: "Users", path: "/users", icon: UsersRound },
      { label: "Transactions", path: "/transactions", icon: ReceiptText },
      { label: "Orders", path: "/orders", icon: ListOrdered },
      { label: "Competitions", path: "/competitions", icon: BriefcaseBusiness }
    ]
  },
  {
    label: "Account",
    items: [
      { label: "Website", path: websiteUrl, icon: BarChart3, external: true },
      { label: "Logout", action: "logout", icon: LogOut, destructive: true }
    ]
  }
];

export const isAdminNavigationItemActive = (item, pathname) => {
  if (!item.path || item.external || item.action) {
    return false;
  }
  if (item.exact) {
    return pathname === item.path;
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
};
