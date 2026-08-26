import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import zaloMiniApp from "zmp-vite-plugin";

export default defineConfig({
  root: "./src",
  base: "",
  plugins: [zaloMiniApp(), react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
