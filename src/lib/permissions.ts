import {
  LayoutDashboard, Users, CalendarCheck, CalendarOff, BedDouble, Boxes, Wrench,
  UtensilsCrossed, FileText, BarChart3, Settings2, type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "./i18n";

export const P = {
  usersRead: "users.read",
  usersManage: "users.manage",
  rolesRead: "roles.read",
  rolesManage: "roles.manage",
  unitsRead: "units.read",
  unitsManage: "units.manage",
  auditRead: "audit.read",
  personnelRead: "personnel.read",
  personnelCreate: "personnel.create",
  personnelUpdate: "personnel.update",
  personnelArchive: "personnel.archive",
  attendanceRead: "attendance.read",
  leaveRead: "leave.read",
  housingRead: "housing.read",
  inventoryRead: "inventory.read",
  maintenanceRead: "maintenance.read",
  mealsRead: "meals.read",
  documentsRead: "documents.read",
  reportsRead: "reports.read",
} as const;

export type NavItem = {
  key: keyof Dictionary["nav"];
  to: string;
  icon: LucideIcon;
  /** any of these grants visibility; empty = everyone signed in */
  anyOf: string[];
  upcoming?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", to: "/dashboard", icon: LayoutDashboard, anyOf: [] },
  { key: "personnel", to: "/personnel", icon: Users, anyOf: [P.personnelRead] },
  { key: "attendance", to: "/attendance", icon: CalendarCheck, anyOf: [P.attendanceRead], upcoming: true },
  { key: "leave", to: "/leave", icon: CalendarOff, anyOf: [P.leaveRead], upcoming: true },
  { key: "housing", to: "/housing", icon: BedDouble, anyOf: [P.housingRead], upcoming: true },
  { key: "inventory", to: "/inventory", icon: Boxes, anyOf: [P.inventoryRead], upcoming: true },
  { key: "maintenance", to: "/maintenance", icon: Wrench, anyOf: [P.maintenanceRead], upcoming: true },
  { key: "meals", to: "/meals", icon: UtensilsCrossed, anyOf: [P.mealsRead], upcoming: true },
  { key: "documents", to: "/documents", icon: FileText, anyOf: [P.documentsRead], upcoming: true },
  { key: "reports", to: "/reports", icon: BarChart3, anyOf: [P.reportsRead], upcoming: true },
  { key: "admin", to: "/admin/users", icon: Settings2, anyOf: [P.usersRead, P.rolesRead, P.unitsManage, P.auditRead] },
];

export const RANKS = [
  "جندي", "جندي أول", "عريف", "رقيب", "رقيب أول", "وكيل", "وكيل أول", "مساعد",
  "ملازم", "ملازم أول", "نقيب", "رائد", "مقدم", "عقيد", "عميد", "مدني",
];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];