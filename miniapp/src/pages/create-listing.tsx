import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { chooseImage } from "zmp-sdk/apis";
import { Box, Button, DatePicker, Header, Input, Page, Radio, Select, Text, useSnackbar } from "zmp-ui";
import { ensureSignedIn } from "../services/auth";
import { createListing, uploadListingImage } from "../services/listings";
import { CATEGORY_LABEL, type ListingCategory, type ListingKind } from "../types/listing";

const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();

  const [category, setCategory] = useState<ListingCategory>("concert");
  const [kind, setKind] = useState<ListingKind>("sell");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventTime, setEventTime] = useState("19:00");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImages = async () => {
    try {
      const { filePaths } = await chooseImage({ count: 4 });
      setImages((prev) => [...prev, ...filePaths].slice(0, 4));
    } catch {
      // User cancelled - no-op.
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !eventDate || !venue.trim() || !city.trim()) {
      openSnackbar({ text: "Vui lòng điền đầy đủ thông tin bắt buộc.", type: "error" });
      return;
    }

    const [hours, minutes] = eventTime.split(":").map(Number);
    const eventDateTime = new Date(eventDate);
    eventDateTime.setHours(hours || 0, minutes || 0, 0, 0);

    setSubmitting(true);
    try {
      const profile = await ensureSignedIn();

      const uploadedUrls: string[] = [];
      for (const localPath of images) {
        const blob = await (await fetch(localPath)).blob();
        uploadedUrls.push(await uploadListingImage(blob, profile.uid));
      }

      await createListing(
        {
          category,
          kind,
          title: title.trim(),
          description: description.trim(),
          eventDate: eventDateTime.toISOString(),
          venue: venue.trim(),
          city: city.trim(),
          quantity: Number(quantity) || 1,
          price: kind === "exchange" ? 0 : Number(price) || 0,
          images: uploadedUrls,
        },
        profile
      );

      openSnackbar({ text: "Đăng tin thành công!", type: "success" });
      navigate("/tin-cua-toi");
    } catch (err: any) {
      openSnackbar({ text: err?.message ?? "Đăng tin thất bại, thử lại sau.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page style={{ background: "#fff" }}>
      <Header title="Đăng tin vé" showBackIcon={false} />
      <Box style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Select
          label="Loại sự kiện"
          value={category}
          onChange={(value) => setCategory(value as ListingCategory)}
        >
          {(Object.keys(CATEGORY_LABEL) as ListingCategory[]).map((key) => (
            <Select.Option key={key} value={key} title={CATEGORY_LABEL[key]} />
          ))}
        </Select>

        <Radio.Group value={kind} onChange={(value) => setKind(value as ListingKind)}>
          <Box style={{ display: "flex", gap: 16 }}>
            <Radio value="sell">Bán vé</Radio>
            <Radio value="exchange">Trao đổi</Radio>
          </Box>
        </Radio.Group>

        <Input label="Tên sự kiện *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input.TextArea
          label="Mô tả"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <DatePicker
          label="Ngày diễn ra *"
          placeholder="Chọn ngày"
          value={eventDate}
          onChange={setEventDate}
          startDate={new Date()}
        />
        <Box>
          <Text style={{ marginBottom: 6, fontWeight: 500 }}>Giờ diễn ra *</Text>
          <input
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d9d9d9",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
        </Box>
        <Input label="Địa điểm *" value={venue} onChange={(e) => setVenue(e.target.value)} />
        <Input label="Thành phố *" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input
          type="number"
          label="Số lượng vé"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        {kind === "sell" && (
          <Input
            type="number"
            label="Giá bán (VNĐ)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        )}

        <Box>
          <Text style={{ marginBottom: 8, fontWeight: 500 }}>Hình ảnh vé (tối đa 4)</Text>
          <Box style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {images.map((src) => (
              <img key={src} src={src} style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
            ))}
            <Button size="small" variant="secondary" onClick={handlePickImages}>
              + Thêm ảnh
            </Button>
          </Box>
        </Box>

        <Button fullWidth loading={submitting} onClick={handleSubmit}>
          Đăng tin
        </Button>
      </Box>
    </Page>
  );
};

export default CreateListingPage;
