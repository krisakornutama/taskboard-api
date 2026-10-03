import type { DatabaseSync } from 'node:sqlite';

import type { Config } from './config.js';

export type Role = 'member' | 'admin';
export type ProjectStatus = 'active' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface ProjectRow {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  ownerId: number;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRow {
  id: number;
  project_id: number;
  created_by: number;
  assignee_id: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  projectId: number;
  createdBy: number;
  assigneeId: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Everything a request handler needs, injected so tests stay hermetic. */
export interface Ctx {
  db: DatabaseSync;
  config: Config;
  /** Resets in-memory rate-limiter buckets. Used between tests. */
  resetRateLimits: () => void;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}