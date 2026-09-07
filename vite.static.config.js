import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
const assetVersion = process.env.GITHUB_SHA || Date.now().toString();
export default defineConfig({base:'./',define:{__ASSET_VERSION__:JSON.stringify(assetVersion)},plugins:[react()],css:{postcss:{plugins:[tailwind()]}},resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},build:{outDir:'dist',emptyOutDir:true},server:{host:'127.0.0.1'}});

