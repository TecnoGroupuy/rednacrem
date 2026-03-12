export const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export const maybeThrow = (condition, message) => {
  if (condition) {
    const error = new Error(message);
    error.isApiError = true;
    throw error;
  }
};

export const paginateArray = (items, page = 1, pageSize = 10) => {
  const total = items.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * safePageSize;
  return {
    items: items.slice(offset, offset + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages
  };
};
