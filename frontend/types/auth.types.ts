import type { UserRole } from "@enums/index";

export interface AuthUser {
  name: string;
  email: string;
  /**
   * What the account may reach. Separate from `title`, which is only a label —
   * authorisation must never depend on a string someone might reword.
   */
  role: UserRole;
  /** Display label under the name: "Administrator", "Courier". */
  title: string;
  /** Present only for a courier; the id their deliveries are scoped to. */
  courierId?: string;
  terminalId?: string;
}

export interface Credentials {
  email: string;
  password: string;
}
