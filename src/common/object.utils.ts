export const isObjectEmpty = (object: Record<string, unknown>): boolean =>
  Object.keys(object).length === 0;

export const getObjectKeys = <T extends Record<string | number, unknown>>(
  object: T,
): (keyof T)[] => Object.keys(object) as (keyof T)[];

export const getObjectEntries = <T extends Record<string | number, unknown>>(
  object: T,
): [keyof T, T[keyof T]][] => Object.entries(object) as [keyof T, T[keyof T]][];
