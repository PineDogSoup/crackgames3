import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { localManagerPlugin } from "./scripts/manage-api";

export default defineConfig({
  base: "/",
  plugins: [react(), localManagerPlugin()]
});
