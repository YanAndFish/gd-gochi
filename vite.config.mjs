import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * 根据运行命令设置本地开发与 GitHub Pages 的资源基路径。
 * @param {{command: "build" | "serve", isPreview?: boolean}} environment - Vite 当前运行环境。
 * @returns {import("vite").UserConfig} Vite 配置。
 */
function createViteConfig({ command, isPreview }) {
  return {
    base: command === "build" || isPreview ? "/gd-gochi/" : "/",
    build: {
      outDir: "dist/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      port: 4321,
      strictPort: true,
      allowedHosts: ["terminal.local", "127.0.0.1", "localhost"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4321,
      strictPort: true,
    },
    test: {
      environment: "node",
    },
    plugins: [react()],
  };
}

export default defineConfig(createViteConfig);
