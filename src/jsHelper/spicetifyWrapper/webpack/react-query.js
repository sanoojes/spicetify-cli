import { fnStr } from "../shared/string.js";

export function findReactQuery({ cache, modules, functionModules }) {
  return (
    cache.find((module) => module.useQuery) || {
      PersistQueryClientProvider: functionModules.find((m) => fnStr(m).includes("persistOptions")),
      QueryClient: functionModules.find((m) => fnStr(m).includes("defaultMutationOptions")),
      QueryClientProvider: functionModules.find((m) => fnStr(m).includes("use QueryClientProvider")),
      notifyManager: modules.find((m) => m?.setBatchNotifyFunction),
      useMutation: functionModules.find((m) => fnStr(m).includes("mutateAsync")),
      useQuery: functionModules.find((m) =>
        fnStr(m).match(/^function [\w_$]+\(([\w_$]+),([\w_$]+)\)\{return\(0,[\w_$]+\.[\w_$]+\)\(\1,[\w_$]+\.[\w_$]+,\2\)\}$/),
      ),
      useQueryClient: functionModules.find((m) => fnStr(m).includes("client") && fnStr(m).includes("Provider") && fnStr(m).includes("mount")),
      useSuspenseQuery: functionModules.find(
        (m) => fnStr(m).includes("throwOnError") && fnStr(m).includes("suspense") && fnStr(m).includes("enabled"),
      ),
    }
  );
}
