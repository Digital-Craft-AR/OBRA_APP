import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const FIGMA_ASSET_PREFIX = 'figma:asset/'

/** Maps Figma Make virtual imports to files under src/assets (local Vite builds). */
function figmaMakeAssetPlugin(): Plugin {
  const assetsRoot = path.resolve(__dirname, 'src/assets')
  return {
    name: 'figma-make-asset',
    resolveId(id) {
      if (!id.startsWith(FIGMA_ASSET_PREFIX)) return
      const rel = id.slice(FIGMA_ASSET_PREFIX.length)
      const resolved = path.resolve(assetsRoot, rel)
      const safeRel = path.relative(assetsRoot, resolved)
      if (safeRel.startsWith('..') || path.isAbsolute(safeRel)) return
      return resolved
    },
  }
}

export default defineConfig({
  plugins: [
    figmaMakeAssetPlugin(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
