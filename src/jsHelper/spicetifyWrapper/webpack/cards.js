import { fnStr } from "../shared/string.js";

const defaultCardTypes = ["album", "artist", "audiobook", "episode", "playlist", "profile", "show", "track"];
export const lazyCardTypes = ["audiobook", "profile", "show"];

export function cardName(type) {
  return type[0].toUpperCase() + type.slice(1);
}

function findCardEntriesInSource(source, component, remainingTypes) {
  const entries = [];

  for (let i = 0; i < remainingTypes.length; i += 1) {
    const type = remainingTypes[i];
    if (!source.includes(`featureIdentifier:"${type}"`)) continue;
    remainingTypes.splice(remainingTypes.indexOf(type), 1);
    i -= 1;
    entries.push([cardName(type), component]);
  }

  return entries;
}

function findFunctionCardEntries(functionModules, remainingTypes) {
  return functionModules.flatMap((module) => findCardEntriesInSource(fnStr(module), module, remainingTypes));
}

function findComponentCardEntries(modules, remainingTypes) {
  return modules.flatMap((module) => {
    try {
      const source = module?.type ? fnStr(module.type) : "";
      return findCardEntriesInSource(source, module, remainingTypes);
    } catch {
      return [];
    }
  });
}

export function findCards({ modules, functionModules }, cardTypes = defaultCardTypes) {
  const remainingTypes = [...cardTypes];
  return [...findFunctionCardEntries(functionModules, remainingTypes), ...findComponentCardEntries(modules, remainingTypes)];
}
