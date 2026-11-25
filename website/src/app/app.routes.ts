import type { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    title: "Toolpeek: See what AI agents see",
    loadComponent: () => import("./pages/home"),
  },
  {
    path: "privacy",
    title: "Privacy Policy · Toolpeek",
    data: {
      description:
        "How the Toolpeek browser extension handles page data, WebMCP tools, API keys and preferences.",
    },
    loadComponent: () => import("./pages/privacy"),
  },
  { path: "**", redirectTo: "" },
];
