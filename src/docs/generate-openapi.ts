/**
 * OpenAPI Documentation Generator - CLI Tool
 *
 * Generates OpenAPI 3.1 specification from the TaskBoard API Express app
 * by combining Zod schemas with Express route introspection.
 * Run with: node --import tsx src/docs/generate-openapi.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { generateOpenApiSpec, generateSwaggerUI } from "./openapi.js";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..", "..");

async function main() {
  try {
    console.log("Generating OpenAPI specification...");
    console.log("CWD:", process.cwd());

    // Generate OpenAPI spec
    const spec = generateOpenApiSpec();
    console.log("Spec generated");

    // Write to file
    const outputDir = resolve(process.cwd(), "docs", "api");
    console.log("Output dir:", outputDir);
    if (!existsSync(resolve(process.cwd(), "docs"))) {
      mkdirSync(resolve(process.cwd(), "docs"), { recursive: true });
      console.log("Created docs dir");
    }
    if (!existsSync(resolve(process.cwd(), "docs", "api"))) {
      mkdirSync(resolve(process.cwd(), "docs", "api"), { recursive: true });
      console.log("Created docs/api dir");
    }

    const outputPath = resolve(process.cwd(), "docs", "api", "openapi.json");
    writeFileSync(outputPath, JSON.stringify(spec, null, 2));

    console.log(`OpenAPI spec written to ${outputPath}`);

    // Also generate a Swagger UI HTML file
    const swaggerHtml = generateSwaggerUI({
      openApiUrl: "/docs/openapi.json",
      title: "TaskBoard API Documentation",
    });

    writeFileSync(resolve(process.cwd(), "docs", "api", "index.html"), swaggerHtml);
    console.log("Swagger UI HTML written to docs/api/index.html");

  } catch (error) {
    console.error("Failed to generate OpenAPI spec:", error);
    process.exit(1);
  }
}

// Always run main when this file is executed
main().catch(console.error);