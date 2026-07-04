import { fnStr } from "../shared/string.js";
import { getObjectValues } from "./module-inventory.js";

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function exposeReactComponentsUI({ modules, functionModules, exportedForwardRefs, exportedMemoFRefs }) {
  const componentNames = Object.keys(modules.filter(Boolean).find((e) => typeof e.BrowserDefaultFocusStyleProvider === "string"));
  const componentRegex = new RegExp(`"data-encore-id":(?:[a-zA-Z_$][\\w$]*\\.){2}(${componentNames.map(escapeRegExp).join("|")})\\b`);
  const componentPairs = [
    functionModules.map((f) => [f, f]),
    exportedForwardRefs.map((f) => [f.render, f]),
    exportedMemoFRefs.map((f) => [f.type.render, f]),
  ]
    .flat()
    .map(([s, f]) => [fnStr(s)?.match(componentRegex)?.[1], f]);

  return Object.fromEntries(componentPairs);
}

function isForwardRef(module) {
  return module?.$$typeof === Symbol.for("react.forward_ref");
}

function hasNativeDropdownSignature(source) {
  return (
    source.includes('"select"') &&
    source.includes("preventMenu") &&
    source.includes("onPointerDown") &&
    source.includes("onKeyDown") &&
    source.includes("onSelect") &&
    source.includes("value:")
  );
}

function hasLegacyDropdownSignature(source) {
  return source.includes("dropdown-list") && source.includes('"listbox"');
}

export function findDropdownComponent({ modules, chunks, require }) {
  const loadedDropdown = modules.find((m) => {
    if (!isForwardRef(m)) return false;
    const source = fnStr(m.render);
    return hasNativeDropdownSignature(source) || source.includes("dropdown-list");
  });
  if (loadedDropdown) return loadedDropdown;

  const legacyDropdownChunk = chunks.find(([, value]) => hasLegacyDropdownSignature(fnStr(value)));
  if (!legacyDropdownChunk) return undefined;

  const moduleExports = getObjectValues(require(legacyDropdownChunk[0]));
  return (
    moduleExports.find((m) => isForwardRef(m) && hasLegacyDropdownSignature(fnStr(m.render))) ??
    moduleExports[0]?.render ??
    moduleExports.find((m) => typeof m === "function")
  );
}

export function wrapProvider(component) {
  if (!component) return null;
  return (props) =>
    Spicetify.React.createElement(
      Spicetify.ReactComponent.RemoteConfigProvider,
      { configuration: Spicetify.Platform.RemoteConfiguration },
      Spicetify.React.createElement(component, props),
    );
}
