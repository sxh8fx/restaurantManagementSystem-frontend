import api from "./api";

const getMenu = (all = false) => {
    return api.get(`/menu${all ? '?all=true' : ''}`);
};

const addMenuItem = (item) => {
    return api.post("/menu", item);
};

const updateMenuItem = (id, item) => {
    return api.put(`/menu/${id}`, item);
};

const deleteMenuItem = (id) => {
    return api.delete(`/menu/${id}`);
};

const MenuService = {
    getMenu,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem
};

export default MenuService;
