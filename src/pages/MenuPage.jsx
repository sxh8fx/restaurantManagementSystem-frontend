import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import MenuService from "../services/menu.service";
import OrderService from "../services/order.service";
import ReservationService from "../services/reservation.service";
import Footer from "../components/Footer";
import "../styles/Menu.css";

const MenuPage = () => {
    const [menu, setMenu] = useState([]);
    const [cart, setCart] = useState({}); // { itemId: quantity }
    const [message, setMessage] = useState("");
    const [existingOrders, setExistingOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [selectedReservationId, setSelectedReservationId] = useState("");

    useEffect(() => {
        MenuService.getMenu().then(res => setMenu(res.data));
        // Fetch existing orders
        OrderService.getMyOrders().then(res => setExistingOrders(res.data)).catch(() => { });
        // Fetch    useEffect(() => {
        ReservationService.getMyReservations().then(res => {
            const allReservations = res.data;
            const now = new Date();

            let validReservations = [];

            allReservations.forEach(r => {
                const resDate = r.date;
                const startTime = r.timeSlot?.startTime;
                const endTime = r.timeSlot?.endTime;

                if (!resDate || !startTime || !endTime) return;

                const startDateTime = new Date(`${resDate}T${startTime}`);
                const endDateTime = new Date(`${resDate}T${endTime}`);

                // Check if Active
                if (now >= startDateTime && now <= endDateTime) {
                    validReservations.push({ ...r, isActive: true });
                }
                // Check if Future
                else if (startDateTime > now) {
                    validReservations.push({ ...r, isActive: false });
                }
            });

            // Sort ALL valid reservations chronologically
            validReservations.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.timeSlot.startTime}`);
                const dateB = new Date(`${b.date}T${b.timeSlot.startTime}`);
                return dateA - dateB;
            });

            setReservations(validReservations);

            // Auto-select the first one (Active or Nearest Future)
            if (validReservations.length > 0) {
                setSelectedReservationId(validReservations[0].id);
            }
        }).catch(err => {
            console.error("Failed to fetch reservations", err);
        });
    }, []);

    const addToCart = (id) => {
        setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    };

    const removeFromCart = (id) => {
        setCart(prev => {
            const next = { ...prev };
            if (next[id] > 1) next[id]--;
            else delete next[id];
            return next;
        });
    };

    const placeOrder = async () => {
        const items = Object.entries(cart).map(([id, qty]) => ({
            menuItemId: parseInt(id),
            quantity: qty
        }));

        if (items.length === 0) return;

        if (!selectedReservationId) {
            setMessage("Please select a reservation table for your order.");
            return;
        }

        try {
            // Updated to pass reservationId
            const response = await OrderService.createOrder(items, selectedReservationId);
            setMessage("Order placed successfully! Track it in 'Orders'.");
            setCart({});
            // Refresh existing orders to show the new order
            OrderService.getMyOrders().then(res => setExistingOrders(res.data)).catch(() => { });
        } catch (err) {
            console.error("Order placement failed:", err);
            setMessage("Failed to place order. " + (err.response?.data?.message || err.message));
        }
    };

    const getCartTotals = () => {
        let subtotal = 0;
        Object.entries(cart).forEach(([id, qty]) => {
            const item = menu.find(i => i.id === parseInt(id));
            if (item) subtotal += item.price * qty;
        });
        const tax = subtotal * 0.05;
        const total = subtotal + tax;
        return { subtotal, tax, total };
    };

    // Helper to get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'ORDERED': return '#f59e0b';
            case 'PREPARING': return '#3b82f6';
            case 'SERVED': return '#10b981';
            case 'COMPLETED': return '#10b981';
            case 'CANCELLED': return '#ef4444';
            default: return '#ffffff';
        }
    };

    const formatTime = (time) => {
        if (!time) return "";
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        // dateString is "YYYY-MM-DD", we want "DD-MM-YYYY"
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
    };

    const [selectedCategory, setSelectedCategory] = useState("All");

    const categories = ["All", "Starters", "Main Course", "Rice & Biriyani", "Breads", "Sides", "Drinks", "Deserts", "Water"];

    const filteredMenu = selectedCategory === "All"
        ? menu
        : menu.filter(item => item.category === selectedCategory);

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <h2 className="page-hero-title">Our Menu</h2>
                {message && <div className={message.includes("Failed") || message.includes("Please select") ? "alert-error" : "alert-success"}>{message}</div>}

                {/* Show existing orders at the top if any */}
                {existingOrders.length > 0 && (
                    <div className="existing-orders-section">
                        <div className="orders-header">
                            <h3>📋 Your Current Orders</h3>
                            <Link to="/orders" className="view-all-link">View All →</Link>
                        </div>
                        <div className="existing-orders-grid">
                            {existingOrders.slice(0, 3).map(order => (
                                <div key={order.id} className="mini-order-card glass-card">
                                    <div className="mini-order-header">
                                        <span className="order-id">Order #{order.id}</span>
                                        <span
                                            className="status-badge"
                                            style={{ backgroundColor: getStatusColor(order.status) }}
                                        >
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="mini-order-items">
                                        {order.items.slice(0, 3).map(item => (
                                            <span key={item.id} className="mini-item">
                                                {item.menuItem?.name || 'Item'} x{item.quantity}
                                            </span>
                                        ))}
                                        {order.items.length > 3 && (
                                            <span className="more-items">+{order.items.length - 3} more</span>
                                        )}
                                    </div>
                                    <div className="mini-order-total">
                                        Total: ₹{order.totalAmount?.toFixed(2) || '0.00'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="category-scroll-container" style={{ padding: '0 1rem 1rem 1rem', overflowX: 'auto', whiteSpace: 'nowrap', maxWidth: '1200px', margin: '0 auto' }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                                display: 'inline-block',
                                padding: '0.5rem 1.2rem',
                                margin: '0 0.5rem',
                                borderRadius: '9999px',
                                border: '1px solid ' + (selectedCategory === cat ? '#f59e0b' : 'rgba(255,255,255,0.2)'),
                                backgroundColor: selectedCategory === cat ? '#f59e0b' : 'rgba(0,0,0,0.3)',
                                color: selectedCategory === cat ? 'black' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: selectedCategory === cat ? 'bold' : 'normal',
                                fontSize: '0.9rem'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="menu-layout">
                    <div className="menu-grid">
                        {filteredMenu.map(item => (
                            <div key={item.id} className="menu-card glass-card">
                                <img src={item.imageUrl || "https://placehold.co/300?text=No+Image"} alt={item.name} className="menu-image" />
                                <h3>{item.name}</h3>
                                <p>{item.description}</p>
                                <div className="price">₹{item.price}</div>
                                <button className="add-btn" onClick={() => addToCart(item.id)}>
                                    Add to Cart
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="cart-panel glass-card">
                        <h3>Your Order</h3>
                        {Object.keys(cart).length === 0 ? <p>Cart is empty</p> : (
                            <>
                                <ul className="cart-list">
                                    {Object.entries(cart).map(([id, qty]) => {
                                        const item = menu.find(i => i.id === parseInt(id));
                                        return item ? (
                                            <li key={id}>
                                                <span>{item.name} x {qty}</span>
                                                <div className="cart-controls">
                                                    <button onClick={() => removeFromCart(id)}>-</button>
                                                    <button onClick={() => addToCart(id)}>+</button>
                                                </div>
                                            </li>
                                        ) : null;
                                    })}
                                </ul>

                                <div className="reservation-selector" style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>Select Table / Time:</label>
                                    <select
                                        value={selectedReservationId}
                                        onChange={(e) => setSelectedReservationId(e.target.value)}
                                        style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
                                    >
                                        {reservations.length === 0 && <option value="" disabled style={{ color: "black" }}>No upcoming reservations</option>}

                                        {reservations.map(res => (
                                            <option
                                                key={res.id}
                                                value={res.id}
                                                style={{
                                                    fontWeight: res.isActive ? 'bold' : 'normal',
                                                    color: res.isActive ? '#4ade80' : '#facc15',
                                                    backgroundColor: '#1f2937'
                                                }}
                                            >
                                                {formatDate(res.date)} | {formatTime(res.timeSlot?.startTime)} | Table {res.table?.tableNumber}
                                            </option>
                                        ))}
                                    </select>
                                    {reservations.length === 0 && (
                                        <div style={{ fontSize: "0.8rem", color: "#fca5a5", marginTop: "4px" }}>
                                            * You must book a table before ordering. <Link to="/reserve" style={{ color: "#fff", textDecoration: "underline" }}>Book Now</Link>
                                        </div>
                                    )}
                                </div>

                                <div className="cart-summary" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ccc' }}>
                                        <span>Subtotal</span>
                                        <span>₹{getCartTotals().subtotal.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ccc' }}>
                                        <span>GST (5%)</span>
                                        <span>₹{getCartTotals().tax.toFixed(2)}</span>
                                    </div>
                                    <div className="cart-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: '#4ade80', marginTop: '0.5rem' }}>
                                        <span>Total</span>
                                        <span>₹{getCartTotals().total.toFixed(2)}</span>
                                    </div>
                                </div>
                                <button className="primary-btn full-width" onClick={placeOrder}>
                                    Place Order
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default MenuPage;
