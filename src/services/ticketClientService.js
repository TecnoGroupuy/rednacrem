import { getApiClient } from './apiClient.js';
import { listTickets } from './ticketsService.js';

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

export const listTicketsByClientId = async (clientId) => {
  if (!clientId) return [];
  if (!hasApiConfigured()) {
    return listTickets().filter((ticket) => String(ticket.clientId) === String(clientId));
  }
  const response = await api.get(`/tickets/by-client/${clientId}`);
  const items = response?.items || response?.data || response || [];
  return Array.isArray(items) ? items : [];
};
