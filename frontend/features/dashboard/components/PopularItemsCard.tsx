import { Card } from "@components/ui/cards";

/**
 * Static figures. Sales-per-item is not derivable from the mock data — orders
 * store lines, but nothing aggregates historical volume — so these are the
 * source app's placeholder numbers rather than a computed ranking.
 */
const POPULAR = [
  { name: "Belgian Chocolate Cake", sales: 142 },
  { name: "Red Velvet Pastry", sales: 98 },
  { name: "Artisan Sourdough Loaf", sales: 76 },
];

export function PopularItemsCard() {
  return (
    <Card>
      <h4 className="text-foreground mb-2 text-xs font-extrabold">
        Popular Items
      </h4>
      <div className="text-foreground-body space-y-1.5 text-xs">
        {POPULAR.map((item) => (
          <div
            key={item.name}
            className="border-border-subtle flex justify-between py-1 last:border-0 not-last:border-b"
          >
            <span className="text-foreground truncate pr-2 font-semibold">
              {item.name}
            </span>
            <span className="text-success-text shrink-0 font-bold">
              {item.sales} Sales
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
