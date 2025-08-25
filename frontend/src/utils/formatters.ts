export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'time') {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: format,
  }).format(dateObj);
}

export function formatDateRange(checkIn: string, checkOut: string): string {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  return `${formatter.format(checkInDate)} - ${formatter.format(checkOutDate)}`;
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    pending: 'warning',
    confirmed: 'info',
    'checked_in': 'success',
    'checked_out': 'default',
    cancelled: 'error',
    paid: 'success',
    failed: 'error',
    refunded: 'warning',
  };
  
  return statusColors[status] || 'default';
}