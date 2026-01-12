import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
    const { currentUser, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    React.useEffect(() => {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <nav className="navbar">
            <div className="nav-content">
                <div className="nav-brand">
                    <Link to={currentUser ? (currentUser.roles.includes("ROLE_ADMIN") ? "/admin" : "/dashboard") : "/"}>
                        🍽️ The Overlook Restaurant
                    </Link>
                </div>
                <div className="nav-links">

                    {currentUser ? (
                        <>
                            {!currentUser.roles.includes("ROLE_ADMIN") && (
                                <Link to="/dashboard">
                                    Dashboard
                                </Link>
                            )}
                            <button onClick={handleLogout} className="logout-btn">
                                Logout ({currentUser.username})
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/register" className="primary-btn">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
