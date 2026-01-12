import React, { createContext, useState, useEffect } from "react";
import AuthService from "../services/auth.service";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(AuthService.getCurrentUser());

    useEffect(() => {
        // Optional: verify token validity here if needed
    }, []);

    const login = async (username, password) => {
        try {
            const data = await AuthService.login(username, password);
            setCurrentUser(data);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        AuthService.logout();
        setCurrentUser(undefined);
    };

    const register = async (username, email, password, fullName, role) => {
        return AuthService.register(username, email, password, fullName, role);
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};
