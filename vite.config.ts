import { defineConfig } from 'vite';

const NGROK = process.env.NGROK_URL ? new URL(process.env.NGROK_URL).host : undefined;

export default defineConfig({
  server: {
    host: true,
    // prevent DNS-rebinding blocks; list your ngrok host
    allowedHosts: NGROK ? [NGROK] : [],
    hmr: NGROK
      ? {
          protocol: 'wss',
          host: NGROK,
          clientPort: 443,
        }
      : undefined,
  },
});
