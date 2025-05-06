export function moveElement<T>(
  orig: T[],
  pos: number,
  shift: number,
  inPlace: boolean,
): T[] {
  let target;
  if (inPlace) {
    target = orig;
  } else {
    target = [...orig];
  }
  const el = target.splice(pos, 1)[0];
  const newPos = pos + shift;
  target.splice(newPos, 0, el);

  return target;
}

/**
 * Retrieve elements only present in arr1
 * Optionally provide a function to extract the value (V) to compare
 */
export function diff<T,V>(arr1: T[], arr2: T[], idFn?: (T) => V): T[] {
  if (idFn == null) {
    return arr1.filter((value) => !arr2.includes(value));
  } else {
    const arr2Ids = arr2.map((value) => idFn(value));
    return arr1.filter((value) => !arr2Ids.includes(idFn(value)));
  }
}