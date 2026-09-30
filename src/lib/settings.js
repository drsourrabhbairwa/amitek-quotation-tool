import { uid } from './ids';
import { DIVISIONS, COMPANY_COMMON } from './constants';

/* ============================================================
   PER-DIVISION SETTINGS
   Everything here is meant to be edited from the Settings screen,
   without touching code. It's seeded once from the constants the
   division was built with, then lives independently in storage.
   A quotation "snapshots" the bits it needs (letterhead, bank,
   signatory, terms, numbering) at creation/save time, so editing
   Settings later never silently rewrites an already-issued
   quotation — see lib/model.js `blankQuotation`.
   ============================================================ */

export function defaultSettings(divKey) {
  const d = DIVISIONS[divKey];
  const nonBankTerms = (d.defaultTerms || []).filter(t => t.title !== 'Bank Details');
  return {
    letterhead: {
      logoDataUrl: null, // null = use the built-in AMITEK wordmark
      divisionLabel: d.label,
      legalName: COMPANY_COMMON.legalName,
      gstin: COMPANY_COMMON.gstin,
      address: COMPANY_COMMON.address,
      website: d.website,
      contact: d.contact,
      email: '',
    },
    // A second, alternate letterhead identity: the parent company brand
    // ("Amitek Paint and Coating" / APP Paints Chemicals Pvt. LTD.)
    // instead of this division's own name. A quotation picks which
    // identity to print under (see model.js `letterheadIdentity`); this
    // is what it snapshots when "Company" is chosen instead of
    // "Division". Kept per-division (like everything else in Settings)
    // so it can be edited from either division's Settings screen.
    companyIdentity: {
      logoDataUrl: null,
      divisionLabel: 'Amitek Paint and Coating',
      legalName: COMPANY_COMMON.legalName,
      gstin: COMPANY_COMMON.gstin,
      address: COMPANY_COMMON.address,
      website: 'www.amitekseamlessfloorings.com | www.amitekinfra.com',
      contact: '+91 93528 50707, +91 88540 66666, +91 92515 54682',
      email: '',
    },
    bank: {
      bankName: 'UNION BANK',
      accountHolder: 'APP PAINTS CHEMICALS PRIVATE LIMITED',
      accountNo: '510605010060598',
      ifsc: 'UBIN0551066',
      branch: 'SSI Finance, Jaipur',
      accountType: 'Current Account',
      showOnQuotation: true,
    },
    signatories: [{ id: uid('sig'), name: d.defaultSignatory.name, role: d.defaultSignatory.role }],
    defaultSignatoryId: null, // null = use signatories[0]
    signatureImageDataUrl: null,
    termsTemplates: [{
      id: uid('tt'),
      name: 'Standard',
      boxes: nonBankTerms.map(t => ({ id: uid('box'), title: t.title, content: t.content })),
    }],
    defaultTermsTemplateId: null, // null = use termsTemplates[0]
    tax: {
      defaultGstPercent: 18,
      defaultDiscount: { type: 'percent', value: 0 },
      extraChargePresets: [
        { id: uid('ec'), label: 'Transportation', amount: 0 },
        { id: uid('ec'), label: 'Labour', amount: 0 },
      ],
    },
    numberingPrefix: `AMK/QTN/${d.short}`,
    piNumberingPrefix: `AMK/PI/${d.short}`,
    colorColumnEnabled: d.hasColorColumn,
  };
}

export function getDefaultSignatory(settings) {
  const list = settings.signatories || [];
  if (!list.length) return { name: '', role: '' };
  const found = list.find(s => s.id === settings.defaultSignatoryId);
  return found || list[0];
}

export function getDefaultTermsTemplate(settings) {
  const list = settings.termsTemplates || [];
  if (!list.length) return { id: null, name: 'Standard', boxes: [] };
  const found = list.find(t => t.id === settings.defaultTermsTemplateId);
  return found || list[0];
}

/**
 * Fills in any settings fields missing from an older saved object
 * (e.g. a division saved before Settings existed at all, or before a
 * particular sub-section such as `tax` was added). Never overwrites
 * a value the user already has.
 */
export function reconcileSettings(saved, divKey) {
  const d = defaultSettings(divKey);
  if (!saved || typeof saved !== 'object') return d;
  return {
    letterhead: { ...d.letterhead, ...(saved.letterhead || {}) },
    companyIdentity: { ...d.companyIdentity, ...(saved.companyIdentity || {}) },
    bank: { ...d.bank, ...(saved.bank || {}) },
    signatories: Array.isArray(saved.signatories) && saved.signatories.length ? saved.signatories : d.signatories,
    defaultSignatoryId: saved.defaultSignatoryId ?? d.defaultSignatoryId,
    signatureImageDataUrl: saved.signatureImageDataUrl ?? d.signatureImageDataUrl,
    termsTemplates: Array.isArray(saved.termsTemplates) && saved.termsTemplates.length ? saved.termsTemplates : d.termsTemplates,
    defaultTermsTemplateId: saved.defaultTermsTemplateId ?? d.defaultTermsTemplateId,
    tax: { ...d.tax, ...(saved.tax || {}), defaultDiscount: { ...d.tax.defaultDiscount, ...((saved.tax || {}).defaultDiscount || {}) } },
    numberingPrefix: saved.numberingPrefix ?? d.numberingPrefix,
    piNumberingPrefix: saved.piNumberingPrefix ?? d.piNumberingPrefix,
    colorColumnEnabled: saved.colorColumnEnabled ?? d.colorColumnEnabled,
  };
}
