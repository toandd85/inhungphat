import React from "react";
import { CATEGORY_LABEL, type ListingCategory } from "../types/listing";

const ALL = "all" as const;

const CategoryTabs: React.FC<{
  value: ListingCategory | typeof ALL;
  onChange: (value: ListingCategory | typeof ALL) => void;
}> = ({ value, onChange }) => {
  const options: Array<{ key: ListingCategory | typeof ALL; label: string }> = [
    { key: ALL, label: "Tất cả" },
    ...(Object.keys(CATEGORY_LABEL) as ListingCategory[]).map((key) => ({
      key,
      label: CATEGORY_LABEL[key],
    })),
  ];

  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 12px" }}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              background: active ? "#0068ff" : "#eef1f5",
              color: active ? "#fff" : "#333",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
