import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: "node",
        globals: true,
        include: ["app/**/*.test.{ts,tsx}"],
        exclude: ["node_modules", "build"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: ["app/**/*.{ts,tsx}"],
            exclude: ["app/**/*.test.{ts,tsx}", "app/routes/_index/**"],
        },
        setupFiles: ["./app/__tests__/setup.ts"],
    },
});
