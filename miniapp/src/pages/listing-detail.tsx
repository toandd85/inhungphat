import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { openChat } from "zmp-sdk/apis";
import { Box, Button, Header, Page, Spinner, Text, useSnackbar } from "zmp-ui";
import { fetchListingById } from "../services/listings";
import { CATEGORY_LABEL, type Listing } from "../types/listing";
import { formatEventDate, formatPrice } from "../utils/format";

const ListingDetailPage: React.FC = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) return;
    fetchListingById(listingId)
      .then(setListing)
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleContact = async () => {
    if (!listing) return;
    try {
      await openChat({
        type: "user",
        id: listing.sellerZaloId,
        message: `Chào bạn, mình quan tâm tới tin "${listing.title}" trên Chợ Vé.`,
      });
    } catch (err) {
      openSnackbar({ text: "Không mở được Zalo Chat. Vui lòng thử lại.", type: "error" });
    }
  };

  return (
    <Page style={{ background: "#fff" }}>
      <Header title="Chi tiết tin" onBackClick={() => navigate(-1)} />
      {loading && (
        <Box style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Spinner visible />
        </Box>
      )}
      {!loading && !listing && (
        <Text style={{ textAlign: "center", padding: 32, color: "#8a8a8e" }}>
          Tin đăng không tồn tại hoặc đã bị gỡ.
        </Text>
      )}
      {!loading && listing && (
        <Box style={{ paddingBottom: 96 }}>
          <img
            src={listing.images[0] ?? "https://via.placeholder.com/400x240?text=V%C3%A9"}
            alt={listing.title}
            style={{ width: "100%", height: 220, objectFit: "cover" }}
          />
          <Box style={{ padding: 16 }}>
            <Text size="xSmall" style={{ color: "#0068ff", fontWeight: 600 }}>
              {CATEGORY_LABEL[listing.category]}
            </Text>
            <Text.Title style={{ margin: "6px 0" }}>{listing.title}</Text.Title>
            <Text style={{ fontSize: 20, fontWeight: 700, color: "#e6350f", marginBottom: 12 }}>
              {listing.kind === "exchange" ? "Trao đổi" : formatPrice(listing.price)}
            </Text>

            <InfoRow label="Thời gian sự kiện" value={formatEventDate(listing.eventDate)} />
            <InfoRow label="Địa điểm" value={`${listing.venue}, ${listing.city}`} />
            <InfoRow label="Số lượng" value={`${listing.quantity} vé`} />

            <Text style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{listing.description}</Text>

            <Box
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 20,
                padding: 12,
                background: "#f5f6fa",
                borderRadius: 10,
              }}
            >
              <img
                src={listing.sellerAvatar ?? "https://via.placeholder.com/40"}
                alt={listing.sellerName}
                style={{ width: 40, height: 40, borderRadius: "50%" }}
              />
              <Text style={{ fontWeight: 600 }}>{listing.sellerName}</Text>
            </Box>
          </Box>

          <Box
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 12,
              background: "#fff",
              borderTop: "1px solid #eee",
            }}
          >
            <Button fullWidth onClick={handleContact}>
              Nhắn tin qua Zalo
            </Button>
          </Box>
        </Box>
      )}
    </Page>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
    <Text style={{ color: "#8a8a8e" }}>{label}</Text>
    <Text style={{ fontWeight: 500 }}>{value}</Text>
  </Box>
);

export default ListingDetailPage;
