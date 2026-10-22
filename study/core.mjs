export const EMPTY = { version: 1, weeks: {} };
export const STATUSES = ['未开始', '进行中', '待复测', '通过'];
export const FIELDS = ['practice', 'algorithm', 'acceptance', 'status', 'hours', 'reviewDate', 'record'];
export const LABELS = { practice: '动手任务', algorithm: '算法练习', acceptance: '独立验收', status: '完成状态', hours: '实际小时', reviewDate: '复测日期', record: '学习记录' };
export const defaults = () => ({ practice: false, algorithm: false, acceptance: false, status: '未开始', hours: '', reviewDate: '', record: '' });
export function validate(value) {
  if (!value || value.version !== 1 || !value.weeks || Array.isArray(value.weeks) || typeof value.weeks !== 'object') throw new Error('学习进度文件格式不正确。');
  const weeks = {};
  for (const [id, row] of Object.entries(value.weeks).sort(([a],[b]) => a.localeCompare(b))) {
    if (!/^w(0[1-9]|[1-3]\d|4[0-4])$/.test(id) || !row || typeof row !== 'object') throw new Error('周次数据不正确。');
    const item = { ...defaults(), ...Object.fromEntries(FIELDS.filter(k => Object.hasOwn(row, k)).map(k => [k, row[k]])) };
    if (['practice', 'algorithm', 'acceptance'].some(k => typeof item[k] !== 'boolean') || !STATUSES.includes(item.status)) throw new Error('任务或状态不正确。');
    if (typeof item.record !== 'string' || item.record.length > 20000) throw new Error('单周记录限 2 万字以内。');
    if (typeof item.hours !== 'string' || (item.hours !== '' && (!/^\d+(\.\d{1,2})?$/.test(item.hours) || Number(item.hours) > 1000))) throw new Error('实际小时需在 0–1000 之间，最多两位小数。');
    if (typeof item.reviewDate !== 'string' || (item.reviewDate !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(item.reviewDate) || new Date(item.reviewDate).toISOString().slice(0,10) !== item.reviewDate))) throw new Error('复测日期不正确。');
    if (item.status === '通过' && (!item.practice || !item.algorithm || !item.acceptance || !item.record.trim())) throw new Error('通过前请完成三项任务，并填写验收证据。');
    if (FIELDS.some(k => item[k] !== defaults()[k])) weeks[id] = item;
  }
  return { version: 1, weeks };
}
export const rowFor = (doc, id) => ({ ...defaults(), ...doc.weeks[id] });
export function merge(base, local, remote) {
  [base, local, remote] = [base, local, remote].map(validate);
  const document = structuredClone(EMPTY), conflicts = [];
  for (const id of new Set([...Object.keys(base.weeks), ...Object.keys(local.weeks), ...Object.keys(remote.weeks)])) {
    const [b,l,r] = [base,local,remote].map(d => rowFor(d,id)), row = {};
    for (const field of FIELDS) {
      if (l[field] === r[field] || r[field] === b[field]) row[field] = l[field];
      else if (l[field] === b[field]) row[field] = r[field];
      else { row[field] = l[field]; conflicts.push({ id, field, local:l[field], remote:r[field] }); }
    }
    // Parallel edits may invalidate a previously passed week; retain work but require a new acceptance.
    if (row.status === '通过' && (!row.practice || !row.algorithm || !row.acceptance || !row.record.trim())) row.status = '待复测';
    document.weeks[id] = row;
  }
  return { document: validate(document), conflicts };
}
export const equal = (a,b) => JSON.stringify(validate(a)) === JSON.stringify(validate(b));
export function update(doc, id, field, value) {
  if (!FIELDS.includes(field) || !/^w(0[1-9]|[1-3]\d|4[0-4])$/.test(id)) throw new Error('任务字段不正确。');
  const next = structuredClone(doc), row = rowFor(next,id); row[field] = value;
  if (['practice','algorithm','acceptance'].includes(field)) {
    if (!value && row.status === '通过') row.status = '待复测';
    else if (value && row.status === '未开始') row.status = '进行中';
  }
  if (field === 'record' && !value.trim() && row.status === '通过') row.status = '待复测';
  next.weeks[id] = row; return validate(next);
}
export function statistics(plan,doc) {
  return plan.weeks.reduce((s,w) => {
    const r=rowFor(doc,w.id); s.passed+=Number(r.status==='通过'); s.review+=Number(r.status==='待复测');
    s.tasks+=Number(r.practice)+Number(r.algorithm)+Number(r.acceptance); s.hours+=Number(r.hours || 0); s.planned+=w.plannedHours;
    return s;
  },{passed:0,review:0,tasks:0,hours:0,planned:0});
}
