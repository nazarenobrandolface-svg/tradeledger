// PostCSS runs with the repo root as cwd, so the Tailwind config path is
// explicit instead of relying on Tailwind's default cwd lookup.
export default {
  plugins: {
    tailwindcss: { config: './frontend/tailwind.config.ts' },
    autoprefixer: {}
  }
};
