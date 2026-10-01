import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // En GitHub Pages la web vive en https://<usuario>.github.io/<repo>/
  base: mode === "pages" ? process.env.PAGES_BASE || "/rag-ejemplo/" : "/",
  define: {
    // En Pages no hay backend: todo el RAG corre en el navegador.
    "import.meta.env.VITE_STATIC": JSON.stringify(mode === "pages"),
  },
  server: {
    // En desarrollo, las llamadas a /api van al backend de Node.
    proxy: { "/api": "http://localhost:3001" },
  },
}));
