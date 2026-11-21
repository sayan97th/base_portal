import type { Metadata } from "next";
import GiftCardRequestsContent from "@/components/admin/coupons/gift-cards/GiftCardRequestsContent";
import type { GiftCardStatusFilter } from "@/components/admin/coupons/gift-cards/gift-card-claims";

export const metadata: Metadata = {
  title: "Gift Card Requests | Admin Portal",
  description: "Review the gift cards clients earned with a coupon, mark them as sent and export them.",
};

const STATUS_FILTERS: GiftCardStatusFilter[] = ["all", "submitted", "pending_details", "fulfilled"];

interface CouponGiftCardsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function CouponGiftCardsPage({ params, searchParams }: CouponGiftCardsPageProps) {
  const { id } = await params;
  const { status } = await searchParams;
  const initial_status = STATUS_FILTERS.find((filter) => filter === status) ?? "all";

  return <GiftCardRequestsContent coupon_id={id} initial_status={initial_status} />;
}
