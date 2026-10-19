import { build } from 'esbuild';
await build({entryPoints:['editor-entry.js'],bundle:true,format:'esm',splitting:true,outdir:'../../notes/editor',minify:true,target:'es2022',loader:{'.woff2':'file','.woff':'file','.ttf':'file'},assetNames:'fonts/[name]-[hash]',chunkNames:'chunks/[name]-[hash]',legalComments:'linked'});
