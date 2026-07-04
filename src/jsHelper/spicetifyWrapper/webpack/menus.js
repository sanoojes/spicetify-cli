import { fnStr } from "../shared/string.js";

const knownMenuTypes = new Set(["album", "show", "artist", "track", "playlist"]);

function menuName(type) {
  return `${type
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")}Menu`;
}

function getMenuType(module) {
  const source = module?.type ? fnStr(module.type) : "";
  const valueMatch = source.match(/value:"([\w-]+)"/);
  if (valueMatch) return valueMatch[1];

  const typeMatch = source.match(/type:[\w$]+\.[\w$]+\.([A-Z_]+)/);
  if (typeMatch) return typeMatch[1].toLowerCase();

  return undefined;
}

export function findMenus(modules) {
  return modules
    .map((module) => {
      let type = getMenuType(module);
      if (!type || !knownMenuTypes.has(type)) return undefined;
      if (type === "show") type = "podcast-show";
      return [menuName(type), module];
    })
    .filter(Boolean);
}

export function findMenuOverrides(exportedMemos) {
  return [
    ["PlaylistMenu", exportedMemos?.find((m) => fnStr(m.type).includes("labelPlacement") && fnStr(m.type).includes("menuPlacement"))],
    ["TrackMenu", exportedMemos?.find((m) => fnStr(m.type).includes("canSwitchVisuals") && fnStr(m.type).includes("showCanvasAction"))],
  ].filter(([, value]) => value !== undefined);
}
