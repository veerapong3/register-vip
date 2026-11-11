export function getAdminUsername() {
  return (process.env.ADMIN_USERNAME || "admin").trim();
}

export function checkAdmin(req: Request) {
  const expectedUser = getAdminUsername();
  const expectedPass = process.env.ADMIN_PASSWORD?.trim();
  if (!expectedUser || !expectedPass) return false;

  const user = req.headers.get("x-admin-user")?.trim() || "";
  const pass = req.headers.get("x-admin-password")?.trim() || "";
  return user === expectedUser && pass === expectedPass;
}
