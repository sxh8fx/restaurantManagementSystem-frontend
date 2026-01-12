import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ReservationService from "../services/reservation.service";
import api from "../services/api"; // Need generic api for tables if not in service
import "../styles/Reservation.css";

const ReservationPage = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState("");
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [message, setMessage] = useState("");

    // Calculate next 3 days
    const dates = [...Array(3)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    useEffect(() => {
        ReservationService.getAllSlots().then(res => setSlots(res.data));
        // Fetch tables (Assuming public/user endpoint)
        // Ideally we filter tables by availability for the slot, but for now fetch all
        // Backend logic: "Table availability updates in real time".
        // Here we just fetch static list for UI layout first
        api.get("/tables").then(res => setTables(res.data));
    }, []);

    const handleReserve = async () => {
        if (!selectedTable || !selectedSlot || !date) {
            setMessage("Please select date, time, and table.");
            return;
        }
        try {
            await ReservationService.makeReservation(selectedTable, selectedSlot, date);
            setMessage("Reservation Confirmed! Redirecting to menu to order food...");
            setTimeout(() => {
                navigate("/menu");
            }, 2000);
        } catch (err) {
            setMessage("Failed: " + (err.response?.data?.message || err.message));
        }
    };

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <h2 className="page-hero-title">Book a Table</h2>
                {message && <div className="alert-info">{message}</div>}

                <div className="reservation-layout">
                    <div className="controls glass-card">
                        <div className="form-group">
                            <label>Select Date</label>
                            <select onChange={(e) => setDate(e.target.value)} value={date}>
                                <option value="">Choose Date</option>
                                {dates.map(d => (
                                    <option key={d} value={d}>
                                        {d.split('-').reverse().join('-')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Select Time Slot</label>
                            <div className="slot-sections">
                                {(() => {
                                    // 1. Filter valid slots (future check)
                                    const validSlots = slots.filter(slot => {
                                        if (!date) return true;
                                        const today = new Date();
                                        const selectedDate = new Date(date);
                                        const isToday = selectedDate.getDate() === today.getDate() &&
                                            selectedDate.getMonth() === today.getMonth() &&
                                            selectedDate.getFullYear() === today.getFullYear();

                                        if (isToday) {
                                            const [hours, minutes] = slot.startTime.split(':');
                                            const slotTime = new Date();
                                            slotTime.setHours(parseInt(hours), parseInt(minutes), 0);
                                            return slotTime > today;
                                        }
                                        return true;
                                    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

                                    // 2. Helper to render a list of slots
                                    const renderSlotGrid = (pSlots) => (
                                        <div className="slot-grid">
                                            {pSlots.map(slot => {
                                                const formatTime = (time) => {
                                                    if (!time) return "";
                                                    const [hours, minutes] = time.split(':');
                                                    const h = parseInt(hours, 10);
                                                    const ampm = h >= 12 ? 'PM' : 'AM';
                                                    const h12 = h % 12 || 12;
                                                    return `${h12}:${minutes} ${ampm}`;
                                                };
                                                return (
                                                    <button
                                                        key={slot.id}
                                                        className={`slot-btn ${selectedSlot === slot.id ? 'active' : ''}`}
                                                        onClick={() => setSelectedSlot(slot.id)}
                                                    >
                                                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );

                                    // 3. Group slots
                                    const breakfast = validSlots.filter(s => {
                                        const h = parseInt(s.startTime.split(':')[0], 10);
                                        return h >= 8 && h < 12;
                                    });
                                    const lunch = validSlots.filter(s => {
                                        const h = parseInt(s.startTime.split(':')[0], 10);
                                        return h >= 12 && h < 17;
                                    });
                                    const dinner = validSlots.filter(s => {
                                        const h = parseInt(s.startTime.split(':')[0], 10);
                                        return h >= 17;
                                    });

                                    return (
                                        <>
                                            {breakfast.length > 0 && (
                                                <div className="time-section">
                                                    <h4 style={{ color: '#fbbf24', marginTop: '10px', marginBottom: '5px' }}>Breakfast</h4>
                                                    {renderSlotGrid(breakfast)}
                                                </div>
                                            )}
                                            {lunch.length > 0 && (
                                                <div className="time-section">
                                                    <h4 style={{ color: '#fbbf24', marginTop: '10px', marginBottom: '5px' }}>Lunch</h4>
                                                    {renderSlotGrid(lunch)}
                                                </div>
                                            )}
                                            {dinner.length > 0 && (
                                                <div className="time-section">
                                                    <h4 style={{ color: '#fbbf24', marginTop: '10px', marginBottom: '5px' }}>Dinner</h4>
                                                    {renderSlotGrid(dinner)}
                                                </div>
                                            )}
                                            {validSlots.length === 0 && <p style={{ color: '#ccc', fontStyle: 'italic' }}>No slots available.</p>}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="tables-view glass-card">
                        <h3>Select a Table</h3>
                        <div className="tables-grid">
                            {tables.map(table => (
                                <button
                                    key={table.id}
                                    className={`table-btn seats-${table.capacity} ${selectedTable === table.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedTable(table.id)}
                                >
                                    <span className="table-num">{table.tableNumber}</span>
                                    <span className="table-cap">👤 {table.capacity}</span>
                                </button>
                            ))}
                        </div>
                        <div className="action-area">
                            <button className="primary-btn" onClick={handleReserve} disabled={!selectedTable}>
                                Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        </>
    );
};

export default ReservationPage;
