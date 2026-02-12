import { ApiError } from './signupApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let body: unknown;
        try {
            body = await response.json();
        } catch {
            // Response body is not JSON
        }
        throw new ApiError(response.status, response.statusText, body);
    }
    return response.json() as Promise<T>;
}

export interface LocationPinInput {
    locationId?: string;
    latitude?: number;
    longitude?: number;
    label?: string;
}

export interface RequestDeliveryInput {
    businessId: string;
    workspaceId: string;
    actorId: string;
    pickup: LocationPinInput;
    dropoff: LocationPinInput;
    recipientName: string;
    recipientPhone: string;
    itemId?: string;
    itemDescription?: string;
    scheduledPickupTime?: Date;
    declaredItemValue?: number;
    specialInstructions?: string;
    distanceKm?: number;
}

export interface RequestDeliveryResult {
    deliveryId: string;
    orderId: string;
    estimatedCharges: number;
    currency: string;
    matchingTriggered: boolean;
    assignedRiderId: string | null;
}

export async function requestDelivery(input: RequestDeliveryInput): Promise<RequestDeliveryResult> {
    const response = await fetch(`${API_BASE_URL}/deliveries/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    return handleResponse<RequestDeliveryResult>(response);
}
