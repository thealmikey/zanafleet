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
