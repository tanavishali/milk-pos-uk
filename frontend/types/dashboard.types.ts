export interface DashboardMetrics {
  /** Goods billed, counted when the bill is raised. */
  grossProfit: number;
  /** Cash actually received. On a credit round this trails `grossProfit`. */
  collected: number;
  /** `grossProfit - collected` — what is still out with customers. */
  outstanding: number;
  totalOrders: number;
  totalCustomers: number;
  totalCouriers: number;
}
