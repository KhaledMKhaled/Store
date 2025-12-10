import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ar";

const translations = {
  ar: {
    common: {
      loading: "جاري التحميل...",
      save: "حفظ",
      cancel: "إلغاء",
      delete: "حذف",
      edit: "تعديل",
      create: "إنشاء",
      back: "رجوع",
      next: "التالي",
      previous: "السابق",
      search: "بحث",
      filter: "تصفية",
      all: "الكل",
      actions: "إجراءات",
      view: "عرض",
      add: "إضافة",
      remove: "إزالة",
      confirm: "تأكيد",
      close: "إغلاق",
      yes: "نعم",
      no: "لا",
      required: "مطلوب",
      optional: "اختياري",
      noData: "لا توجد بيانات",
      error: "خطأ",
      success: "نجاح",
      name: "الاسم",
      description: "الوصف",
      status: "الحالة",
      date: "التاريخ",
      price: "السعر",
      total: "الإجمالي",
      quantity: "الكمية",
      items: "العناصر",
    },
    auth: {
      signIn: "تسجيل الدخول",
      signOut: "تسجيل الخروج",
      signInWithReplit: "تسجيل الدخول باستخدام Replit",
      unauthorized: "غير مصرح",
    },
    nav: {
      dashboard: "لوحة التحكم",
      shipments: "الشحنات",
      suppliers: "الموردين",
      itemTypes: "أنواع العناصر",
      users: "المستخدمين",
    },
    dashboard: {
      title: "لوحة التحكم",
      welcome: "مرحباً",
      totalShipments: "إجمالي الشحنات",
      totalContainers: "إجمالي الحاويات",
      totalPieces: "إجمالي القطع",
      totalValue: "إجمالي القيمة",
      recentShipments: "الشحنات الأخيرة",
      shipmentsByStatus: "الشحنات حسب الحالة",
    },
    shipments: {
      title: "الشحنات",
      newShipment: "شحنة جديدة",
      editShipment: "تعديل الشحنة",
      shipmentDetails: "تفاصيل الشحنة",
      shipmentName: "اسم الشحنة",
      shipmentNumber: "رقم الشحنة",
      masterKey: "المفتاح الرئيسي",
      backendMasterKey: "مفتاح الخلفية الرئيسي",
      status: "الحالة",
      createdAt: "تاريخ الإنشاء",
      updatedAt: "تاريخ التحديث",
      createdBy: "أنشئ بواسطة",
      updatedBy: "حُدث بواسطة",
      deleteConfirm: "هل أنت متأكد من حذف هذه الشحنة؟",
      noShipments: "لا توجد شحنات",
      addFirstShipment: "أضف أول شحنة",
      viewShipment: "عرض الشحنة",
      shipmentItems: "عناصر الشحنة",
      importingDetails: "تفاصيل الاستيراد",
      customs: "الجمارك",
      workflow: {
        shipment: "الشحنة",
        items: "العناصر",
        importing: "الاستيراد",
        customsStep: "الجمارك",
      },
      statuses: {
        CREATED: "تم الإنشاء",
        IMPORTING_DETAILS_DONE: "اكتمل الاستيراد",
        CUSTOMS_IN_PROGRESS: "الجمارك قيد التنفيذ",
        CUSTOMS_RECEIVED: "تم استلام الجمارك",
      },
      actions: {
        markImportDetailsDone: "تحديد اكتمال تفاصيل الاستيراد",
        startCustomsProcessing: "بدء معالجة الجمارك",
        markCustomsReceived: "تحديد استلام الجمارك",
      },
    },
    items: {
      title: "عناصر الشحنة",
      addItem: "إضافة عنصر",
      editItem: "تعديل العنصر",
      deleteItem: "حذف العنصر",
      deleteConfirm: "هل أنت متأكد من حذف هذا العنصر؟",
      noItems: "لا توجد عناصر بعد. انقر على \"إضافة عنصر\" للبدء.",
      supplier: "المورد",
      itemType: "نوع العنصر",
      ctn: "عدد الكراتين",
      pcsPerCtn: "قطعة/كرتون",
      cou: "العدد",
      pri: "السعر",
      total: "الإجمالي",
      totalCtn: "إجمالي الكراتين",
      totalPcs: "إجمالي القطع",
      totalPrice: "إجمالي السعر",
      saveItems: "حفظ العناصر",
      saveAndContinue: "حفظ والمتابعة",
      itemsSaved: "تم حفظ العناصر بنجاح",
    },
    importing: {
      title: "تفاصيل الاستيراد",
      commissionPercent: "نسبة العمولة",
      commissionAmount: "مبلغ العمولة",
      shipmentCost: "تكلفة الشحن",
      shipmentSpaceM2: "مساحة الشحن (م²)",
      totalShipmentPrice: "إجمالي سعر الشحنة",
      saveDetails: "حفظ التفاصيل",
      saveAndContinue: "حفظ والمتابعة",
      detailsSaved: "تم حفظ التفاصيل بنجاح",
      configured: "تم الإعداد",
      notConfigured: "لم يتم الإعداد",
    },
    customs: {
      title: "الجمارك",
      billDate: "تاريخ الفاتورة",
      totalPiecesRecorded: "إجمالي القطع المسجلة",
      totalPiecesAdjusted: "إجمالي القطع المعدلة",
      lossOrDamagePieces: "القطع المفقودة أو التالفة",
      customsPerType: "الجمارك حسب النوع",
      paidCustoms: "الجمارك المدفوعة",
      takhreg: "تخريج",
      totalPcsPerType: "إجمالي القطع/النوع",
      totalCtnPerType: "إجمالي الكراتين/النوع",
      available: "متاح",
      inProgress: "قيد التنفيذ",
      notStarted: "لم يبدأ",
      notAvailableYet: "غير متاح بعد",
      viewCustoms: "عرض الجمارك",
      saveCustoms: "حفظ الجمارك",
      customsSaved: "تم حفظ الجمارك بنجاح",
    },
    suppliers: {
      title: "الموردين",
      newSupplier: "مورد جديد",
      editSupplier: "تعديل المورد",
      supplierName: "اسم المورد",
      contactInfo: "معلومات الاتصال",
      defaultCountry: "البلد الافتراضي",
      deleteConfirm: "هل أنت متأكد من حذف هذا المورد؟",
      noSuppliers: "لا يوجد موردين",
      addFirstSupplier: "أضف أول مورد",
      supplierCreated: "تم إنشاء المورد بنجاح",
      supplierUpdated: "تم تحديث المورد بنجاح",
      supplierDeleted: "تم حذف المورد بنجاح",
    },
    itemTypes: {
      title: "أنواع العناصر",
      newItemType: "نوع عنصر جديد",
      editItemType: "تعديل نوع العنصر",
      itemTypeName: "اسم نوع العنصر",
      deleteConfirm: "هل أنت متأكد من حذف نوع العنصر هذا؟",
      noItemTypes: "لا توجد أنواع عناصر",
      addFirstItemType: "أضف أول نوع عنصر",
      itemTypeCreated: "تم إنشاء نوع العنصر بنجاح",
      itemTypeUpdated: "تم تحديث نوع العنصر بنجاح",
      itemTypeDeleted: "تم حذف نوع العنصر بنجاح",
    },
    users: {
      title: "المستخدمين",
      role: "الدور",
      email: "البريد الإلكتروني",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      changeRole: "تغيير الدور",
      roles: {
        ADMIN: "مسؤول",
        OPERATOR: "مشغل",
        VIEWER: "مشاهد",
      },
      roleUpdated: "تم تحديث الدور بنجاح",
    },
    landing: {
      title: "نظام إدارة الشحنات",
      subtitle: "تتبع وإدارة شحناتك بكفاءة",
      getStarted: "ابدأ الآن",
      features: {
        title: "الميزات",
        shipmentTracking: "تتبع الشحنات",
        shipmentTrackingDesc: "تتبع شحناتك من الإنشاء إلى التسليم",
        customsManagement: "إدارة الجمارك",
        customsManagementDesc: "إدارة تفاصيل الجمارك والمستندات",
        supplierManagement: "إدارة الموردين",
        supplierManagementDesc: "إدارة الموردين ومعلومات الاتصال",
      },
    },
    errors: {
      notFound: "الصفحة غير موجودة",
      serverError: "خطأ في الخادم",
      unauthorized: "غير مصرح بالوصول",
      forbidden: "الوصول محظور",
      networkError: "خطأ في الشبكة",
      validationError: "خطأ في التحقق",
      unknownError: "خطأ غير معروف",
    },
    validation: {
      required: "هذا الحقل مطلوب",
      minLength: "يجب أن يكون على الأقل {min} أحرف",
      maxLength: "يجب أن لا يتجاوز {max} أحرف",
      invalidEmail: "البريد الإلكتروني غير صالح",
      invalidNumber: "الرقم غير صالح",
      mustBePositive: "يجب أن يكون رقماً موجباً",
      mustBePercentage: "يجب أن يكون بين 0 و 100",
    },
  },
} as const;

type Translations = typeof translations.ar;

interface I18nContextType {
  t: Translations;
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language] = useState<Language>("ar");

  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);

  const value: I18nContextType = {
    t: translations.ar,
    language,
    setLanguage: () => {},
    dir: "rtl",
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, dir, language } = useI18n();
  return { t, dir, language };
}
