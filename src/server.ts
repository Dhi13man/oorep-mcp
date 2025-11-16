import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

async function main() {
  const server = new Server(
    {
      name: "oorep-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );

  // TODO: Register MCP prompts, resources, and tools once implementations exist.

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("oorep-mcp failed to start", error);
  process.exitCode = 1;
});
