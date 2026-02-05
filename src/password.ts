// This file stores the generated Peernet password securely in localStorage
export function getOrCreatePassword(): string {
  const key = "peernet-password";
  let password = localStorage.getItem(key);
  if (!password) {
    password = crypto
      .getRandomValues(new Uint8Array(16))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
    localStorage.setItem(key, password);
  }
  return password;
}
