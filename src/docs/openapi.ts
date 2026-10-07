/**
 * OpenAPI Document Generator - Runtime Library
 *
 * Generates OpenAPI 3.1 document from Zod schemas and Express routes.
 * Served via Swagger UI at /docs and JSON at /docs/openapi.json
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createSchema } from "zod-openapi";
import { z } from "zod";

// ============================================================================
// Simplified Zod Schemas for OpenAPI (without transforms that break createSchema)
// ============================================================================

const emailSchema = z.string().email("A valid email address is required.").max(254, "Email address is too long.");

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long.")
  .max(200, "Password must be at most 200 characters long.")
  .refine((value) => !value.trim().startsWith("TaskBoard!"), {
    message: "Password must not start with the product name.",
  });

const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2, "Name must be at least 2 characters long.").max(80, "Name must be at most 80 characters long."),
});

const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(200),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required.").max(500),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const projectStatusSchema = z.enum(["active", "archived"]);

const createProjectBodySchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters long.").max(120, "Project name must be at most 120 characters long."),
  description: z.string().trim().max(2000, "Description must be at most 2000 characters long.").default(""),
  status: projectStatusSchema.default("active"),
});

const updateProjectBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    status: projectStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: projectStatusSchema.optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(["name", "createdAt", "updatedAt", "id"]).optional().describe("Field to sort by. Append \":asc\" or \":desc\" (default desc)."),
});

const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);
const taskPrioritySchema = z.enum(["low", "medium", "high"]);

const isoDateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), { message: "dueDate must be a valid ISO 8601 date." });

const createTaskBodySchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters long.").max(200, "Task title must be at most 200 characters long."),
  description: z.string().trim().max(4000, "Description must be at most 4000 characters long.").default(""),
  status: taskStatusSchema.default("todo"),
  priority: taskPrioritySchema.default("medium"),
  assigneeId: z.coerce.number().int().positive().nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
});

const updateTaskBodySchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(4000).optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigneeId: z.coerce.number().int().positive().nullable().optional(),
    dueDate: isoDateSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

const listTasksQuerySchema = paginationQuerySchema.extend({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sort: z.enum(["title", "dueDate", "createdAt", "updatedAt", "id"]).optional(),
});

// ============================================================================
// Type Definitions
// ============================================================================

export interface OpenApiConfig {
  title: string;
  version: string;
  description: string;
  servers: Array<{ url: string; description: string }>;
  outputPath?: string;
}

export interface SwaggerUIOptions {
  openApiUrl: string;
  title?: string;
  tryItOutEnabled?: boolean;
  persistAuthorization?: boolean;
}

export interface OpenApiMiddlewareOptions {
  openApiPath?: string;
  docsPath?: string;
  spec?: any;
}

export interface OpenApiServerOptions {
  app: any;
  config: {
    title: string;
    version: string;
    description: string;
    servers: Array<{ url: string; description: string }>;
  };
  openApiPath?: string;
  docsPath?: string;
}

// ============================================================================
// OpenAPI Document Generator
// ============================================================================

export class OpenApiGenerator {
  private document: any;

  constructor(config: OpenApiConfig) {
    this.document = this.buildDocument(config);
  }

  private buildDocument(config: OpenApiConfig): any {
    return {
      openapi: "3.1.0",
      info: {
        title: config.title,
        version: config.version,
        description: config.description,
      },
      servers: config.servers,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      paths: {},
    };
  }

  registerSchemas(): this {
    return this;
  }

  registerRoutes(app: any): this {
    return this;
  }

  generateDocument(): any {
    return this.document;
  }

  generate(outputPath?: string): any {
    const document = this.generateDocument();

    if (outputPath) {
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      writeFileSync(outputPath, JSON.stringify(document, null, 2));
    }

    return document;
  }
}

export function generateSwaggerUI(options: {
  openApiUrl: string;
  title?: string;
  tryItOutEnabled?: boolean;
  persistAuthorization?: boolean;
}): string {
  const { openApiUrl, title = "API Documentation", tryItOutEnabled = true, persistAuthorization = true } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    #swagger-ui { height: 100vh; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "${openApiUrl}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        tryItOutEnabled: ${tryItOutEnabled},
        filter: true,
        persistAuthorization: ${persistAuthorization},
      });
    };
  </script>
</body>
</html>`;
}

/**
 * Generates the complete OpenAPI 3.1 document for TaskBoard API
 */
export function generateOpenApiSpec(): any {
  const paths: Record<string, any> = {};

  // --- Auth Routes ---
  paths["/api/auth/register"] = {
    post: {
      tags: ["auth"],
      summary: "Register a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: createSchema(registerBodySchema),
          },
        },
      },
      responses: {
        "201": {
          description: "User created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user: { $ref: "#/components/schemas/User" },
                  tokens: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                      expiresIn: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        "409": { description: "Email already registered" },
        "422": { description: "Validation error" },
      },
    },
  };

  paths["/api/auth/login"] = {
    post: {
      tags: ["auth"],
      summary: "Login with email and password",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: createSchema(loginBodySchema),
          },
        },
      },
      responses: {
        "200": {
          description: "Login successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user: { $ref: "#/components/schemas/User" },
                  tokens: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                      expiresIn: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": { description: "Invalid credentials" },
        "422": { description: "Validation error" },
      },
    },
  };

  paths["/api/auth/refresh"] = {
    post: {
      tags: ["auth"],
      summary: "Refresh access token",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: createSchema(refreshBodySchema),
          },
        },
      },
      responses: {
        "200": {
          description: "Tokens refreshed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user: { $ref: "#/components/schemas/User" },
                  tokens: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                      expiresIn: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": { description: "Invalid or expired refresh token" },
        "422": { description: "Validation error" },
      },
    },
  };

  paths["/api/auth/logout"] = {
    post: {
      tags: ["auth"],
      summary: "Logout (revoke refresh token)",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: createSchema(refreshBodySchema),
          },
        },
      },
      responses: {
        "204": { description: "Logged out successfully" },
        "401": { description: "Unauthorized" },
        "422": { description: "Validation error" },
      },
    },
  };

  paths["/api/auth/logout-all"] = {
    post: {
      tags: ["auth"],
      summary: "Logout from all devices",
      security: [{ bearerAuth: [] }],
      responses: {
        "204": { description: "Logged out from all devices" },
        "401": { description: "Unauthorized" },
      },
    },
  };

  paths["/api/auth/me"] = {
    get: {
      tags: ["auth"],
      summary: "Get current user profile",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Current user profile",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
        "401": { description: "Unauthorized" },
      },
    },
  };

  // --- Project Routes ---
  paths["/api/projects"] = {
    get: {
      tags: ["projects"],
      summary: "List projects",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        { name: "status", in: "query", schema: { type: "string", enum: ["active", "archived"] } },
        { name: "ownerId", in: "query", schema: { type: "integer", minimum: 1 } },
        { name: "search", in: "query", schema: { type: "string", minLength: 1, maxLength: 120 } },
        { name: "sort", in: "query", schema: { type: "string", pattern: "^(name|createdAt|updatedAt|id)(:(asc|desc))?$" } },
      ],
      responses: {
        "200": {
          description: "List of projects",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "array", items: { $ref: "#/components/schemas/Project" } },
                  meta: { $ref: "#/components/schemas/PageMeta" },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["projects"],
      summary: "Create a project",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: createSchema(createProjectBodySchema),
          },
        },
      },
      responses: {
        "201": { description: "Project created", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Project" } } } } } },
        "401": { description: "Unauthorized" },
        "422": { description: "Validation error" },
      },
    },
  };

  paths["/api/projects/{id}"] = {
    get: {
      tags: ["projects"],
      summary: "Get a project by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
      responses: {
        "200": { description: "Project found", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Project" } } } } } },
        "401": { description: "Unauthorized" },
        "404": { description: "Project not found" },
        "422": { description: "Invalid ID" },
      },
    },
    patch: {
      tags: ["projects"],
      summary: "Update a project",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: createSchema(updateProjectBodySchema) } },
      },
      responses: {
        "200": { description: "Project updated", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Project" } } } } } },
        "401": { description: "Unauthorized" },
        "404": { description: "Project not found" },
        "422": { description: "Validation error" },
      },
    },
    delete: {
      tags: ["projects"],
      summary: "Delete a project",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
      responses: {
        "204": { description: "Project deleted" },
        "401": { description: "Unauthorized" },
        "404": { description: "Project not found" },
        "422": { description: "Invalid ID" },
      },
    },
  };

  // --- Task Routes ---
  paths["/api/projects/{id}/tasks"] = {
    get: {
      tags: ["tasks"],
      summary: "List tasks for a project",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        { name: "status", in: "query", schema: { type: "string", enum: ["todo", "in_progress", "done"] } },
        { name: "priority", in: "query", schema: { type: "string", enum: ["low", "medium", "high"] } },
        { name: "assigneeId", in: "query", schema: { type: "integer", minimum: 1 } },
        { name: "search", in: "query", schema: { type: "string", minLength: 1, maxLength: 200 } },
        { name: "sort", in: "query", schema: { type: "string", pattern: "^(title|dueDate|createdAt|updatedAt|id)(:(asc|desc))?$" } },
      ],
      responses: {
        "200": {
          description: "List of tasks",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "array", items: { $ref: "#/components/schemas/Task" } },
                  meta: { $ref: "#/components/schemas/PageMeta" },
                },
              },
            },
          },
        },
        "401": { description: "Unauthorized" },
        "404": { description: "Project not found" },
      },
    },
    post: {
      tags: ["tasks"],
      summary: "Create a task",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: createSchema(createTaskBodySchema) } },
      },
      responses: {
        "201": { description: "Task created", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Task" } } } } } },
        "401": { description: "Unauthorized" },
        "404": { description: "Project not found" },
        "422": { description: "Validation error" },
      },
    },
  };

  paths["/api/tasks/{id}"] = {
    get: {
      tags: ["tasks"],
      summary: "Get a task by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
      responses: {
        "200": { description: "Task found", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Task" } } } } } },
        "401": { description: "Unauthorized" },
        "404": { description: "Task not found" },
        "422": { description: "Invalid ID" },
      },
    },
    patch: {
      tags: ["tasks"],
      summary: "Update a task",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: createSchema(updateTaskBodySchema) } },
      },
      responses: {
        "200": { description: "Task updated", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Task" } } } } } },
        "401": { description: "Unauthorized" },
        "404": { description: "Task not found" },
        "422": { description: "Validation error" },
      },
    },
    delete: {
      tags: ["tasks"],
      summary: "Delete a task",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
      responses: {
        "204": { description: "Task deleted" },
        "401": { description: "Unauthorized" },
        "404": { description: "Task not found" },
        "422": { description: "Invalid ID" },
      },
    },
  };

  // Health check
  paths["/health"] = {
    get: {
      tags: ["health"],
      summary: "Health check",
      responses: {
        "200": {
          description: "Service is healthy",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["ok"] },
                  uptimeSeconds: { type: "integer" },
                  environment: { type: "string" },
                  version: { type: "string" },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  };

  // Build the complete OpenAPI document
  return {
    openapi: "3.1.0",
    info: {
      title: "TaskBoard API",
      version: "1.0.0",
      description: "Production-ready REST API for project and task management with JWT auth, RBAC, validation, rate limiting and SQLite persistence.",
      contact: {
        name: "TaskBoard API",
        url: "https://github.com/soverignos1-spec/taskboard-api",
      },
    },
    servers: [
      { url: "http://localhost:3000", description: "Development server" },
      { url: "https://api.example.com", description: "Production server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer", minimum: 1 },
            email: { type: "string", format: "email" },
            name: { type: "string", minLength: 2, maxLength: 80 },
            role: { type: "string", enum: ["member", "admin"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Project: {
          type: "object",
          properties: {
            id: { type: "integer", minimum: 1 },
            ownerId: { type: "integer", minimum: 1 },
            name: { type: "string", minLength: 2, maxLength: 120 },
            description: { type: "string", maxLength: 2000 },
            status: { type: "string", enum: ["active", "archived"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "integer", minimum: 1 },
            projectId: { type: "integer", minimum: 1 },
            createdBy: { type: "integer", minimum: 1 },
            assigneeId: { type: "integer", minimum: 1, nullable: true },
            title: { type: "string", minLength: 2, maxLength: 200 },
            description: { type: "string", maxLength: 4000 },
            status: { type: "string", enum: ["todo", "in_progress", "done"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            dueDate: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        PageMeta: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1 },
            pageSize: { type: "integer", minimum: 1, maximum: 100 },
            total: { type: "integer", minimum: 0 },
            totalPages: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "auth", description: "Authentication endpoints" },
      { name: "projects", description: "Project management" },
      { name: "tasks", description: "Task management" },
      { name: "health", description: "Health check" },
    ],
    paths,
  };
}

export interface OpenApiMiddlewareOptions {
  openApiPath?: string;
  docsPath?: string;
  spec?: any;
}

export function createOpenApiMiddleware(options: OpenApiMiddlewareOptions = {}) {
  const { openApiPath = "/docs/openapi.json", docsPath = "/docs", spec } = options;

  return [
    (req: any, res: any, next: any) => {
      if (req.path === openApiPath || req.path === "/api" + openApiPath) {
        res.setHeader("Content-Type", "application/json");
        if (spec) {
          return res.json(spec);
        }
        return res.status(501).json({ error: "OpenAPI spec not generated" });
      }
      return next();
    },
    (req: any, res: any, next: any) => {
      const path = req.path;
      if (path === "/docs" || req.path.startsWith("/docs/")) {
        const swaggerHtml = generateSwaggerUI({
          openApiUrl: openApiPath,
          title: "TaskBoard API Documentation",
          tryItOutEnabled: true,
          persistAuthorization: true,
        });
        res.setHeader("Content-Type", "text/html");
        return res.send(swaggerHtml);
      }
      return next();
    },
  ];
}

export default {
  createOpenApiMiddleware,
  generateSwaggerUI,
  generateOpenApiSpec,
  mountOpenApiDocs: async () => {},
};