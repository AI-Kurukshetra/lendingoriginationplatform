const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Ensure Tailwind picks up our config (especially in environments where it may not auto-discover)
      config: "./tailwind.config.ts",
    },
  },
};

export default config;
