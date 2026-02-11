const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface PlaceCustomerOrderInput {
    businessId: string;
    workspaceId: string;
    actorId: string;
    payerAccountId: string;
    payeeAccountId: string;
    items: Array<{
        itemId: string;
        description: string;
        price: number;
        quantity: number;
    }>;
    pickup: {
        locationId?: string;
        latitude?: number;
        longitude?: number;
        label?: string;
    };
    dropoff: {
        locationId?: string;
        latitude?: number;
        longitude?: number;
        label?: string;
    };
    recipientName: string;
    recipientPhone: string;
    paymentMethod: string;
}

export const placeCustomerOrder = async (input: PlaceCustomerOrderInput) => {
    const response = await fetch(`${API_URL}/orders/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return response.json();
};

export const getOrderHistory = async () => {
    const response = await fetch(`${API_URL}/orders`);
    return response.json();
};
