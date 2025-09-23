import type { APIRoute } from "astro";

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? "",
      PUBLIC_AUTH_URL: process.env.PUBLIC_AUTH_URL ?? "",
      PUBLIC_AUTHENTIK_URL: process.env.PUBLIC_AUTHENTIK_URL ?? "",
      PUBLIC_AUTHENTIK_CLIENT_ID: process.env.PUBLIC_AUTHENTIK_CLIENT_ID ?? "",
      PUBLIC_AUTHENTIK_CLIENT_SECRET: process.env.PUBLIC_AUTHENTIK_CLIENT_SECRET ?? "",
      PUBLIC_AUTHENTIK_REDIRECT_URI: process.env.PUBLIC_AUTHENTIK_REDIRECT_URI ?? "",
      PUBLIC_MCARD_API_URL: process.env.PUBLIC_MCARD_API_URL ?? "",
      PUBLIC_GOOGLE_API_KEY: process.env.PUBLIC_GOOGLE_API_KEY ?? "",
      PUBLIC_GOOGLE_CLIENT_ID: process.env.PUBLIC_GOOGLE_CLIENT_ID ?? "",
      PUBLIC_GOOGLE_CLIENT_SECRET: process.env.PUBLIC_GOOGLE_CLIENT_SECRET ?? "",
      ENABLE_EXPERIMENTAL_FEATURES: process.env.ENABLE_EXPERIMENTAL_FEATURES ?? "false",
      VERSION: process.env.VERSION ?? "1.0.0",
      BUILD_TIMESTAMP: new Date().toISOString(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};
