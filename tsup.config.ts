import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: process.env.NODE_ENV === 'production',
  treeshake: true,
  target: 'es2022',
  outDir: 'dist',
  external: [
    'anthropic',
    'neo4j-driver',
    'axios',
    'winston',
    'dotenv',
    'zod',
  ],
});
