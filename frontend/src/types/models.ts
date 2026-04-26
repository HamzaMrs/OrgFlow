export type UserRole = "admin" | "manager" | "employee";
export type ProjectStatus = "todo" | "in_progress" | "done";
export type TaskStatus = ProjectStatus;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
}

export interface InvitationDetails {
  email: string;
  role: UserRole;
  department_name: string | null;
  inviter_name: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  department_name: string | null;
  invited_by_name: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  status: "pending" | "accepted" | "expired";
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  job_title: string | null;
  department_id: string | null;
  department_name: string | null;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner_id: string | null;
  owner_name: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
  task_count: number;
  tasks_done: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  counters: {
    total_projects: number;
    total_tasks: number;
    total_users: number;
    total_departments: number;
  };
  projectStatus: { status: ProjectStatus; count: number }[];
  taskStatus: { status: TaskStatus; count: number }[];
  workload: {
    id: string;
    name: string;
    role: UserRole;
    total_tasks: number;
    in_progress: number;
    todo: number;
    done: number;
  }[];
  completion: {
    id: string;
    name: string;
    total: number;
    done: number;
    rate: number;
  }[];
}
