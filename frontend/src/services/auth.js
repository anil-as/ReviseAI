// Save token
export const saveToken = (token) => {
  localStorage.setItem("token", token);
};

// Get token
export const getToken = () => {
  return localStorage.getItem("token");
};

// Remove token
export const logout = () => {
  localStorage.removeItem("token");
};
