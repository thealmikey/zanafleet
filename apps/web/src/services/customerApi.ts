const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface Customer {
    id: string;
    businessId: string;
    name: string;
    phoneNumber: string;
    email?: string;
}

export const searchCustomers = async (businessId: string, query: string): Promise<Customer[]> => {
    const response = await fetch(`${API_URL}/customers?businessId=${businessId}&query=${query}`);
    const body = await response.json();
    return body.data || [];
};

export const getCustomerActivity = async (businessId: string, customerId: string): Promise<any> => {
    const response = await fetch(`${API_URL}/customers/me/activity/${businessId}?customerId=${customerId}`);
    const body = await response.json();
    return body.data;
};

export const getBusinessAvailability = async (): Promise<any[]> => {
    const response = await fetch(`${API_URL}/customers/businesses/availability`);
    const body = await response.json();
    return body.data || [];
};

export const getShopperOrders = async (customerId: string): Promise<any[]> => {
    const response = await fetch(`${API_URL}/customers/me/orders?customerId=${customerId}`);
    const body = await response.json();
    return body.data || [];
};

export const getShopperInsights = async (customerId: string): Promise<any> => {
    const response = await fetch(`${API_URL}/customers/me/insights?customerId=${customerId}`);
    const body = await response.json();
    return body.data;
};
