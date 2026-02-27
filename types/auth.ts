export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  username: string;
}

export interface SignupRequest {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'reader' | 'contributor' | 'admin';
  projects: string[];
}

export interface SignupResponse {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  projects: string[];
}

export interface Project {
  project_id: string;
  code_fonc: string;
  libelle_public: string;
  actif: boolean;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'reader' | 'contributor' | 'admin';
  projects: Project[];
}

export interface TokenResponse {
  access: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}