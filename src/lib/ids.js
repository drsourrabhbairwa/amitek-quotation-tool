/* ============================================================
   ID GENERATION & DATE HELPERS
   ============================================================ */

let _idc = 1;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${_idc++}`;

export const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};
