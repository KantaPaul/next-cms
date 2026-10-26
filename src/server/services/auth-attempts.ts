/** R276 fills these in. They stay empty so password login has one call site and no lockout table. */
export async function recordAuthAttempt(_input: {
  email?: string;
  success: boolean;
}) {}

export async function clearAuthAttempts(_input: { email?: string }) {}
