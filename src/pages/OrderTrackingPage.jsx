import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import OrderService from "../services/order.service";
import ReservationService from "../services/reservation.service";
import AuthService from "../services/auth.service";
import "../styles/Admin.css";

// Helper Component structure - Defined before use for clarity
const OrderCard = ({ order, formatTime, getStatusColor, isHistory, onCancel, onPrint, onPrintFull }) => {
    // Correctly safely extract reservation details
    // order.reservation might be null if not linked
    const res = order.reservation;
    const tableNum = res?.table?.tableNumber || '?';
    const dateStr = res?.date || '';
    const slotStart = res?.timeSlot?.startTime || '';
    const slotEnd = res?.timeSlot?.endTime || '';

    // Cancellation Logic
    let canCancel = false;
    let timeMessage = "";

    if (!isHistory && (order.status === 'ORDERED' || order.status === 'PLACED')) {
        if (res && dateStr && slotStart) {
            // Parse Slot Start
            try {
                const [year, month, day] = dateStr.split('-').map(Number);
                const slotDate = new Date(year, month - 1, day);
                const [h, m] = slotStart.split(':').map(Number);
                const start = new Date(slotDate);
                start.setHours(h, m, 0, 0);

                // Prepare Start = 30 mins before Slot Start
                const prepareStart = new Date(start.getTime() - 30 * 60000);
                const now = new Date();

                if (now < prepareStart) {
                    canCancel = true;
                    timeMessage = `You can cancel until ${prepareStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else {
                    timeMessage = "Cancellation window closed (Preparation started)";
                }
            } catch (e) {
                console.error("Date parse error", e);
            }
        } else {
            // If no reservation (Walk-in), maybe allow cancel immediately? 
            // Promoting safer default: Only cancel if slot logic verified or implicit immediate cancel allowed.
            // User prompt implied specifically "uptil before preparation time".
            // For walk-ins, let's assume valid to cancel if status is ORDERED.
            canCancel = true;
        }
    }

    // Quick Slot Helper
    const formatSlot = (s, e) => {
        if (!s || !e) return '';
        const format = (t) => {
            const [h, m] = t.split(':');
            let hour = parseInt(h);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12 || 12;
            return `${hour}:${m} ${ampm}`;
        };
        return `${format(s)} - ${format(e)}`;
    };

    // Format Date: YYYY-MM-DD -> DD-MM-YYYY
    const formattedDate = dateStr ? dateStr.split('-').reverse().join('-') : '';

    return (
        <div className={`glass-card order-card ${isHistory ? 'slider-card' : ''}`} style={{ marginBottom: isHistory ? '0' : '1rem', padding: '1.5rem', marginRight: isHistory ? '0' : '0' }}>
            <div className="order-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'left' }}>
                    <h3 style={{ margin: 0, textAlign: 'left' }}>Order #{order.id}</h3>
                    <div className="order-reservation-info">
                        {res ? (
                            <>
                                <span className="res-pill">📅 {formattedDate}</span>
                                <span className="res-pill">⏰ {formatSlot(slotStart, slotEnd)}</span>
                                <span className="res-pill">🪑 Table {tableNum}</span>
                            </>
                        ) : (
                            <span className="res-pill">Walk-in / No Res</span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span
                        className="status-badge"
                        style={{
                            backgroundColor: getStatusColor(order.status),
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                        }}
                    >
                        {order.status}
                    </span>
                    {canCancel && (
                        <button
                            onClick={() => onCancel(order.id)}
                            style={{
                                background: 'transparent',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseOut={(e) => e.target.style.background = 'transparent'}
                        >
                            Cancel Order
                        </button>
                    )}
                </div>
            </div>
            {/* Info Message for Cancellation */}
            {!isHistory && (order.status === 'ORDERED' || order.status === 'PLACED') && (
                <div style={{ fontSize: '0.8rem', color: canCancel ? '#aaa' : '#aa7f7f', marginBottom: '0.5rem', fontStyle: 'italic', textAlign: 'right' }}>
                    {timeMessage}
                </div>
            )}

            <div className="order-items" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                {order.items && order.items.map(item => (
                    <div key={item.id} className="order-item-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span>{item.menuItem?.name || 'Unknown Item'} x {item.quantity}</span>
                        <span>₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                    </div>
                ))}
            </div>
            <div className="order-footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="order-total" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    Total: ₹{order.totalAmount?.toFixed(2) || '0.00'}
                </div>
                {(order.status === "SERVED" || order.status === "COMPLETED") && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => onPrint(order)}
                            style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                            title="Print Single Bill"
                        >
                            🖨️ Bill
                        </button>
                        {order.reservation && (
                            <button
                                onClick={() => onPrintFull(order)}
                                style={{ background: '#FFD700', color: '#000', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                title="Print Consolidated Session Bill"
                            >
                                📑 Full Bill
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const OrderTrackingPage = () => {
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentUser = AuthService.getCurrentUser();

    // Fetch initial state
    const fetchData = async () => {
        try {
            const [ordersRes, reservationsRes] = await Promise.all([
                OrderService.getMyOrders(),
                ReservationService.getMyReservations()
            ]);
            // Safely handle null/undefined data
            setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
            setReservations(Array.isArray(reservationsRes.data) ? reservationsRes.data : []);
            setError(null);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to fetch data: " + (err.response?.data?.message || err.message));
            setOrders([]); // Fallback to empty
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (window.confirm("Are you sure you want to cancel this order?")) {
            try {
                await OrderService.cancelOrder(orderId);
                fetchData(); // Refresh list
            } catch (err) {
                console.error("Cancel error", err);
                alert("Failed to cancel order: " + (err.response?.data?.message || err.message));
            }
        }
    };

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            setError("Please log in to view your orders");
            return;
        }

        fetchData();

        // Poll for updates every 10 seconds as a fallback
        const interval = setInterval(() => {
            OrderService.getMyOrders()
                .then(res => {
                    if (Array.isArray(res.data)) {
                        setOrders(res.data);
                    }
                })
                .catch(err => console.error("Poll error:", err));
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    // Helper to get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'ORDERED': return '#f59e0b';
            case 'PLACED': return '#f59e0b';
            case 'PREPARING': return '#3b82f6';
            case 'READY': return '#10b981';
            case 'SERVED': return '#10b981';
            case 'COMPLETED': return '#10b981';
            case 'CANCELLED': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return ""; // Guard
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "Invalid Date"; // Guard

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;

        return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
    };

    // Filter logic
    const now = new Date();
    const activeOrders = [];
    const pastOrders = [];

    // Safety check before processing
    const safeOrders = Array.isArray(orders) ? [...orders] : [];

    // Initial sort doesn't matter much as we will sort active/past separately

    // Sort logic helper
    const getDate = (order) => {
        if (order.reservation && order.reservation.date && order.reservation.timeSlot?.startTime) {
            const [year, month, day] = order.reservation.date.split('-').map(Number);
            const [h, m] = order.reservation.timeSlot.startTime.split(':').map(Number);
            return new Date(year, month - 1, day, h, m);
        }
        return new Date(order.createdAt);
    };

    safeOrders.forEach(order => {
        let isHistory = false;

        // If order has a reservation, check its time
        if (order.reservation) {
            const resDateStr = order.reservation.date;
            const endTimeStr = order.reservation.timeSlot?.endTime; // "HH:mm:ss"

            if (resDateStr && endTimeStr) {
                const [hours, minutes] = endTimeStr.split(':');
                const orderingEndTime = new Date(resDateStr);
                orderingEndTime.setHours(parseInt(hours), parseInt(minutes), 0);

                // If now is AFTER the reservation end time, it's history
                if (now > orderingEndTime) {
                    isHistory = true;
                }
            }
        } else {
            // Fallback for orders without direct reservation link
            if (['COMPLETED', 'SERVED', 'CANCELLED'].includes(order.status)) {
                isHistory = true;
            }
        }

        if (isHistory) {
            let finalOrder = order;
            // Mark outdated active orders as cancelled visually
            if (order.status === 'ORDERED' || order.status === 'PLACED') {
                finalOrder = { ...order, status: 'CANCELLED' };
            }
            pastOrders.push(finalOrder);
        } else {
            activeOrders.push(order);
        }
    });

    // Active Orders: Chronological (Earliest First)
    activeOrders.sort((a, b) => getDate(a) - getDate(b));

    // Past Orders: Reverse Chronological (Latest First - Latest on Left)
    pastOrders.sort((a, b) => getDate(b) - getDate(a));

    // Print Bill Function
    const printBill = (order) => {
        const res = order.reservation;
        const tableNumber = res?.table?.tableNumber || "Walk-in";
        const dateDisplay = res?.date ? res.date.split('-').reverse().join('-') : new Date().toLocaleDateString();
        let slotDisplay = "N/A";
        if (res && res.timeSlot) {
            slotDisplay = `${res.timeSlot.startTime} - ${res.timeSlot.endTime}`;
        }

        const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = order.taxAmount || (subtotal * 0.05);
        const total = order.totalAmount || (subtotal + tax);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Bill - Order #${order.id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 400px; margin: 0 auto; color: #000; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .logo svg { width: 50px; height: 50px; margin-bottom: 10px; }
                        h1 { font-size: 1.5rem; margin: 5px 0; text-transform: uppercase; }
                        .address { font-size: 0.8rem; margin-bottom: 5px; }
                        .meta { font-size: 0.9rem; margin-bottom: 15px; display: flex; justify-content: space-between; flex-wrap: wrap; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem; }
                        th, td { text-align: left; padding: 5px 0; border-bottom: 1px solid #eee; }
                        th { text-transform: uppercase; font-size: 0.8rem; }
                        .text-right { text-align: right; }
                        .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
                        .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .grand-total { font-weight: bold; font-size: 1.1rem; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 0.8rem; border-top: 1px dashed #000; padding-top: 10px; }
                        .tagline { font-style: italic; margin-top: 5px; font-size: 0.7rem; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                            </svg>
                        </div>
                        <h1>The Overlook Restaurant</h1>
                        <div class="address">333 E Wonderview Ave, Estes Park, CO 80517, United States</div>
                    </div>
                    <div class="meta">
                        <div><strong>Start Date:</strong> ${dateDisplay}</div>
                        <div><strong>Time:</strong> ${slotDisplay}</div>
                        <div style="width: 100%; margin-top: 5px;"><strong>Guest:</strong> ${order.user?.username || 'Guest'}</div>
                        <div style="width: 100%;"><strong>Order:</strong> #${order.id}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30px;">S.No</th>
                                <th>Item</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map((item, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${item.menuItem?.name}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">₹${item.price}</td>
                                    <td class="text-right">₹${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="totals">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>₹${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span>GST (5%):</span>
                            <span>₹${tax.toFixed(2)}</span>
                        </div>
                        <div class="total-row grand-total">
                            <span>Total:</span>
                            <span>₹${total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <div>Thank you for visiting The Overlook Restaurant</div>
                        <div class="tagline">Crafted experiences. Thoughtful dining.</div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    // Print Consolidated Bill Function
    const printConsolidatedBill = (currentOrder) => {
        if (!currentOrder.reservation) {
            alert("This order is not linked to a reservation. Cannot consolidate.");
            return;
        }
        const resId = currentOrder.reservation.id;

        // Find all my orders for this reservation (Live, Served) - Exclude Cancelled
        const sessionOrders = orders.filter(o =>
            o.reservation?.id === resId &&
            o.status !== "CANCELLED"
        );

        if (sessionOrders.length === 0) {
            alert("No valid orders found for this session.");
            return;
        }

        // Aggregate Items
        const aggregatedItems = {};
        sessionOrders.forEach(order => {
            order.items.forEach(item => {
                const itemId = item.menuItem.id;
                if (!aggregatedItems[itemId]) {
                    aggregatedItems[itemId] = {
                        name: item.menuItem.name,
                        price: item.price,
                        quantity: 0
                    };
                }
                aggregatedItems[itemId].quantity += item.quantity;
            });
        });

        const itemsList = Object.values(aggregatedItems);
        const subtotal = itemsList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        const res = currentOrder.reservation;
        const dateDisplay = res?.date ? res.date.split('-').reverse().join('-') : new Date().toLocaleDateString();
        let slotDisplay = "N/A";
        if (res && res.timeSlot) {
            slotDisplay = `${res.timeSlot.startTime} - ${res.timeSlot.endTime}`;
        }
        const tableNumber = res?.table?.tableNumber || "Walk-in";

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Consolidated Bill - Table ${tableNumber}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 400px; margin: 0 auto; color: #000; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .logo svg { width: 50px; height: 50px; margin-bottom: 10px; }
                        h1 { font-size: 1.5rem; margin: 5px 0; text-transform: uppercase; }
                        .address { font-size: 0.8rem; margin-bottom: 5px; }
                        .meta { font-size: 0.9rem; margin-bottom: 15px; display: flex; justify-content: space-between; flex-wrap: wrap; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem; }
                        th, td { text-align: left; padding: 5px 0; border-bottom: 1px solid #eee; }
                        th { text-transform: uppercase; font-size: 0.8rem; }
                        .text-right { text-align: right; }
                        .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
                        .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .grand-total { font-weight: bold; font-size: 1.1rem; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 0.8rem; border-top: 1px dashed #000; padding-top: 10px; }
                        .tagline { font-style: italic; margin-top: 5px; font-size: 0.7rem; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                            </svg>
                        </div>
                        <h1>The Overlook Restaurant</h1>
                        <div class="address">333 E Wonderview Ave, Estes Park, CO 80517, United States</div>
                    </div>
                    <div class="meta">
                        <div><strong>Start Date:</strong> ${dateDisplay}</div>
                        <div><strong>Time:</strong> ${slotDisplay}</div>
                        <div style="width: 100%; margin-top: 5px;"><strong>Guest:</strong> ${currentOrder.user?.username || 'Guest'}</div>
                        <div style="width: 100%;"><strong>Session Bill</strong> (Includes ${sessionOrders.length} Orders)</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30px;">S.No</th>
                                <th>Item</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList.map((item, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${item.name}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">₹${item.price}</td>
                                    <td class="text-right">₹${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="totals">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>₹${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span>GST (5%):</span>
                            <span>₹${tax.toFixed(2)}</span>
                        </div>
                        <div class="total-row grand-total">
                            <span>Total:</span>
                            <span>₹${total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <div>Thank you for visiting The Overlook Restaurant</div>
                        <div class="tagline">Crafted experiences. Thoughtful dining.</div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    if (!currentUser) {
        return (
            <>
                <Navbar />
                <div className="dashboard-container">
                    <div className="admin-content glass-card">
                        <h2 className="page-hero-title">Track Your Orders</h2>
                        <div className="alert-error">Please log in to view your orders</div>
                    </div>
                </div>
            </>
        );
    }

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="dashboard-container">
                    <header className="dashboard-header">
                        <h1 className="page-hero-title">Track Your Orders</h1>
                    </header>
                    <div style={{ textAlign: "center", color: "white", padding: "2rem" }}>Loading orders...</div>
                    <Footer />
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <h1 className="page-hero-title">Track Your Orders</h1>
                </header>

                <div className="orders-content" style={{ maxWidth: '100%', margin: '0 auto', paddingBottom: "50px" }}>

                    {error && <div className="alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

                    {/* ACTIVE ORDERS SECTION */}
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div className="section-header" style={{ marginBottom: "20px", marginTop: "20px", borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                            <h2 style={{ color: "#4ade80", fontSize: "1.5rem" }}>Active Orders (Current Dining) ({activeOrders.length})</h2>
                        </div>

                        {activeOrders.length === 0 ? (
                            <p className="no-data" style={{ textAlign: "center", fontStyle: "italic", color: "#888", marginBottom: "40px" }}>
                                No active dining orders.
                            </p>
                        ) : (
                            <div className="orders-list">
                                {activeOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        formatTime={formatTime}
                                        getStatusColor={getStatusColor}
                                        isHistory={false}
                                        onCancel={handleCancelOrder}
                                        onPrint={printBill}
                                        onPrintFull={printConsolidatedBill}
                                    />
                                ))}
                            </div>
                        )}
                    </div>


                    {/* HISTORY SECTION (SLIDER) */}
                    <div style={{ maxWidth: '900px', margin: '60px auto 0 auto' }}>
                        <div className="section-header" style={{ marginBottom: "20px", borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                            <h2 style={{ color: "#ccc", fontSize: "1.5rem" }}>Order History ({pastOrders.length})</h2>
                        </div>

                        {pastOrders.length === 0 ? (
                            <p className="no-data" style={{ textAlign: "center", fontStyle: "italic", color: "#888" }}>
                                No past orders.
                            </p>
                        ) : (
                            /* Slider Container */
                            <div className="orders-slider" style={{ paddingBottom: '1rem', marginLeft: '-1rem', marginRight: '-1rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                                {pastOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        formatTime={formatTime}
                                        getStatusColor={getStatusColor}
                                        isHistory={true}
                                        onPrint={printBill}
                                        onPrintFull={printConsolidatedBill}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <Footer />
            </div>
        </>
    );
};

export default OrderTrackingPage;

