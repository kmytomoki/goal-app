import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 親ディレクトリの別 lockfile を誤検出しないよう、ワークスペースルートを固定
  turbopack: {
    root: path.resolve(__dirname),
  },
  // エミュレータ利用時のローカル別名アクセスを許可
  allowedDevOrigins: ["127.0.0.1", "127.0.0.7"],
};

export default nextConfig;
