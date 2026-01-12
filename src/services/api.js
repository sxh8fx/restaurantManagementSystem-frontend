import axios from "axios";

const API_URL = "https://restaurantmanagementsystem-backend.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.token) {
      console.log("Attaching token:", user.token.substring(0, 10) + "..."); // Debug log
      config.headers["Authorization"] = "Bearer " + user.token;
    } else {
      console.log("No token found in localStorage");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
