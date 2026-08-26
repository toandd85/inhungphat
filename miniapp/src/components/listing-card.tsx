import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Text } from "zmp-ui";
import type { Listing } from "../types/listing";
import { formatPrice, formatEventDate } from "../utils/format";

const ListingCard: React.FC<{ listing: Listing }> = ({ listing }) => {
  const navigate = useNavigate();

  return (
    <Box
      onClick={() => navigate(`/tin/${listing.id}`)}
      style={{
        display: "flex",
        gap: 12,
        background: "#fff",
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <img
        src={listing.images[0] ?? "https://via.placeholder.com/96x96?text=V%C3%A9"}
        alt={listing.title}
        style={{ width: 84, height: 84, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
      />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text.Title size="small" style={{ marginBottom: 4 }}>
          {listing.title}
        </Text.Title>
        <Text size="xSmall" style={{ color: "#8a8a8e", marginBottom: 4 }}>
          {formatEventDate(listing.eventDate)} · {listing.venue}
        </Text>
        <Text size="small" style={{ fontWeight: 600, color: "#e6350f" }}>
          {listing.kind === "exchange" ? "Trao đổi" : formatPrice(listing.price)}
        </Text>
      </Box>
    </Box>
  );
};

export default ListingCard;
