import { cn } from "@/lib/utils";

export const appTabsListClass = cn(
  "w-full",
  "grid h-auto gap-1 bg-transparent p-0 border-b border-slate-200"
);

export const appTabsTriggerClass = cn(
  "relative rounded-none border-b-2 border-transparent bg-transparent",
  "px-3 py-3 text-sm font-medium leading-tight whitespace-normal",
  
  // cor padrão (INATIVA)
  "text-slate-500",

  // hover
  "hover:text-slate-700",

  // ativa
  "data-[state=active]:text-slate-900",
  "data-[state=active]:border-primary",
  "data-[state=active]:bg-transparent",

  // remove qualquer sombra/lixo visual
  "data-[state=active]:shadow-none",
  "shadow-none",

  "transition-colors duration-200"
);

export const appTabsPanelClass = cn(
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
);