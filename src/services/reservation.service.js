import api from "./api";

const getAllReservations = () => {
    return api.get("/reservations");
};

const getMyReservations = () => {
    return api.get("/reservations/my");
};

const getAllSlots = () => {
    return api.get("/reservations/slots");
};

const makeReservation = (tableId, timeSlotId, date) => {
    return api.post("/reservations", {
        tableId,
        timeSlotId,
        date
    });
};

const ReservationService = {
    getAllReservations,
    getMyReservations,
    getAllSlots,
    makeReservation
};

export default ReservationService;
