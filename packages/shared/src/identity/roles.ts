export type ProfileRoleFlags = {
  isContractor: boolean;
  isProvider: boolean;
};

export type AuthContext = {
  roles: ProfileRoleFlags;
};

export function assertCanActAs(
  context: AuthContext,
  role: "contractor" | "provider"
): void {
  if (role === "contractor" && !context.roles.isContractor) {
    throw new Error("Missing contractor role");
  }
  if (role === "provider" && !context.roles.isProvider) {
    throw new Error("Missing provider role");
  }
}
