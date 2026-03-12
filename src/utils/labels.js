import { SALES_STATUS } from '../domain/salesStatus.js';
import { TICKET_STATUS } from '../domain/ticketStatus.js';
import { TICKET_TYPES } from '../domain/ticketTypes.js';
import { LOT_STATUS } from '../domain/lotStatus.js';

export const salesStatusLabel = (status) => SALES_STATUS[status]?.label || status;
export const ticketStatusLabel = (status) => TICKET_STATUS[status]?.label || status;
export const ticketTypeLabel = (type) => TICKET_TYPES[type]?.label || type;
export const lotStatusLabel = (status) => LOT_STATUS[status]?.label || status;
