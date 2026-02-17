declare module 'asana' {
  interface ApiClientInstance {
    basePath: string;
    authentications: {
      token: {
        type: string;
        accessToken?: string;
      };
    };
  }

  interface ResponseWrapper<T> {
    data: T;
  }

  interface User {
    gid?: string;
    name?: string;
    email?: string;
    workspaces?: Array<{ gid?: string; name?: string }>;
  }

  interface UserTaskList {
    gid?: string;
  }

  interface Task {
    gid?: string;
    name?: string;
    notes?: string;
    html_notes?: string;
    completed?: boolean;
    completed_at?: string;
    due_on?: string;
    due_at?: string;
    assignee?: { gid?: string; name?: string; email?: string };
    projects?: Array<{ gid?: string; name?: string }>;
    tags?: Array<{ gid?: string; name?: string }>;
    permalink_url?: string;
    created_at?: string;
    modified_at?: string;
    memberships?: Array<{
      project?: { gid?: string; name?: string };
      section?: { gid?: string; name?: string };
    }>;
  }

  interface Project {
    gid?: string;
    name?: string;
    workspace?: { gid?: string; name?: string };
  }

  interface Section {
    gid?: string;
    name?: string;
  }

  interface EnumOption {
    gid?: string;
    name?: string;
  }

  interface CustomField {
    gid?: string;
    name?: string;
    resource_subtype?: string;
    enum_options?: EnumOption[];
  }

  interface CustomFieldSetting {
    custom_field?: CustomField;
  }

  export class UsersApi {
    getUser(userGid: string, opts?: Record<string, unknown>): Promise<ResponseWrapper<User>>;
  }

  export class TasksApi {
    getTask(taskGid: string, opts?: Record<string, unknown>): Promise<ResponseWrapper<Task>>;
    getTasksForUserTaskList(userTaskListGid: string, opts?: Record<string, unknown>): Promise<ResponseWrapper<Task[]>>;
    searchTasksForWorkspace(workspaceGid: string, opts?: Record<string, unknown>): Promise<ResponseWrapper<Task[]>>;
    createTask(body: { data: Record<string, unknown> }, opts?: Record<string, unknown>): Promise<ResponseWrapper<Task>>;
    updateTask(taskGid: string, body: { data: Record<string, unknown> }, opts?: Record<string, unknown>): Promise<ResponseWrapper<Task>>;
  }

  export class ProjectsApi {
    getProjects(opts?: Record<string, unknown>): Promise<ResponseWrapper<Project[]>>;
  }

  export class SectionsApi {
    getSectionsForProject(projectGid: string, opts?: Record<string, unknown>): Promise<ResponseWrapper<Section[]>>;
  }

  export class CustomFieldSettingsApi {
    getCustomFieldSettingsForProject(projectGid: string, opts?: Record<string, unknown>): Promise<ResponseWrapper<CustomFieldSetting[]>>;
  }

  export class StoriesApi {
    createStoryForTask(taskGid: string, body: { data: Record<string, unknown> }, opts?: Record<string, unknown>): Promise<ResponseWrapper<unknown>>;
  }

  export class UserTaskListsApi {
    getUserTaskListForUser(userGid: string, workspaceGid: string, opts?: Record<string, unknown>): Promise<ResponseWrapper<UserTaskList>>;
  }

  export const ApiClient: {
    instance: ApiClientInstance;
  };
}
