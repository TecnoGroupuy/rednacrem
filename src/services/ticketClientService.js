// GET /tickets/by-client/:id no existe en el backend (ni una coincidencia
// en index.mjs) -- esto pegaba 404 para CUALQUIER rol que abriera la ficha
// de un cliente en ClientsView, desde siempre, no solo backoffice (hallazgo
// de la auditoría "rol backoffice" 2026-10). ticketsService.js ya tiene
// una versión que sí funciona (GET /manual-tickets?clienteId=..., mapeada
// con mapBackendManualTicket + hydrateTicketsWithDirectory) -- se delega
// ahí en vez de duplicar esa lógica de mapeo.
export { listTicketsByClientId } from './ticketsService.js';
