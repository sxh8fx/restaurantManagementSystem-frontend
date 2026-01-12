import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Dashboard.css";

const UserDashboard = () => {
    const { currentUser } = useContext(AuthContext);

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <header className="dashboard-header user-header-centered">
                    <span className="welcome-text">Welcome back</span>
                    <h1 className="user-name">{currentUser.username}</h1>
                    <p className="hero-subtext">What would you like to do today?</p>
                </header>

                <div className="services-label">SERVICES</div>

                <div className="features-grid">
                    <Link to="/reserve" className="feature-card glass-card">
                        <div className="icon">📅</div>
                        <h3>Book a Table</h3>
                        <p>Reserve your spot for upcoming days.</p>
                    </Link>

                    <Link to="/menu" className="feature-card glass-card">
                        <div className="icon">🍔</div>
                        <h3>Order Food</h3>
                        <p>Browse our menu and place orders.</p>
                    </Link>

                    <Link to="/orders" className="feature-card glass-card">
                        <div className="icon">📦</div>
                        <h3>Track Orders</h3>
                        <p>Track status and view history.</p>
                    </Link>
                </div>

                <Footer />
            </div>
        </>
    );
};

export default UserDashboard;
