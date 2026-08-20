import { getRequestListener } from "@hono/node-server";
import { app } from "./index.js";

// hono/vercel's handle() expects the caller to pass a Web-standard Request
// and returns a Response — but Vercel's nodejs22.x runtime invokes Build
// Output API v3 functions the classic Node way, (req, res) => void (see
// IncomingMessage/ServerResponse in the warning this originally crashed
// with: "this.raw.headers.forEach is not a function"). getRequestListener
// is @hono/node-server's adapter for exactly that calling convention.
export default getRequestListener(app.fetch);
