import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import MenuService from "../services/menu.service";
import TableService from "../services/table.service";
import "../styles/Admin.css";

import ReservationService from "../services/reservation.service"; // Import

const AdminDashboard = () => {
    const [view, setView] = useState(localStorage.getItem("adminView") || "orders"); // orders, menu, tables
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]); // Add state
    const [menuItems, setMenuItems] = useState([]);
    const [tables, setTables] = useState([]);

    // Forms
    const [newItem, setNewItem] = useState({ name: "", description: "", price: "", category: "", imageUrl: "", available: true });
    const [newTable, setNewTable] = useState({ tableNumber: "", capacity: "" });
    const [message, setMessage] = useState("");

    // Edit states
    const [editingMenuId, setEditingMenuId] = useState(null);
    const [editingMenu, setEditingMenu] = useState({});
    const [editingTableId, setEditingTableId] = useState(null);
    const [editingTable, setEditingTable] = useState({});

    // Fetch Data
    // This fetchData will now fetch all data for polling
    const fetchData = async () => {
        try {
            const ordersData = await api.get("/orders");
            setOrders(ordersData.data);

            // Fetch Reservations to map table/slots
            const reservationsData = await ReservationService.getAllReservations();
            setReservations(reservationsData);

            const menuData = await MenuService.getMenu(true); // Keep original menu fetch logic
            setMenuItems(menuData.data); // Assuming getMenu returns { data: [...] }
            const tablesData = await TableService.getAllTables();
            setTables(tablesData.data); // Assuming getAllTables returns { data: [...] }
        } catch (error) {
            console.error("Error fetching data:", error);
            setMessage("Error fetching data: " + (error.response?.data?.message || error.message));
            if (error.response && error.response.status === 401) {
                setMessage("Failed to fetch data: Unauthorized (401). Please login again.");
            }
        }
    };

    // Polling useEffect
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
        return () => clearInterval(interval); // Cleanup on unmount
    }, []); // Run once on mount

    // Existing useEffect for view changes (resetting states)
    useEffect(() => {
        localStorage.setItem("adminView", view); // Persist view state
        setMessage("");
        // Reset edit states when view changes
        setEditingMenuId(null);
        setEditingTableId(null);
    }, [view]);

    // Order Logic
    const updateStatus = async (orderId, status) => {
        await api.put(`/orders/${orderId}/status?status=${status}`);
        fetchData();
    };

    // Menu Logic
    const handleAddMenu = async (e) => {
        e.preventDefault();
        try {
            await MenuService.addMenuItem(newItem);
            setMessage("Item added successfully!");
            setNewItem({ name: "", description: "", price: "", category: "", imageUrl: "", available: true });
            fetchData();
        } catch (error) {
            console.error("Error adding item:", error);
            setMessage("Failed to add item. Check console for details.");
        }
    };

    const handleEditMenu = (item) => {
        setEditingMenuId(item.id);
        setEditingMenu({ ...item });
    };

    const handleSaveMenu = async () => {
        try {
            await MenuService.updateMenuItem(editingMenuId, editingMenu);
            setMessage("Item updated successfully!");
            setEditingMenuId(null);
            setEditingMenu({});
            fetchData();
        } catch (error) {
            console.error("Error updating item:", error);
            setMessage("Failed to update item.");
        }
    };

    const handleCancelMenuEdit = () => {
        setEditingMenuId(null);
        setEditingMenu({});
    };

    const handleDeleteMenu = async (id) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            try {
                await MenuService.deleteMenuItem(id);
                setMessage("Item deleted successfully!");
                fetchData();
            } catch (error) {
                console.error("Error deleting item:", error);
                setMessage("Failed to delete item: " + (error.response?.data?.message || error.message));
            }
        }
    };

    // Table Logic
    const handleAddTable = async (e) => {
        e.preventDefault();
        try {
            await TableService.addTable(newTable);
            setMessage("Table added successfully!");
            setNewTable({ tableNumber: "", capacity: "" });
            fetchData();
        } catch (error) {
            console.error("Error adding table:", error);
            setMessage("Failed to add table: " + (error.response?.data?.message || error.message));
        }
    };

    const handleEditTable = (table) => {
        setEditingTableId(table.id);
        setEditingTable({ ...table });
    };

    const handleSaveTable = async () => {
        try {
            await TableService.updateTable(editingTableId, editingTable);
            setMessage("Table updated successfully!");
            setEditingTableId(null);
            setEditingTable({});
            fetchData();
        } catch (error) {
            console.error("Error updating table:", error);
            setMessage("Failed to update table.");
        }
    };

    const handleCancelTableEdit = () => {
        setEditingTableId(null);
        setEditingTable({});
    };

    const handleDeleteTable = async (id) => {
        if (window.confirm("Are you sure you want to delete this table?")) {
            await TableService.deleteTable(id);
            setMessage("Table deleted successfully!");
            fetchData();
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
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

    // Helper: Categorize Orders
    const getOrderCategory = (order) => {
        if (order.status === "CANCELLED") {
            return "EXPIRED";
        }

        let isSlotExpired = false;
        const res = order.reservation;

        if (res && res.date && res.timeSlot?.endTime) {
            try {
                const [year, month, day] = res.date.split('-').map(Number);
                const slotDate = new Date(year, month - 1, day);
                const [h, m] = res.timeSlot.endTime.split(':').map(Number);
                const end = new Date(slotDate);
                end.setHours(h, m, 0, 0);

                if (new Date() > end) {
                    isSlotExpired = true;
                }
            } catch (e) { console.error("Date parse error", e); }
        }

        if (order.status === "SERVED" || order.status === "COMPLETED") {
            // Keep LIVE if slot is NOT expired (and slot exists)
            if (res && res.timeSlot && !isSlotExpired) {
                return "LIVE";
            }
            return "SERVED";
        }

        if (isSlotExpired) {
            const isStarted = order.status !== "ORDERED" && order.status !== "PLACED";
            if (!isStarted) return "EXPIRED";
        }
        return "LIVE";
    };

    const [searchQuery, setSearchQuery] = useState("");

    const liveOrders = orders.filter(o => getOrderCategory(o) === "LIVE").filter(order => {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toString().includes(query);
        const matchesUser = (order.user?.username || "").toLowerCase().includes(query);
        const matchesTable = (order.reservation?.table?.tableNumber?.toString() || "").includes(query);
        return matchesId || matchesUser || matchesTable;
    });
    const servedOrders = orders.filter(o => getOrderCategory(o) === "SERVED");
    const expiredOrders = orders.filter(o => getOrderCategory(o) === "EXPIRED");

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
        const tax = order.taxAmount || (subtotal * 0.05); // Use saved tax or fallback calculation
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
                        @media print {
                            body { margin: 0; padding: 0; }
                            button { display: none; }
                        }
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
        setTimeout(() => {
            printWindow.print();
            // printWindow.close(); // Optional: close automatically
        }, 500);
    };

    // Print Consolidated Session Bill Function
    const printConsolidatedBill = (currentOrder) => {
        if (!currentOrder.reservation) {
            alert("This order is not linked to a reservation (Walk-in). Cannot consolidate.");
            return;
        }
        const resId = currentOrder.reservation.id;

        // Find all orders for this reservation (Live, Served) - Exclude Cancelled
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

        // Use details from currentOrder (Assuming same user/slot for the session)
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
                        @media print {
                            body { margin: 0; padding: 0; }
                            button { display: none; }
                        }
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
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <h1>Admin Dashboard</h1>
                    <div className="admin-controls">
                        <button onClick={() => setView("orders")} className={view === "orders" ? "active" : ""}>Orders</button>
                        <button onClick={() => setView("menu")} className={view === "menu" ? "active" : ""}>Menu</button>
                        <button onClick={() => setView("tables")} className={view === "tables" ? "active" : ""}>Tables</button>
                    </div>
                </header>

                <div className="admin-content glass-card">
                    {message && <div className={message.includes("Failed") || message.includes("Error") ? "alert-error" : "alert-success"}>{message}</div>}

                    {view === "orders" && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h2>Live Kitchen Orders</h2>
                                <input
                                    type="text"
                                    placeholder="Search by ID, User, Table..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid #444',
                                        background: 'rgba(0,0,0,0.3)',
                                        color: 'white',
                                        width: '250px'
                                    }}
                                />
                            </div>
                            {liveOrders.length === 0 ? (
                                <p className="no-data">No active orders.</p>
                            ) : (
                                <div className="order-grid">
                                    {liveOrders.map(order => {
                                        // Improved formatting logic
                                        const res = order.reservation;
                                        const tableNumber = res?.table?.tableNumber || "Walk-in";

                                        // Format Date: YYYY-MM-DD -> DD-MM-YYYY
                                        const dateDisplay = res?.date ? res.date.split('-').reverse().join('-') : "";

                                        // Time & Restriction Logic
                                        let slotDisplay = "N/A";
                                        let canPrepare = true;
                                        let canServe = true;
                                        let timeMessage = "";

                                        if (res && res.date && res.timeSlot?.startTime && res.timeSlot?.endTime) {
                                            // 1. Construct Date objects for Start and End of the slot
                                            const [year, month, day] = res.date.split('-').map(Number);
                                            // Note: Month is 0-indexed in JS Date
                                            const slotDate = new Date(year, month - 1, day);

                                            // Helper to set time on the slotDate
                                            const setTime = (timeStr) => {
                                                const [h, m] = timeStr.split(':').map(Number);
                                                const d = new Date(slotDate);
                                                d.setHours(h, m, 0, 0);
                                                return d;
                                            };

                                            const start = setTime(res.timeSlot.startTime);
                                            const end = setTime(res.timeSlot.endTime);
                                            const now = new Date(); // Current Time

                                            // 2. Format Slot Display
                                            const fmt = (d) => {
                                                let h = d.getHours();
                                                const m = String(d.getMinutes()).padStart(2, '0');
                                                const ampm = h >= 12 ? 'PM' : 'AM';
                                                h = h % 12 || 12;
                                                return `${h}:${m} ${ampm}`;
                                            };
                                            slotDisplay = `${fmt(start)} - ${fmt(end)}`;

                                            // 3. Restriction Rules
                                            // Rule 1: Prepare allowed 30 mins before Start till End
                                            const prepareStart = new Date(start.getTime() - 30 * 60000); // 30 mins in ms

                                            if (now < prepareStart) {
                                                canPrepare = false;
                                                timeMessage = `Too early. Prepare starts at ${fmt(prepareStart)}.`;
                                            } else if (now > end) {
                                                // Check if order started
                                                const isStarted = order.status !== "ORDERED" && order.status !== "PLACED";
                                                if (!isStarted) {
                                                    // Expired only if NOT started
                                                    canPrepare = false;
                                                    canServe = false;
                                                    timeMessage = "Slot expired. Order cancelled.";
                                                }
                                            }

                                            // Rule 2: Serve allowed only WITHIN slot (Start to End)
                                            if (now < start) {
                                                canServe = false;
                                            }
                                        } else {
                                            timeMessage = "Walk-in / No specific slot restrictions.";
                                        }

                                        return (
                                            <div key={order.id} className="admin-order-card">
                                                <div className="card-header">
                                                    <span className="order-id">#{order.id}</span>
                                                    <span className={`status ${order.status}`}>{order.status}</span>
                                                </div>
                                                <div className="card-body">
                                                    <div className="info-row">
                                                        <strong>User:</strong> <span>{order.user?.username || 'Guest'}</span>
                                                    </div>
                                                    <div className="info-row">
                                                        <strong>Table:</strong> <span>🪑 {tableNumber}</span>
                                                    </div>
                                                    {res && (
                                                        <div className="info-row">
                                                            <strong>Slot:</strong> <span>📅 {dateDisplay} ⏰ {slotDisplay}</span>
                                                        </div>
                                                    )}
                                                    {timeMessage && (
                                                        <div className="info-row" style={{ color: canPrepare || canServe ? '#aaa' : '#ef4444', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                                            {timeMessage}
                                                        </div>
                                                    )}
                                                    <div className="items-list">
                                                        <strong>Items:</strong>
                                                        <ul>
                                                            {order.items.map((item, idx) => (
                                                                <li key={idx}>
                                                                    <span>{item.menuItem?.name}</span>
                                                                    <span>x {item.quantity}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                                <div className="card-footer">
                                                    <div className="total-amount">Total: ₹{order.totalAmount}</div>
                                                    <div className="actions">
                                                        <button
                                                            onClick={() => updateStatus(order.id, "PREPARING")}
                                                            className="action-btn prepare"
                                                            disabled={!canPrepare || (order.status !== "ORDERED" && order.status !== "PLACED")}
                                                            title={!canPrepare ? "Wait for 30 mins before slot" : "Mark as Preparing"}
                                                            style={{
                                                                opacity: (!canPrepare || (order.status !== "ORDERED" && order.status !== "PLACED")) ? 0.5 : 1,
                                                                cursor: (!canPrepare || (order.status !== "ORDERED" && order.status !== "PLACED")) ? 'not-allowed' : 'pointer',
                                                                backgroundColor: (!canPrepare && timeMessage.includes("expired")) ? '#ef4444' : undefined
                                                            }}
                                                        >
                                                            Prepare
                                                        </button>
                                                        <button
                                                            onClick={() => updateStatus(order.id, "SERVED")}
                                                            className="action-btn serve"
                                                            disabled={!canServe || order.status === "SERVED" || order.status === "COMPLETED"}
                                                            title={!canServe ? "Only allowed during time slot" : "Mark as Served"}
                                                            style={{
                                                                opacity: (!canServe || order.status === "SERVED" || order.status === "COMPLETED") ? 0.5 : 1,
                                                                cursor: (!canServe || order.status === "SERVED" || order.status === "COMPLETED") ? 'not-allowed' : 'pointer',
                                                                backgroundColor: (!canServe && timeMessage.includes("expired")) ? '#ef4444' : undefined
                                                            }}
                                                        >
                                                            Serve
                                                        </button>
                                                        {(order.status === "SERVED" || order.status === "COMPLETED") && (
                                                            <button
                                                                onClick={() => printBill(order)}
                                                                className="action-btn"
                                                                style={{ backgroundColor: '#fff', color: '#000', marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                                                title="Print Single Order Bill"
                                                            >
                                                                🖨️ Bill
                                                            </button>
                                                        )}
                                                        {(order.status === "SERVED" || order.status === "COMPLETED") && order.reservation && (
                                                            <button
                                                                onClick={() => printConsolidatedBill(order)}
                                                                className="action-btn"
                                                                style={{ backgroundColor: '#FFD700', color: '#000', marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                                title="Print Full Session Bill (All Orders)"
                                                            >
                                                                📑 Full Bill
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="history-container" style={{ marginTop: '40px', borderTop: '1px solid #444', paddingTop: '20px' }}>
                                {/* Served/Completed Section */}
                                <details className="history-section" style={{ marginBottom: '1rem' }}>
                                    <summary>View Served & Past Orders History ({servedOrders.length})</summary>
                                    <div className="orders-vertical-list" style={{ marginTop: '1rem', opacity: 0.9 }}>
                                        {servedOrders.length === 0 ? (
                                            <p className="no-data">No served past orders.</p>
                                        ) : (
                                            servedOrders.map(order => {
                                                const res = order.reservation;
                                                const tableNumber = res?.table?.tableNumber || "Walk-in";
                                                return (
                                                    <div key={order.id} className="admin-order-card past-order">
                                                        <div className="card-header">
                                                            <span className="order-id">#{order.id}</span>
                                                            <span className={`status ${order.status}`}>{order.status}</span>
                                                        </div>
                                                        <div className="card-body">
                                                            <div className="info-row">
                                                                <strong>User:</strong> <span>{order.user?.username || 'Guest'}</span>
                                                            </div>
                                                            <div className="info-row">
                                                                <strong>Table:</strong> <span>🪑 {tableNumber}</span>
                                                            </div>
                                                            {res && res.date && res.timeSlot && (
                                                                <div className="info-row">
                                                                    <strong>Slot:</strong> <span>📅 {res.date.split('-').reverse().join('-')} ⏰ {res.timeSlot.startTime} - {res.timeSlot.endTime}</span>
                                                                </div>
                                                            )}
                                                            <div className="items-list">
                                                                <ul>
                                                                    {order.items.map((item, idx) => (
                                                                        <li key={idx}>
                                                                            <span>{item.menuItem?.name}</span>
                                                                            <span>x {item.quantity}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                        <div className="card-footer">
                                                            <div className="total-amount">Total: ₹{order.totalAmount}</div>
                                                            <button
                                                                onClick={() => printBill(order)}
                                                                className="action-btn"
                                                                style={{ backgroundColor: '#fff', color: '#000', marginLeft: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                                                title="Print Single Order Bill"
                                                            >
                                                                🖨️ Print Bill
                                                            </button>
                                                            {order.reservation && (
                                                                <button
                                                                    onClick={() => printConsolidatedBill(order)}
                                                                    className="action-btn"
                                                                    style={{ backgroundColor: '#FFD700', color: '#000', marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                                    title="Print Full Session Bill"
                                                                >
                                                                    📑 Full Bill
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </details>

                                {/* Expired/Cancelled Section */}
                                <details className="history-section">
                                    <summary style={{ color: '#ef4444' }}>View Slot Expired / Cancelled Orders ({expiredOrders.length})</summary>
                                    <div className="orders-vertical-list" style={{ marginTop: '1rem', opacity: 0.8 }}>
                                        {expiredOrders.length === 0 ? (
                                            <p className="no-data">No expired or cancelled orders.</p>
                                        ) : (
                                            expiredOrders.map(order => {
                                                const res = order.reservation;
                                                const tableNumber = res?.table?.tableNumber || "Walk-in";
                                                return (
                                                    <div key={order.id} className="admin-order-card past-order" style={{ borderColor: '#ef4444' }}>
                                                        <div className="card-header">
                                                            <span className="order-id">#{order.id}</span>
                                                            <span className="status CANCELLED">EXPIRED</span>
                                                        </div>
                                                        <div className="card-body">
                                                            <div className="info-row">
                                                                <strong>User:</strong> <span>{order.user?.username || 'Guest'}</span>
                                                            </div>
                                                            <div className="info-row">
                                                                <strong>Table:</strong> <span>🪑 {tableNumber}</span>
                                                            </div>
                                                            {res && res.date && res.timeSlot && (
                                                                <div className="info-row">
                                                                    <strong>Slot:</strong> <span>📅 {res.date.split('-').reverse().join('-')} ⏰ {res.timeSlot.startTime} - {res.timeSlot.endTime}</span>
                                                                </div>
                                                            )}
                                                            <div className="info-row" style={{ color: '#ef4444', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                                                Slot time limit exceeded.
                                                            </div>
                                                            <div className="items-list">
                                                                <ul>
                                                                    {order.items.map((item, idx) => (
                                                                        <li key={idx}>
                                                                            <span>{item.menuItem?.name}</span>
                                                                            <span>x {item.quantity}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                        <div className="card-footer">
                                                            <div className="total-amount">Total: ₹{order.totalAmount}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </details>
                            </div>
                        </div>
                    )}

                    {/* MENU VIEW */}
                    {view === "menu" && (
                        <div>
                            <h2>Manage Menu</h2>
                            <form className="admin-form" onSubmit={handleAddMenu}>
                                <input placeholder="Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
                                <input placeholder="Description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} required />
                                <input type="number" step="0.01" placeholder="Price" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} required />
                                <select
                                    value={newItem.category}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                    required
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">Select Category</option>
                                    <option value="Starters">Starters</option>
                                    <option value="Main Course">Main Course</option>
                                    <option value="Rice & Biriyani">Rice & Biriyani</option>
                                    <option value="Breads">Breads</option>
                                    <option value="Sides">Sides</option>
                                    <option value="Drinks">Drinks</option>
                                    <option value="Deserts">Deserts</option>
                                    <option value="Water">Water</option>
                                </select>
                                <input placeholder="Image URL" value={newItem.imageUrl} onChange={e => setNewItem({ ...newItem, imageUrl: e.target.value })} />
                                <button type="submit" className="primary-btn">Add Item</button>
                            </form>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Price</th>
                                        <th>Category</th>
                                        <th>Image</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {menuItems.map(item => (
                                        <tr key={item.id}>
                                            {editingMenuId === item.id ? (
                                                <>
                                                    <td>{item.id}</td>
                                                    <td><input value={editingMenu.name} onChange={e => setEditingMenu({ ...editingMenu, name: e.target.value })} /></td>
                                                    <td><input value={editingMenu.description} onChange={e => setEditingMenu({ ...editingMenu, description: e.target.value })} /></td>
                                                    <td><input type="number" step="0.01" value={editingMenu.price} onChange={e => setEditingMenu({ ...editingMenu, price: e.target.value })} /></td>
                                                    <td>
                                                        <select
                                                            value={editingMenu.category}
                                                            onChange={e => setEditingMenu({ ...editingMenu, category: e.target.value })}
                                                            style={{
                                                                background: 'rgba(0, 0, 0, 0.2)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                color: 'white',
                                                                padding: '0.5rem',
                                                                borderRadius: '4px'
                                                            }}
                                                        >
                                                            <option value="Starters">Starters</option>
                                                            <option value="Main Course">Main Course</option>
                                                            <option value="Rice & Biriyani">Rice & Biriyani</option>
                                                            <option value="Breads">Breads</option>
                                                            <option value="Sides">Sides</option>
                                                            <option value="Drinks">Drinks</option>
                                                            <option value="Deserts">Deserts</option>
                                                            <option value="Water">Water</option>
                                                        </select>
                                                    </td>
                                                    <td><input value={editingMenu.imageUrl || ''} onChange={e => setEditingMenu({ ...editingMenu, imageUrl: e.target.value })} /></td>
                                                    <td>
                                                        <button onClick={handleSaveMenu} className="action-btn save">Save</button>
                                                        <button onClick={handleCancelMenuEdit} className="action-btn cancel">Cancel</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>{item.id}</td>
                                                    <td>{item.name}</td>
                                                    <td className="description-cell">{item.description}</td>
                                                    <td>₹{item.price}</td>
                                                    <td>{item.category}</td>
                                                    <td>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="thumb" /> : '-'}</td>
                                                    <td>
                                                        <button onClick={() => handleEditMenu(item)} className="action-btn edit">Edit</button>
                                                        <button onClick={() => handleDeleteMenu(item.id)} className="action-btn danger">Delete</button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TABLES VIEW */}
                    {view === "tables" && (
                        <div>
                            <h2>Manage Tables</h2>
                            <form className="admin-form" onSubmit={handleAddTable}>
                                <input type="number" placeholder="Table Number" value={newTable.tableNumber} onChange={e => setNewTable({ ...newTable, tableNumber: e.target.value })} required />
                                <input type="number" placeholder="Capacity" value={newTable.capacity} onChange={e => setNewTable({ ...newTable, capacity: e.target.value })} required />
                                <button type="submit" className="primary-btn">Add Table</button>
                            </form>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Table No</th>
                                        <th>Capacity</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tables.map(table => (
                                        <tr key={table.id}>
                                            {editingTableId === table.id ? (
                                                <>
                                                    <td>{table.id}</td>
                                                    <td><input type="number" value={editingTable.tableNumber} onChange={e => setEditingTable({ ...editingTable, tableNumber: e.target.value })} /></td>
                                                    <td><input type="number" value={editingTable.capacity} onChange={e => setEditingTable({ ...editingTable, capacity: e.target.value })} /></td>
                                                    <td>
                                                        <select value={editingTable.status} onChange={e => setEditingTable({ ...editingTable, status: e.target.value })}>
                                                            <option value="AVAILABLE">AVAILABLE</option>
                                                            <option value="OCCUPIED">OCCUPIED</option>
                                                            <option value="RESERVED">RESERVED</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <button onClick={handleSaveTable} className="action-btn save">Save</button>
                                                        <button onClick={handleCancelTableEdit} className="action-btn cancel">Cancel</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>{table.id}</td>
                                                    <td>{table.tableNumber}</td>
                                                    <td>{table.capacity}</td>
                                                    <td><span className={`status ${table.status}`}>{table.status}</span></td>
                                                    <td>
                                                        <button onClick={() => handleEditTable(table)} className="action-btn edit">Edit</button>
                                                        <button onClick={() => handleDeleteTable(table.id)} className="action-btn danger">Delete</button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;
