import {
  alertsMock,
  directorMetricsMock,
  portfolioTrendMock,
  productSplitMock,
  teamRowsMock,
  contactsDirectoryMock
} from '../data/mocks/dashboard.js';

export const getAlerts = () => alertsMock.map((item) => ({ ...item }));
export const getDirectorMetrics = () => directorMetricsMock.map((item) => ({ ...item }));
export const getPortfolioTrend = () => portfolioTrendMock.map((item) => ({ ...item }));
export const getProductSplit = () => productSplitMock.map((item) => ({ ...item }));
export const getTeamRows = () => teamRowsMock.map((item) => ({ ...item }));
export const getContactsDirectory = () => contactsDirectoryMock.map((item) => ({ ...item }));
