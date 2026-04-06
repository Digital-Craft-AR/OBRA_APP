import { cn } from "../ui/utils";

type ProductStatus = "ready" | "generating" | "error";

export type Product = {
  id:     string;
  label:  string;
  type:   "ebook" | "bonus" | "bump";
  status: ProductStatus;
};

interface ProductSidebarProps {
  products:       Product[];
  selectedId:     string;
  onSelectProduct: (productId: string) => void;
}

/* ── Status dot ─────────────────────────────────────────────────────────── */
function StatusDot({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn(
        "size-1.5 rounded-full shrink-0",
        status === "ready"      && "bg-obra-green-400",
        status === "generating" && "bg-obra-blue-100 animate-pulse",
        status === "error"      && "bg-red-400"
      )}
    />
  );
}

/* ── Product icon ───────────────────────────────────────────────────────── */
function ProductIcon({ type, active }: { type: Product["type"]; active: boolean }) {
  const color = active ? "#2D6499" : "#9CA3AF";

  if (type === "ebook") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
      </svg>
    );
  }

  if (type === "bonus") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
        <path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    );
  }

  // bump
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function ProductSidebar({ products, selectedId, onSelectProduct }: ProductSidebarProps) {
  return (
    <div className="w-16 shrink-0 border-r border-obra-blue-100 bg-obra-blue-50/40 flex flex-col items-center py-4 gap-2">
      {products.map((product) => {
        const isActive = product.id === selectedId;
        return (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product.id)}
            title={product.label}
            className={cn(
              "relative w-12 h-12 rounded-card border flex items-center justify-center transition-all group",
              isActive
                ? "bg-white border-obra-blue-700 shadow-sm"
                : "bg-white border-obra-blue-100 hover:border-obra-blue-300 hover:shadow-sm"
            )}
          >
            <ProductIcon type={product.type} active={isActive} />
            <div className="absolute -bottom-0.5 -right-0.5">
              <StatusDot status={product.status} />
            </div>

            {/* Tooltip on hover */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-obra-blue-950 text-white text-xs font-body rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {product.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
