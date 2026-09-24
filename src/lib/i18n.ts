import { createContext, useContext } from "react";

export type Locale = "ar" | "en" | "fr";
export const LOCALES: { code: Locale; label: string; dir: "rtl" | "ltr" }[] = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "en", label: "English", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
];

/**
 * Arabic is the source of truth. English/French dictionaries may be partial;
 * missing keys fall back to Arabic so the UI never shows raw keys.
 */
const ar = {
  appName: "نظام إدارة الثكنة",
  appShort: "BMS",
  scopeNote: "نظام إداري ولوجستي — لا يتضمن أي بيانات عملياتية",
  nav: {
    dashboard: "لوحة القيادة",
    personnel: "الأفراد",
    attendance: "الحضور",
    leave: "الإجازات والرخص",
    housing: "الإقامة",
    inventory: "المخزون",
    maintenance: "الصيانة",
    meals: "الإعاشة",
    documents: "الوثائق",
    reports: "التقارير",
    admin: "الإدارة",
  },
  admin: {
    users: "المستخدمون",
    roles: "الأدوار والصلاحيات",
    units: "الوحدات",
    audit: "سجل التدقيق",
  },
  common: {
    loading: "جارٍ التحميل…",
    error: "حدث خطأ أثناء تحميل البيانات",
    retry: "إعادة المحاولة",
    empty: "لا توجد بيانات",
    save: "حفظ",
    cancel: "إلغاء",
    confirm: "تأكيد",
    add: "إضافة",
    edit: "تعديل",
    search: "بحث…",
    actions: "إجراءات",
    yes: "نعم",
    no: "لا",
    active: "نشط",
    inactive: "غير نشط",
    demo: "تجريبي",
    upcoming: "قريباً",
    upcomingTitle: "هذه الوحدة قيد الإعداد",
    upcomingBody:
      "تم تجهيز قاعدة البيانات وقواعد الصلاحيات لهذه الوحدة، وستُفعَّل شاشاتها في المرحلة القادمة.",
    forbidden: "ليست لديك صلاحية للوصول إلى هذه الصفحة",
    signOut: "تسجيل الخروج",
    required: "هذا الحقل مطلوب",
    saved: "تم الحفظ بنجاح",
    notes: "ملاحظات",
    status: "الحالة",
    name: "الاسم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    createdAt: "تاريخ الإنشاء",
    all: "الكل",
    back: "رجوع",
    close: "إغلاق",
    language: "اللغة",
  },
  auth: {
    signIn: "تسجيل الدخول",
    signInTitle: "الدخول إلى النظام",
    signInSub: "أدخل بيانات الحساب المعتمدة من إدارة النظام",
    bootstrapTitle: "إعداد أول مسؤول للنظام",
    bootstrapSub: "لم يتم إعداد النظام بعد. أول حساب يُنشأ سيحصل تلقائياً على دور مدير النظام الأعلى.",
    createAccount: "إنشاء حساب المسؤول",
    fullName: "الاسم الكامل",
    invalid: "بيانات الدخول غير صحيحة",
    pendingTitle: "الحساب بانتظار التفعيل",
    pendingBody: "تم إنشاء حسابك لكن لم يُسند إليه أي دور بعد. يرجى التواصل مع مدير النظام.",
    welcome: "مرحباً",
  },
  personnel: {
    title: "الأفراد",
    subtitle: "السجل الإداري للأفراد المنتسبين إلى الثكنة",
    add: "إضافة فرد",
    number: "الرقم العسكري",
    firstName: "الاسم",
    lastName: "اللقب",
    fatherName: "اسم الأب",
    rank: "الرتبة",
    unit: "الوحدة",
    dob: "تاريخ الميلاد",
    enlistment: "تاريخ الالتحاق",
    phone: "الهاتف",
    bloodType: "فصيلة الدم",
    address: "العنوان",
    archive: "أرشفة",
    archiveConfirm: "سيتم أرشفة ملف الفرد ولن يظهر في القوائم النشطة. لا يمكن حذف الملفات نهائياً.",
    restore: "إلغاء الأرشفة",
    detail: "ملف الفرد",
    noUnit: "بدون وحدة",
    numberExists: "الرقم العسكري مستخدم مسبقاً",
    showArchived: "إظهار المؤرشفين",
    history: "السجل",
    housing: "الإقامة الحالية",
    leaves: "طلبات الإجازة",
    attendance: "آخر سجلات الحضور",
    noHousing: "لا يوجد تخصيص غرفة نشط",
    status: {
      ACTIVE: "في الخدمة",
      ON_LEAVE: "في إجازة",
      TRANSFERRED: "منقول",
      RETIRED: "متقاعد",
      ARCHIVED: "مؤرشف",
    } as Record<string, string>,
  },
  units: {
    title: "الوحدات",
    subtitle: "الهيكل التنظيمي الإداري للثكنة",
    add: "إضافة وحدة",
    code: "الرمز",
    nameAr: "الاسم (عربي)",
    nameEn: "الاسم (إنجليزي)",
    nameFr: "الاسم (فرنسي)",
    type: "النوع",
    parent: "الوحدة الأم",
    location: "الموقع",
    commander: "القائد الإداري",
    personnelCount: "عدد الأفراد",
    types: {
      HQ: "قيادة",
      BATTALION: "كتيبة",
      COMPANY: "سرية",
      PLATOON: "فصيلة",
      SECTION: "قسم",
      SERVICE: "خدمات",
    } as Record<string, string>,
  },
  users: {
    title: "المستخدمون",
    subtitle: "حسابات الدخول وأدوارها",
    add: "إضافة مستخدم",
    roles: "الأدوار",
    noRoles: "بدون دور",
    deactivate: "تعطيل",
    activate: "تفعيل",
    deactivateConfirm: "سيفقد المستخدم كل صلاحياته فوراً ولن يتمكن من استخدام النظام.",
    you: "أنت",
  },
  roles: {
    title: "الأدوار والصلاحيات",
    subtitle: "مصفوفة الصلاحيات لكل دور — التعديلات تُطبّق فوراً على قواعد الوصول",
    permission: "الصلاحية",
    module: "الوحدة",
    systemRole: "دور نظامي",
  },
  audit: {
    title: "سجل التدقيق",
    subtitle: "سجل غير قابل للتعديل لأحداث الدخول والتغييرات المهمة",
    when: "الوقت",
    actor: "المنفّذ",
    action: "الحدث",
    entity: "الكيان",
    details: "التفاصيل",
    system: "النظام",
  },
  dashboard: {
    title: "لوحة القيادة",
    subtitle: "نظرة عامة إدارية",
    personnelTotal: "إجمالي الأفراد",
    personnelActive: "في الخدمة",
    onLeave: "في إجازة",
    units: "الوحدات النشطة",
    users: "المستخدمون النشطون",
    leavePending: "إجازات بانتظار القرار",
    maintenanceOpen: "طلبات صيانة مفتوحة",
    inventoryLow: "أصناف تحت الحد الأدنى",
    recentAudit: "آخر أحداث التدقيق",
    quick: "اختصارات",
  },
};

export type Dictionary = typeof ar;
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const en: DeepPartial<Dictionary> = {
  appName: "Barracks Management System",
  scopeNote: "Administrative & logistics system — no operational data",
  nav: {
    dashboard: "Dashboard", personnel: "Personnel", attendance: "Attendance", leave: "Leave & Passes",
    housing: "Housing", inventory: "Inventory", maintenance: "Maintenance", meals: "Mess",
    documents: "Documents", reports: "Reports", admin: "Administration",
  },
  admin: { users: "Users", roles: "Roles & Permissions", units: "Units", audit: "Audit Log" },
  common: {
    loading: "Loading…", error: "Failed to load data", retry: "Retry", empty: "No data", save: "Save",
    cancel: "Cancel", confirm: "Confirm", add: "Add", edit: "Edit", search: "Search…", actions: "Actions",
    active: "Active", inactive: "Inactive", demo: "DEMO", upcoming: "Upcoming",
    upcomingTitle: "This module is being prepared",
    upcomingBody: "Database tables and access rules for this module are ready; its screens ship in the next milestone.",
    forbidden: "You do not have permission to view this page", signOut: "Sign out", saved: "Saved",
    status: "Status", name: "Name", email: "Email", password: "Password", language: "Language", back: "Back",
  },
  auth: { signIn: "Sign in", signInTitle: "Sign in to the system", createAccount: "Create administrator account" },
  personnel: { title: "Personnel", add: "Add person", number: "Service number", rank: "Rank", unit: "Unit" },
  dashboard: { title: "Dashboard", subtitle: "Administrative overview" },
};

const fr: DeepPartial<Dictionary> = {
  appName: "Système de gestion de caserne",
  scopeNote: "Système administratif et logistique — aucune donnée opérationnelle",
  nav: {
    dashboard: "Tableau de bord", personnel: "Personnel", attendance: "Présences", leave: "Congés et permissions",
    housing: "Hébergement", inventory: "Inventaire", maintenance: "Maintenance", meals: "Ordinaire",
    documents: "Documents", reports: "Rapports", admin: "Administration",
  },
  admin: { users: "Utilisateurs", roles: "Rôles et permissions", units: "Unités", audit: "Journal d'audit" },
  common: {
    loading: "Chargement…", error: "Échec du chargement", retry: "Réessayer", empty: "Aucune donnée", save: "Enregistrer",
    cancel: "Annuler", confirm: "Confirmer", add: "Ajouter", edit: "Modifier", search: "Rechercher…",
    active: "Actif", inactive: "Inactif", demo: "DÉMO", upcoming: "Bientôt", signOut: "Se déconnecter",
    upcomingTitle: "Ce module est en préparation",
    forbidden: "Vous n'avez pas la permission de voir cette page", language: "Langue", back: "Retour",
  },
  auth: { signIn: "Se connecter", signInTitle: "Connexion au système" },
  dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble administrative" },
};

function deepMerge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = v && typeof v === "object" && b && typeof b === "object" ? deepMerge(b, v as never) : v;
  }
  return out as T;
}

export const dictionaries: Record<Locale, Dictionary> = {
  ar,
  en: deepMerge(ar, en),
  fr: deepMerge(ar, fr),
};

export const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: "ar",
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT(): Dictionary {
  const { locale } = useContext(LocaleContext);
  return dictionaries[locale];
}

export function localizedName(
  row: { name_ar: string; name_en?: string | null; name_fr?: string | null },
  locale: Locale,
) {
  if (locale === "en" && row.name_en) return row.name_en;
  if (locale === "fr" && row.name_fr) return row.name_fr;
  return row.name_ar;
}