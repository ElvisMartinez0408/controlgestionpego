const KEY = 'gyc_company_info_v1';

export interface CompanyInfo {
  name: string;
  rif: string;
  address: string;
  phones: string;
}

const EMPTY: CompanyInfo = { name: '', rif: '', address: '', phones: '' };

export function getCompanyInfo(): CompanyInfo {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

export function saveCompanyInfo(data: CompanyInfo) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('company-info-updated'));
}
