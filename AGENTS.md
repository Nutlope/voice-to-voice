<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation
notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:runtime-agent-rules -->
# Package manager and runtime

Use Bun for dependency management, workspace scripts, and one-off binaries in
this repository. Use `bun install`, `bun run`, and `bun x`; do not add npm,
pnpm, or Yarn lockfiles or commands.

The realtime package, Node adapter, and Next.js adapter support Node.js 22 or
newer. Bun, Deno, Edge runtimes, and Cloudflare Workers are not supported.
<!-- END:runtime-agent-rules -->
