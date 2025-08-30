// Import translation files
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

export type LanguageCode = 'en' | 'ar';

export interface TranslationKeys {
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    settings: string;
    logout: string;
    login: string;
    register: string;
    email: string;
    password: string;
    name: string;
    phone: string;
    address: string;
    date: string;
    time: string;
    status: string;
    actions: string;
    yes: string;
    no: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
    close: string;
    open: string;
  };
  navigation: {
    dashboard: string;
    customers: string;
    invoices: string;
    products: string;
    reports: string;
    profile: string;
  };
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    forgotPassword: string;
    resetPassword: string;
    emailRequired: string;
    passwordRequired: string;
    invalidCredentials: string;
    accountCreated: string;
    passwordReset: string;
  };
  dashboard: {
    welcome: string;
    totalCustomers: string;
    totalInvoices: string;
    totalRevenue: string;
    recentActivity: string;
    title: string;
    subtitle: string;
    goodMorning: string;
    goodAfternoon: string;
    goodEvening: string;
    welcomeBack: string;
    revenue: string;
    clients: string;
    layouts: string;
    quickActions: string;
    createNewInvoice: string;
    designNewLayout: string;
    addNewClient: string;
    loading: string;
    layoutCreated: string;
    itemCreated: string;
    invoiceCreated: string;
    customerCreated: string;
    created: string;
    updated: string;
  };
  customers: {
    title: string;
    addCustomer: string;
    editCustomer: string;
    deleteCustomer: string;
    customerDetails: string;
    noCustomers: string;
  };
  invoices: {
    title: string;
    addInvoice: string;
    editInvoice: string;
    deleteInvoice: string;
    invoiceDetails: string;
    invoiceNumber: string;
    dueDate: string;
    amount: string;
    paid: string;
    unpaid: string;
    overdue: string;
    noInvoices: string;
    createNewInvoice: string;
    editInvoiceTitle: string;
    createInvoiceTitle: string;
    editInvoiceSubtitle: string;
    createInvoiceSubtitle: string;
    pending: string;
    working: string;
    done: string;
    refused: string;
    customerInformation: string;
    required: string;
    customerName: string;
    customerNamePlaceholder: string;
    phoneNumber: string;
    phonePlaceholder: string;
    address: string;
    addressPlaceholder: string;
    selectedFromExisting: string;
    willCreateNew: string;
    willCreateNewConfirmed: string;
    clickToSelect: string;
    invoiceItems: string;
    item: string;
    items: string;
    itemColumn: string;
    quantityColumn: string;
    priceColumn: string;
    totalColumn: string;
    actionColumn: string;
    noItemsAdded: string;
    noItemsDescription: string;
    addItem: string;
    chooseFromCatalog: string;
    removeItem: string;
    subtotal: string;
    noInvoiceLayouts: string;
    noLayoutsDescription: string;
    createFirstLayout: string;
    chooseLayout: string;
    noLayout: string;
    default: string;
    saveInvoice: string;
    updateInvoice: string;
    cancel: string;
    chooseFromCatalogTitle: string;
    chooseFromCatalogDescription: string;
    searchItems: string;
    allCategories: string;
    noItemsInCatalog: string;
    noItemsInCatalogDescription: string;
    noItemsFound: string;
    noItemsFoundDescription: string;
    similarCustomersTitle: string;
    similarCustomersDescription: string;
    youAreTryingToCreate: string;
    createNewCustomerAnyway: string;
    invoiceSaved: string;
    invoiceUpdated: string;
    failedToLoadInvoice: string;
    customerAlreadyExists: string;
    enterCustomerName: string;
    addAtLeastOneItem: string;
    ensureValidItems: string;
    phoneValidation: string;
    itemNamePlaceholder: string;
    addToInvoice: string;
    invoiceHistory: string;
    viewAndManageInvoices: string;
    exportAll: string;
    totalInvoices: string;
    totalRevenue: string;
    searchByCustomerName: string;
    selectDateRange: string;
    from: string;
    to: string;
    clear: string;
    apply: string;
    allStatus: string;
    invoiceId: string;
    client: string;
    date: string;
    actions: string;
    loadingInvoices: string;
    errorLoadingInvoices: string;
    tryAgain: string;
    noInvoicesFound: string;
    tryAdjustingSearch: string;
    noInvoicesYet: string;
    noInvoicesYetDescription: string;
    createYourFirstInvoice: string;
    changeStatus: string;
    deleteInvoiceTitle: string;
    deleteInvoiceConfirm: string;
    invoiceDetailsLabel: string;
    customerLabel: string;
    statusLabel: string;
    createdLabel: string;
    cannotBeUndone: string;
    changeInvoiceStatus: string;
    selectNewStatus: string;
    whatsappWillBeSent: string;
    savingStatus: string;
    extraNoteOptional: string;
    willBeAddedToWhatsapp: string;
    addExtraMessage: string;
    addExtraNote: string;
    whatsappMessagePreview: string;
    sendWhatsappMessage: string;
    recommended: string;
    automaticallyNotify: string;
    updating: string;
    updateStatus: string;
  };
  layouts: {
    title: string;
    subtitle: string;
    createNew: string;
    edit: string;
    delete: string;
    duplicate: string;
    setDefault: string;
    removeDefault: string;
    default: string;
    loading: string;
    error: string;
    retry: string;
    noLayouts: string;
    noLayoutsDescription: string;
    createFirst: string;
    totalLayouts: string;
    totalSections: string;
    totalFields: string;
    totalOptions: string;
    sections: string;
    fields: string;
    options: string;
    status: string;
    createModalTitle: string;
    layoutName: string;
    layoutNamePlaceholder: string;
    create: string;
    editModalTitle: string;
    saveChanges: string;
    deleteModalTitle: string;
    deleteConfirm: string;
    layoutDetails: string;
    sectionsCount: string;
    fieldsCount: string;
    cannotBeUndone: string;
    inUseModalTitle: string;
    inUseDescription: string;
    reassignTo: string;
    selectLayout: string;
    reassignAndDelete: string;
    forceDelete: string;
    noOtherLayouts: string;
    forceDeleteWarning: string;
    proTip: string;
    organizeFields: string;
    createTemplates: string;
    saveTime: string;
    designerTitle: string;
    addSection: string;
    addAnotherSection: string;
    saveLayout: string;
    startBuilding: string;
    startBuildingDescription: string;
    newSection: string;
    editSection: string;
    deleteSection: string;
    sectionTitle: string;
    sectionTitlePlaceholder: string;
    addField: string;
    fieldLabel: string;
    fieldType: string;
    fieldPlaceholder: string;
    required: string;
    optional: string;
    text: string;
    number: string;
    email: string;
    phone: string;
    date: string;
    textarea: string;
    dropdown: string;
    checkboxes: string;
    addOption: string;
    optionLabel: string;
    optionValue: string;
    removeOption: string;
    copySection: string;
    copyField: string;
    editField: string;
    deleteField: string;
    deleteSectionConfirm: string;
    deleteFieldConfirm: string;
    fieldPlaceholderText: string;
    copyToLayout: string;
    copyToSection: string;
    selectTargetLayout: string;
    selectTargetSection: string;
    copy: string;
    sectionCopied: string;
    fieldCopied: string;
    copyFailed: string;
    failedToAddSection: string;
    failedToAddField: string;
    failedToUpdateField: string;
    failedToDeleteSection: string;
    failedToDeleteField: string;
    failedToCreateLayout: string;
    failedToRenameLayout: string;
    failedToSetDefault: string;
    failedToRemoveDefault: string;
    failedToDuplicate: string;
    failedToSave: string;
    layoutNotFound: string;
    layoutNotFoundDescription: string;
    backToLayouts: string;
    fieldsThatWillBeDeleted: string;
    deleteSectionWarning: string;
    textInput: string;
    chooseLayoutToCopySection: string;
    chooseSectionToCopyField: string;
    targetLayout: string;
    targetSection: string;
    selectSection: string;
    clientInformation: string;
    projectDetails: string;
    paymentTerms: string;
    noFieldsInSection: string;
    fieldCount: string;
    fieldTypeInput: string;
    fieldTypeDescription: string;
    fieldTypeDropdown: string;
    fieldTypeCheckboxes: string;
    fieldDetails: string;
    fieldTypeLabel: string;
    fieldPlaceholderLabel: string;
    actionCannotBeUndone: string;
  };
}

// Translation catalog
const translations: Record<LanguageCode, TranslationKeys> = {
  en: enTranslations,
  ar: arTranslations
};

// Simple i18n implementation
class SimpleI18n {
  private currentLocale: LanguageCode = 'en';

  setLocale(locale: LanguageCode) {
    this.currentLocale = locale;
  }

  getLocale(): LanguageCode {
    return this.currentLocale;
  }

  t(key: string, params?: Record<string, any>): string {
    try {
      const keys = key.split('.');
      let value: any = translations[this.currentLocale];
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Fallback to English if key not found
          value = translations.en;
          for (const fallbackKey of keys) {
            if (value && typeof value === 'object' && fallbackKey in value) {
              value = value[fallbackKey];
            } else {
              console.warn(`Translation missing for key: ${key}`);
              return key;
            }
          }
          break;
        }
      }

      if (typeof value === 'string') {
        // Simple parameter replacement
        if (params) {
          return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
            return params[paramKey] || match;
          });
        }
        return value;
      }

      console.warn(`Translation key "${key}" does not resolve to a string`);
      return key;
    } catch (error) {
      console.error(`Error translating key "${key}":`, error);
      return key;
    }
  }
}

// Create and export i18n instance
const i18n = new SimpleI18n();

export default i18n;

// Available languages
export const LANGUAGES = [
  { code: 'en' as const, name: 'English', nativeName: 'English' },
  { code: 'ar' as const, name: 'Arabic', nativeName: 'العربية' }
] as const;
