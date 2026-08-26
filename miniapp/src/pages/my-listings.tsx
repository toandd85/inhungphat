import React, { useEffect, useState } from "react";
import { Box, Button, Header, Page, Spinner, Text, useSnackbar } from "zmp-ui";
import { ensureSignedIn } from "../services/auth";
import { deleteListing, fetchMyListings, updateListingStatus } from "../services/listings";
import { CATEGORY_LABEL, type Listing } from "../types/listing";
import { formatEventDate, formatPrice } from "../utils/format";

const MyListingsPage: React.FC = () => {
  const { openSnackbar } = useSnackbar();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await ensureSignedIn();
      const items = await fetchMyListings(profile.uid);
      setListings(items);
    } catch (err: any) {
      setError(err?.message ?? "Không tải được tin của bạn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkSold = async (id: string) => {
    await updateListingStatus(id, "sold");
    openSnackbar({ text: "Đã đánh dấu bán hết.", type: "success" });
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteListing(id);
    openSnackbar({ text: "Đã xoá tin.", type: "success" });
    load();
  };

  return (
    <Page style={{ background: "#f5f6fa" }}>
      <Header title="Tin của tôi" showBackIcon={false} />
      <Box style={{ padding: 12 }}>
        {loading && (
          <Box style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <Spinner visible />
          </Box>
        )}
        {!loading && error && <Text style={{ textAlign: "center", color: "#e6350f" }}>{error}</Text>}
        {!loading && !error && listings.length === 0 && (
          <Text style={{ textAlign: "center", color: "#8a8a8e", padding: 24 }}>
            Bạn chưa đăng tin nào.
          </Text>
        )}
        {!loading &&
          !error &&
          listings.map((item) => (
            <Box
              key={item.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <Text size="xSmall" style={{ color: "#0068ff", fontWeight: 600 }}>
                {CATEGORY_LABEL[item.category]} · {item.status === "sold" ? "Đã hết" : "Đang đăng"}
              </Text>
              <Text.Title size="small" style={{ margin: "4px 0" }}>
                {item.title}
              </Text.Title>
              <Text size="xSmall" style={{ color: "#8a8a8e" }}>
                {formatEventDate(item.eventDate)}
              </Text>
              <Text style={{ fontWeight: 600, color: "#e6350f", margin: "4px 0 8px" }}>
                {item.kind === "exchange" ? "Trao đổi" : formatPrice(item.price)}
              </Text>
              <Box style={{ display: "flex", gap: 8 }}>
                {item.status !== "sold" && (
                  <Button size="small" variant="secondary" onClick={() => handleMarkSold(item.id)}>
                    Đánh dấu đã bán
                  </Button>
                )}
                <Button size="small" variant="tertiary" onClick={() => handleDelete(item.id)}>
                  Xoá tin
                </Button>
              </Box>
            </Box>
          ))}
      </Box>
    </Page>
  );
};

export default MyListingsPage;
