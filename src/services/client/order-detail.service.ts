import { linkBuildingService } from "./link-building.service";
import { newContentService } from "./new-content.service";
import { contentOptimizationService } from "./content-optimization.service";
import { contentBriefsService } from "./content-briefs.service";
import type { LinkBuildingOrderDetail } from "@/types/client/link-building";
import type { NewContentOrderDetail } from "@/types/client/new-content";
import type { ContentOptimizationOrderDetail } from "@/types/client/content-optimization";
import type { ContentBriefOrderDetail } from "@/types/client/content-briefs";

export type DetectedOrderDetail =
  | { product_type: "link_building"; data: LinkBuildingOrderDetail }
  | { product_type: "new_content"; data: NewContentOrderDetail }
  | { product_type: "content_optimization"; data: ContentOptimizationOrderDetail }
  | { product_type: "content_brief"; data: ContentBriefOrderDetail };

export async function fetchOrderByUuid(order_id: string): Promise<DetectedOrderDetail> {
  const [lb, nc, co, cb] = await Promise.allSettled([
    linkBuildingService.fetchLinkBuildingOrderDetail(order_id),
    newContentService.fetchOrderDetail(order_id),
    contentOptimizationService.fetchOrderDetail(order_id),
    contentBriefsService.fetchOrderDetail(order_id),
  ]);

  if (lb.status === "fulfilled") return { product_type: "link_building", data: lb.value };
  if (nc.status === "fulfilled") return { product_type: "new_content", data: nc.value };
  if (co.status === "fulfilled") return { product_type: "content_optimization", data: co.value };
  if (cb.status === "fulfilled") return { product_type: "content_brief", data: cb.value };

  throw new Error("Order not found");
}
