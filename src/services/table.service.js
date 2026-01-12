import api from "./api";

const getAllTables = () => {
    return api.get("/tables");
};

const addTable = (table) => {
    return api.post("/tables", table);
};

const updateTable = (id, table) => {
    return api.put(`/tables/${id}`, table);
};

const deleteTable = (id) => {
    return api.delete(`/tables/${id}`);
};

const TableService = {
    getAllTables,
    addTable,
    updateTable,
    deleteTable
};

export default TableService;
