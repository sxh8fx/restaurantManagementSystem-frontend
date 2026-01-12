import api from "./api";

const register = (username, email, password, fullName, role) => {
    return api.post("/auth/signup", {
        username,
        email,
        password,
        fullName,
        role
    });
};

const login = async (username, password) => {
    const response = await api.post("/auth/signin", {
        username,
        password,
    });

    if (response.data.token) {
        localStorage.setItem("user", JSON.stringify(response.data));
    }

    return response.data;
};

const logout = () => {
    localStorage.removeItem("user");
};

const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem("user"));
};

const AuthService = {
    register,
    login,
    logout,
    getCurrentUser,
};

export default AuthService;
