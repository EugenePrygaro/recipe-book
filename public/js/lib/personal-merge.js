const MISSING = Symbol("missing");
const SET_PATHS = new Set(["fav", "pantry", "shop.checked", "celebration.current.checked"]);
const KEYED_ARRAYS = new Set(["shop.extra", "celebration.current.recipes", "celebration.current.custom", "celebration.archive"]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = (value) => value === MISSING ? MISSING : value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function equal(a, b) {
  if (a === b) return true;
  if (a === MISSING || b === MISSING || a === undefined || b === undefined || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => equal(value, b[i]));
  }
  if (!isObject(a) || !isObject(b)) return false;
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  return equal(keysA, keysB) && keysA.every((key) => equal(a[key], b[key]));
}

function mergeSet(base, local, remote) {
  const before = new Set(base === MISSING ? [] : base);
  const mine = new Set(local === MISSING ? [] : local);
  const theirs = new Set(remote === MISSING ? [] : remote);
  const values = new Set([...before, ...mine, ...theirs]);
  return [...values].filter((value) => {
    const wasPresent = before.has(value);
    const mineHas = mine.has(value);
    const theirsHas = theirs.has(value);
    const mineChanged = mineHas !== wasPresent;
    const theirsChanged = theirsHas !== wasPresent;
    if (mineChanged && theirsChanged) return mineHas === theirsHas && mineHas;
    if (mineChanged) return mineHas;
    if (theirsChanged) return theirsHas;
    return wasPresent;
  });
}

function mergeKeyedArray(base, local, remote, path) {
  const toMap = (list) => new Map((list === MISSING ? [] : list).filter((item) => item && typeof item.id === "string").map((item) => [item.id, item]));
  const before = toMap(base);
  const mine = toMap(local);
  const theirs = toMap(remote);
  const result = [];
  for (const id of new Set([...before.keys(), ...mine.keys(), ...theirs.keys()])) {
    const item = mergeValue(before.has(id) ? before.get(id) : MISSING, mine.has(id) ? mine.get(id) : MISSING, theirs.has(id) ? theirs.get(id) : MISSING, `${path}[]`);
    if (item !== MISSING && item !== undefined) result.push(item);
  }
  return result;
}

function mergeValue(base, local, remote, path = "") {
  if (equal(local, base)) return clone(remote);
  if (equal(remote, base) || equal(local, remote)) return clone(local);

  if (Array.isArray(local) || Array.isArray(remote) || Array.isArray(base)) {
    if (SET_PATHS.has(path)) return mergeSet(base, local, remote);
    if (KEYED_ARRAYS.has(path)) return mergeKeyedArray(base, local, remote, path);
    return clone(local);
  }
  if (isObject(local) || isObject(remote) || isObject(base)) {
    if (local === MISSING || local === null || !isObject(local)) return clone(local);
    if (remote === MISSING || remote === null || !isObject(remote)) return clone(local);
    const before = isObject(base) ? base : {};
    const merged = {};
    for (const key of new Set([...Object.keys(before), ...Object.keys(local), ...Object.keys(remote)])) {
      const value = mergeValue(
        Object.hasOwn(before, key) ? before[key] : MISSING,
        Object.hasOwn(local, key) ? local[key] : MISSING,
        Object.hasOwn(remote, key) ? remote[key] : MISSING,
        path ? `${path}.${key}` : key,
      );
      if (value !== MISSING && value !== undefined) merged[key] = value;
    }
    return merged;
  }
  return clone(local);
}

/** Three-way merge: concurrent edits to distinct fields survive; conflicting edits favor local changes. */
export function mergePersonal(base, local, remote) {
  return mergeValue(base, local, remote);
}
