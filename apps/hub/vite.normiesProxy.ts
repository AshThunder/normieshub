import { execFile } from "node:child_process";
import https from "node:https";
import path from "node:path";
import { promisify } from "node:util";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

const UPSTREAM = "https://api.normies.art";
const execFileAsync = promisify(execFile);

let devListingsCache: { result: unknown; expiresAt: number } | null = null;
const DEV_LISTINGS_TTL_MS = 10 * 60 * 1000;

function json(res: import("http").ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

function normiesUpstreamPath(reqUrl: string): string {
  const [pathname, search = ""] = reqUrl.split("?");
  const stripped = pathname.startsWith("/api/normies")
    ? pathname.slice("/api/normies".length) || "/"
    : pathname;
  return `${stripped}${search ? `?${search}` : ""}`;
}

function proxyHttps(
  targetUrl: string,
  accept: string,
): Promise<{ status: number; contentType?: string; cacheControl?: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    https
      .get(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          headers: { Accept: accept, "User-Agent": "normie-hub-dev" },
        },
        (upstream) => {
          const chunks: Buffer[] = [];
          upstream.on("data", (chunk) => chunks.push(chunk));
          upstream.on("end", () => {
            resolve({
              status: upstream.statusCode ?? 502,
              contentType: upstream.headers["content-type"],
              cacheControl: upstream.headers["cache-control"],
              body: Buffer.concat(chunks),
            });
          });
        },
      )
      .on("error", reject);
  });
}

async function fetchListingsViaCli(root: string, apiKey: string) {
  if (devListingsCache && Date.now() < devListingsCache.expiresAt) {
    return devListingsCache.result;
  }

  const script = path.join(root, "scripts/fetch-listings-cli.ts");
  const { stdout } = await execFileAsync("pnpm", ["exec", "tsx", script, "all"], {
    cwd: root,
    env: { ...process.env, OPENSEA_API_KEY: apiKey },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60_000,
  });

  const result = JSON.parse(stdout) as { listed?: Record<string, unknown>; error?: string };
  if (!result.error && result.listed && Object.keys(result.listed).length > 0) {
    devListingsCache = { result, expiresAt: Date.now() + DEV_LISTINGS_TTL_MS };
  }
  return result;
}

async function fetchTokenListingViaCli(root: string, apiKey: string, tokenId: string) {
  const script = path.join(root, "scripts/fetch-listings-cli.ts");
  const { stdout } = await execFileAsync("pnpm", ["exec", "tsx", script, "one", tokenId], {
    cwd: root,
    env: { ...process.env, OPENSEA_API_KEY: apiKey },
    maxBuffer: 1024 * 1024,
    timeout: 15_000,
  });

  const result = JSON.parse(stdout);
  return result && typeof result === "object" && "price" in result ? result : null;
}

/** Server-side proxy so requests don't carry browser Origin (Vercel bot challenge). */
export function normiesApiProxy(): Plugin {
  return {
    name: "normies-api-proxy",
    configureServer(server) {
      server.middlewares.use("/api/listings", async (_req, res) => {
        const env = loadEnv(server.config.mode, server.config.root, "");
        if (!env.OPENSEA_API_KEY) {
          json(res, 200, { listed: {}, fetchedAt: Date.now(), error: "no_api_key" });
          return;
        }
        try {
          const result = await fetchListingsViaCli(server.config.root, env.OPENSEA_API_KEY);
          json(res, 200, result);
        } catch (err) {
          json(res, 500, {
            listed: {},
            fetchedAt: Date.now(),
            error: "fetch_failed",
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      });

      server.middlewares.use("/api/listing", async (req, res) => {
        const env = loadEnv(server.config.mode, server.config.root, "");
        const url = new URL(req.url ?? "/", "http://localhost");
        const tokenId = url.searchParams.get("tokenId");
        if (!tokenId) {
          json(res, 400, { error: "tokenId required" });
          return;
        }
        if (!env.OPENSEA_API_KEY) {
          json(res, 404, { error: "No listing API configured" });
          return;
        }
        try {
          const listing = await fetchTokenListingViaCli(
            server.config.root,
            env.OPENSEA_API_KEY,
            tokenId,
          );
          if (!listing) {
            json(res, 404, { error: "Not listed" });
            return;
          }
          json(res, 200, listing);
        } catch {
          json(res, 404, { error: "Not listed" });
        }
      });

      server.middlewares.use("/api/x-avatar", async (req, res) => {
        const handle = decodeURIComponent((req.url ?? "/").replace(/^\//, ""));
        if (!handle) {
          res.statusCode = 400;
          res.end("handle required");
          return;
        }

        const url = `https://unavatar.io/x/${encodeURIComponent(handle)}`;
        try {
          const upstream = await proxyHttps(url, "image/*,*/*");
          if (upstream.status >= 300 && upstream.status < 400) {
            res.statusCode = 502;
            res.end("X avatar redirect not followed");
            return;
          }
          res.statusCode = upstream.status;
          if (upstream.contentType) res.setHeader("Content-Type", upstream.contentType);
          res.setHeader("Cache-Control", upstream.cacheControl ?? "public, max-age=3600");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(upstream.body);
        } catch (err) {
          res.statusCode = 502;
          const msg = err instanceof Error ? err.message : "X avatar unavailable";
          res.end(`X avatar unavailable: ${msg}`);
        }
      });

      server.middlewares.use("/api/normies", async (req, res) => {
        const path = normiesUpstreamPath(req.url ?? "/");
        const url = `${UPSTREAM}${path}`;

        try {
          const upstream = await proxyHttps(url, req.headers.accept ?? "*/*");
          res.statusCode = upstream.status;
          if (upstream.contentType) res.setHeader("Content-Type", upstream.contentType);
          if (upstream.cacheControl) res.setHeader("Cache-Control", upstream.cacheControl);
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(upstream.body);
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "text/plain");
          const msg = err instanceof Error ? err.message : "Normies API unavailable";
          res.end(`Normies API unavailable: ${msg}`);
        }
      });
    },
  };
}
