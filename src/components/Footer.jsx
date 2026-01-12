import React from 'react';
import '../styles/Dashboard.css'; // Re-use the footer styles from Dashboard.css

const Footer = () => {
    return (
        <footer className="dashboard-footer">
            <div className="footer-divider"></div>
            <p>The Overlook Restaurant</p>
            <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Crafted experiences. Thoughtful dining.</p>
            <p className="footer-copy">© 2026 The Overlook Restaurant</p>
        </footer>
    );
};

export default Footer;
