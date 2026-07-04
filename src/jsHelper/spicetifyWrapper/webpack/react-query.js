import { fnStr } from "../shared/string.js";
import { getObjectValues } from "./module-inventory.js";

const QUERY_CLIENT_METHODS = ["mount", "unmount", "defaultQueryOptions", "defaultMutationOptions", "getQueryCache", "getMutationCache"];
const QUERY_CLIENT_PROVIDER_MARKERS = ["client", "children", "mount", "unmount"];
const QUERY_CLIENT_MARKERS = ["defaultQueryOptions", "defaultMutationOptions", "getQueryCache", "getMutationCache"];
const PERSIST_PROVIDER_MARKERS = ["persistOptions", "restoreClient", "persistClient", "removeClient"];
const PERSIST_FIBER_MARKERS = ["persistOptions", "queryClient", "getQueryCache", "getMutationCache"];
const MUTATION_HOOK_MARKERS = ["useSyncExternalStore", "mutateAsync", "throwOnError"];
const SUSPENSE_QUERY_MARKERS = ["throwOnError", "suspense", "enabled"];
const REACT_FIBER_PREFIXES = ["__reactFiber$", "__reactContainer$"];

function hasMarkers(source, markers) {
  return markers.every((marker) => source.includes(marker));
}

function findCacheExport(cache, exportName, predicate = (value) => value !== undefined) {
  for (const module of cache) {
    const value = module?.[exportName];

    if (predicate(value)) return value;
  }
}

function isFunction(value) {
  return typeof value === "function";
}

function hasFunctions(value, names) {
  return names.every((name) => typeof value?.[name] === "function");
}

function validated(value, predicate) {
  return predicate(value) ? value : undefined;
}

function isQueryClient(value) {
  return isFunction(value) && hasFunctions(value.prototype, QUERY_CLIENT_METHODS);
}

function isQueryClientInstance(value) {
  return hasFunctions(value, QUERY_CLIENT_METHODS);
}

function isQueryClientProvider(value) {
  if (!isFunction(value)) return false;

  const source = fnStr(value);
  return hasMarkers(source, QUERY_CLIENT_PROVIDER_MARKERS) && !source.includes("No QueryClient set") && !source.includes("defaultQueryOptions");
}

function isPersistQueryClientProvider(value, props) {
  if (!isFunction(value)) return false;
  if (props?.persistOptions !== undefined && isQueryClientInstance(props.client)) return true;

  const source = fnStr(value);
  return hasMarkers(source, PERSIST_PROVIDER_MARKERS) || hasMarkers(source, PERSIST_FIBER_MARKERS);
}

function isUseQueryClient(value) {
  if (!isFunction(value) || isQueryClientProvider(value)) return false;

  const source = fnStr(value);
  return source.includes("No QueryClient set") || hasMarkers(source, ["useContext", "QueryClient"]);
}

function isUseMutation(value) {
  return isFunction(value) && hasMarkers(fnStr(value), MUTATION_HOOK_MARKERS);
}

function getFiber(element) {
  for (const key of Object.keys(element)) {
    if (REACT_FIBER_PREFIXES.some((prefix) => key.startsWith(prefix))) return element[key];
  }
}

function getFiberProps(fiber) {
  return fiber?.memoizedProps ?? fiber?.pendingProps;
}

function getFiberType(fiber) {
  return fiber?.type ?? fiber?.elementType;
}

function findReactQueryFiberValues() {
  if (typeof document === "undefined") return {};

  const values = {};
  const seen = new Set();
  const stack = [];

  for (const element of document.querySelectorAll("*")) {
    const fiber = getFiber(element);

    if (fiber !== undefined) stack.push(fiber);
  }

  while (stack.length) {
    const fiber = stack.pop();

    if (fiber === undefined || seen.has(fiber)) continue;

    seen.add(fiber);

    const props = getFiberProps(fiber);
    const type = getFiberType(fiber);
    const client = props?.client ?? props?.value;
    const queryClientConstructor = client?.constructor;

    if (values.QueryClient === undefined && isQueryClient(queryClientConstructor)) values.QueryClient = queryClientConstructor;
    if (values.QueryClientProvider === undefined && isQueryClientProvider(type)) values.QueryClientProvider = type;
    if (values.PersistQueryClientProvider === undefined && isPersistQueryClientProvider(type, props)) values.PersistQueryClientProvider = type;

    if (fiber.child !== null) stack.push(fiber.child);
    if (fiber.sibling !== null) stack.push(fiber.sibling);
  }

  return values;
}

function findQueryClient({ cache, modules, functionModules }) {
  const queryClientInstance =
    cache.find(isQueryClientInstance) ?? modules.find(isQueryClientInstance) ?? cache.flatMap(getObjectValues).find(isQueryClientInstance);
  const queryClientConstructor = queryClientInstance?.constructor;

  return (
    findCacheExport(cache, "QueryClient", isQueryClient) ??
    validated(queryClientConstructor, isQueryClient) ??
    functionModules.find(isQueryClient) ??
    functionModules.find((module) => hasMarkers(fnStr(module), QUERY_CLIENT_MARKERS))
  );
}

function findPersistQueryClientProvider({ cache, functionModules }) {
  return (
    findCacheExport(cache, "PersistQueryClientProvider", isPersistQueryClientProvider) ??
    functionModules.find(isPersistQueryClientProvider) ??
    functionModules.find((module) => hasMarkers(fnStr(module), ["persistOptions", "persistClient"])) ??
    functionModules.find((module) => fnStr(module).includes("persistOptions"))
  );
}

function findQueryClientProvider({ cache, functionModules }) {
  return findCacheExport(cache, "QueryClientProvider", isQueryClientProvider) ?? functionModules.find(isQueryClientProvider);
}

function findUseQueryClient({ cache, functionModules }) {
  return findCacheExport(cache, "useQueryClient", isUseQueryClient) ?? functionModules.find(isUseQueryClient);
}

export function findReactQuery({ cache, modules, functionModules }) {
  const reactQueryModule = cache.find((module) => module?.useQuery);
  const fiberReactQuery = findReactQueryFiberValues();
  const directQueryClient = reactQueryModule?.QueryClient;
  const directQueryClientProvider = reactQueryModule?.QueryClientProvider;
  const directPersistQueryClientProvider = reactQueryModule?.PersistQueryClientProvider;
  const directUseQueryClient = reactQueryModule?.useQueryClient;

  return {
    ...reactQueryModule,
    PersistQueryClientProvider:
      validated(directPersistQueryClientProvider, isPersistQueryClientProvider) ??
      fiberReactQuery.PersistQueryClientProvider ??
      findPersistQueryClientProvider({ cache, functionModules }),
    QueryClient: validated(directQueryClient, isQueryClient) ?? fiberReactQuery.QueryClient ?? findQueryClient({ cache, modules, functionModules }),
    QueryClientProvider:
      validated(directQueryClientProvider, isQueryClientProvider) ??
      fiberReactQuery.QueryClientProvider ??
      findQueryClientProvider({ cache, functionModules }),
    notifyManager: reactQueryModule?.notifyManager ?? modules.find((m) => m?.setBatchNotifyFunction),
    useMutation: reactQueryModule?.useMutation ?? findCacheExport(cache, "useMutation", isFunction) ?? functionModules.find(isUseMutation),
    useQuery:
      reactQueryModule?.useQuery ??
      findCacheExport(cache, "useQuery", isFunction) ??
      functionModules.find((m) =>
        fnStr(m).match(/^function [\w_$]+\(([\w_$]+),([\w_$]+)\)\{return\(0,[\w_$]+\.[\w_$]+\)\(\1,[\w_$]+\.[\w_$]+,\2\)\}$/),
      ),
    useQueryClient: validated(directUseQueryClient, isUseQueryClient) ?? findUseQueryClient({ cache, functionModules }),
    useSuspenseQuery:
      reactQueryModule?.useSuspenseQuery ??
      findCacheExport(cache, "useSuspenseQuery", isFunction) ??
      functionModules.find((m) => hasMarkers(fnStr(m), SUSPENSE_QUERY_MARKERS)),
  };
}
