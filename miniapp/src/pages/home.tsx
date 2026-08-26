import React, { useEffect, useState } from "react";
import { Box, Header, Input, Page, Spinner, Text } from "zmp-ui";
import CategoryTabs from "../components/category-tabs";
import ListingCard from "../components/listing-card";
import { fetchListings } from "../services/listings";
import type { Listing, ListingCategory } from "../types/listing";

const HomePage: React.FC = () => {
  const [category, setCategory] = useState<ListingCategory | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchListings({ category: category === "all" ? undefined : category, searchText })
      .then((items) => {
        if (!cancelled) setListings(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Không tải được danh sách tin.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, searchText]);

  return (
    <Page style={{ background: "#f5f6fa" }}>
      <Header title="Chợ Vé" showBackIcon={false} />
      <Box style={{ padding: "8px 12px 0" }}>
        <Input.Search
          placeholder="Tìm sự kiện, sân bãi, địa điểm..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Box>
      <CategoryTabs value={category} onChange={setCategory} />
      <Box style={{ padding: "0 12px 24px" }}>
        {loading && (
          <Box style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <Spinner visible />
          </Box>
        )}
        {!loading && error && (
          <Text style={{ textAlign: "center", color: "#e6350f", padding: 24 }}>{error}</Text>
        )}
        {!loading && !error && listings.length === 0 && (
          <Text style={{ textAlign: "center", color: "#8a8a8e", padding: 24 }}>
            Chưa có tin đăng nào phù hợp.
          </Text>
        )}
        {!loading && !error && listings.map((item) => <ListingCard key={item.id} listing={item} />)}
      </Box>
    </Page>
  );
};

export default HomePage;
