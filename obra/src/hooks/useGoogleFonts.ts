import { useEffect } from "react";

/**
 * Dynamically injects a Google Fonts stylesheet for the given font families.
 * Idempotent: skips if a link tag with the same href already exists.
 *
 * Used by PreviewDocument to load project-specific heading/body fonts that may
 * differ from the base app fonts (Fraunces + Plus Jakarta Sans) already in
 * index.html.
 */
export function useGoogleFonts(families: readonly string[]) {
  useEffect(() => {
    for (const family of families) {
      if (!family) continue;
      const encoded = encodeURIComponent(family);
      const href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`;
      if (document.querySelector(`link[href="${href}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, [families]);
}
