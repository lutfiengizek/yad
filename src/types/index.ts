export interface Volume {
  id: string;
  name: string;
  path: string;
  isConnected: boolean;
  isWorkspaceRoot: boolean;
}

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  volumeId: string;
  isDirectory: boolean;
  size?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  type: "person" | "time" | "event" | "place" | "free";
  color?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  organization?: string;
  avatarUrl?: string;
}

export type AppError = {
  type: string;
  message: string;
};
