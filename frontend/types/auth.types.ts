export interface AuthUser {
  name: string;
  email: string;
  role: string;
  terminalId: string;
}

export interface Credentials {
  email: string;
  password: string;
}
