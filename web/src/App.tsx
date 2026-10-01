import { useEffect, useState } from "react";
import { Demo } from "./Demo";
import { REPO_URL } from "./guide/chapters";
import { Guide } from "./guide/Guide";

/**
 * Navegación por hash (#/ y #/guia/<capitulo>#<seccion>): funciona en GitHub Pages
 * sin configurar el servidor.
 */
function parseHash(hash: string) {
  const [path, anchor = null] = hash.replace(/^#/, "").split("#");
  const m = path.match(/^\/guia(?:\/([\w-]+))?/);
  return m ? { page: "guia" as const, slug: m[1] ?? null, anchor } : { page: "demo" as const, slug: null, anchor: null };
}

export default function App() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <nav className="topnav">
        <a href="#/" className="brand">
          RAG de ejemplo
        </a>
        <div className="links">
          <a href="#/" className={route.page === "demo" ? "current" : ""}>
            Demo
          </a>
          <a href="#/guia" className={route.page === "guia" ? "current" : ""}>
            Guía
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </nav>
      {route.page === "guia" ? <Guide slug={route.slug} anchor={route.anchor} /> : <Demo />}
    </>
  );
}
