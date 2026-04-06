"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ColumnGroup =
  | "order"
  | "team_link"
  | "core"
  | "dates"
  | "health"
  | "writer"
  | "status_col"
  | "live"
  | "metrics"
  | "pricing";

export interface BacklinkOrderRow {
  id: string;
  order_id: string;
  team_specific_link_id: string;
  link_type: string;
  client: string;
  keyword: string;
  landing_page: string;
  exact_match: string;
  notes: string;
  request_date: string;
  estimated_delivery_date: string;
  estimated_turnaround_days: string;
  days_left: string;
  projected_health: string;
  link_builder: string;
  pen_name: string;
  partnership: string;
  article_title: string;
  article: string;
  status: string;
  live_link: string;
  live_link_date: string;
  dr_lbs: string;
  posting_fee_lbs: string;
  current_traffic: string;
  dr_formula: string;
  current_poc: string;
  current_price: string;
  lb_tl_approval: string;
  approval_date: string;
  final_price: string;
}

interface ColumnDef {
  key: keyof BacklinkOrderRow;
  label: string;
  group: ColumnGroup;
  min_width: number;
  type: "text" | "select" | "date" | "url" | "number";
  options?: string[];
  locked?: boolean;
}

// ── Column definitions ─────────────────────────────────────────────────────────

const LINK_TYPE_OPTIONS = [
  "DA 30+ External",
  "DA 40+ External",
  "DA 50+ External",
  "DA 30+ Internal",
  "DA 40+ Internal",
];

const STATUS_OPTIONS = ["Live", "Pending", "In Progress", "Cancelled"];

const COLUMNS: ColumnDef[] = [
  { key: "order_id", label: "Order ID", group: "order", min_width: 110, type: "text" },
  { key: "team_specific_link_id", label: "Team Specific Link ID", group: "team_link", min_width: 160, type: "text" },
  { key: "link_type", label: "Link Type", group: "core", min_width: 155, type: "select", options: LINK_TYPE_OPTIONS },
  { key: "client", label: "Client", group: "core", min_width: 120, type: "text" },
  { key: "keyword", label: "Keyword", group: "core", min_width: 200, type: "text" },
  { key: "landing_page", label: "Landing Page", group: "core", min_width: 240, type: "url" },
  { key: "exact_match", label: "Exact Match?", group: "core", min_width: 100, type: "select", options: ["Yes", "No"] },
  { key: "notes", label: "Notes", group: "core", min_width: 160, type: "text" },
  { key: "request_date", label: "Request Date", group: "dates", min_width: 120, type: "date", locked: true },
  { key: "estimated_delivery_date", label: "Estimated Delivery Date", group: "dates", min_width: 175, type: "date", locked: true },
  { key: "estimated_turnaround_days", label: "Est. Turnaround (Days)", group: "dates", min_width: 155, type: "number", locked: true },
  { key: "days_left", label: "Days Left", group: "health", min_width: 90, type: "number" },
  { key: "projected_health", label: "Projected Health", group: "health", min_width: 130, type: "text" },
  { key: "link_builder", label: "Link Builder", group: "writer", min_width: 170, type: "text" },
  { key: "pen_name", label: "Pen Name", group: "writer", min_width: 120, type: "text" },
  { key: "partnership", label: "Partnership", group: "writer", min_width: 180, type: "url" },
  { key: "article_title", label: "Article Title", group: "writer", min_width: 220, type: "text" },
  { key: "article", label: "Article", group: "writer", min_width: 120, type: "url" },
  { key: "status", label: "Status", group: "status_col", min_width: 110, type: "select", options: STATUS_OPTIONS },
  { key: "live_link", label: "Live Link", group: "live", min_width: 220, type: "url" },
  { key: "live_link_date", label: "Live Link Date", group: "live", min_width: 120, type: "date" },
  { key: "dr_lbs", label: "DR - LBs", group: "metrics", min_width: 80, type: "number" },
  { key: "posting_fee_lbs", label: "Posting Fee - LBs", group: "metrics", min_width: 135, type: "text" },
  { key: "current_traffic", label: "Current Traffic", group: "metrics", min_width: 120, type: "number" },
  { key: "dr_formula", label: "DR Formula", group: "pricing", min_width: 100, type: "number" },
  { key: "current_poc", label: "Current POC", group: "pricing", min_width: 130, type: "text" },
  { key: "current_price", label: "Current Price", group: "pricing", min_width: 120, type: "text" },
  { key: "lb_tl_approval", label: "LB TL Approval", group: "pricing", min_width: 130, type: "text" },
  { key: "approval_date", label: "Approval Date", group: "pricing", min_width: 120, type: "date" },
  { key: "final_price", label: "Final Price", group: "pricing", min_width: 110, type: "text" },
];

// ── Group header styles ────────────────────────────────────────────────────────

const GROUP_HEADER_STYLES: Record<ColumnGroup, string> = {
  order: "bg-gray-950 text-white border-gray-800",
  team_link: "bg-pink-600 text-white border-pink-700",
  core: "bg-gray-700 text-white border-gray-600",
  dates: "bg-amber-700 text-white border-amber-800",
  health: "bg-yellow-400 text-gray-900 border-yellow-500",
  writer: "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500",
  status_col: "bg-purple-700 text-white border-purple-800",
  live: "bg-rose-400 text-white border-rose-500",
  metrics: "bg-red-600 text-white border-red-700",
  pricing: "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500",
};

// ── Sample data ────────────────────────────────────────────────────────────────

let _id_counter = 0;
function generateId(): string {
  _id_counter += 1;
  return `row_${_id_counter}_${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyRow(): BacklinkOrderRow {
  return {
    id: generateId(),
    order_id: "",
    team_specific_link_id: "",
    link_type: "",
    client: "",
    keyword: "",
    landing_page: "",
    exact_match: "No",
    notes: "",
    request_date: "",
    estimated_delivery_date: "",
    estimated_turnaround_days: "30",
    days_left: "",
    projected_health: "",
    link_builder: "",
    pen_name: "",
    partnership: "",
    article_title: "",
    article: "",
    status: "Pending",
    live_link: "",
    live_link_date: "",
    dr_lbs: "",
    posting_fee_lbs: "",
    current_traffic: "",
    dr_formula: "",
    current_poc: "",
    current_price: "",
    lb_tl_approval: "",
    approval_date: "",
    final_price: "",
  };
}

const INITIAL_ROWS: BacklinkOrderRow[] = [
  {
    id: generateId(), order_id: "BL-19319", team_specific_link_id: "", link_type: "DA 30+ External",
    client: "PolicySweet", keyword: "Business Owners Policy",
    landing_page: "https://www.policysweet.com/business-owners-policy",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Anderson, Kaitlin", pen_name: "Rebecca", partnership: "walkermagazine.com",
    article_title: "", article: "https://docs.google.com/d", status: "Live",
    live_link: "https://walkermagazine.com/the-benefits", live_link_date: "12/12/2024",
    dr_lbs: "37", posting_fee_lbs: "$25", current_traffic: "171", dr_formula: "37",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Amanda",
    approval_date: "12/13/2024", final_price: "$250.0",
  },
  {
    id: generateId(), order_id: "BL-19320", team_specific_link_id: "", link_type: "DA 30+ External",
    client: "PolicySweet", keyword: "Business Owners Policy",
    landing_page: "https://www.policysweet.com/business-owners-policy",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Anderson, Kaitlin", pen_name: "ms link builder", partnership: "celebsliving.com",
    article_title: "", article: "https://docs.google.com/d", status: "Live",
    live_link: "https://celebsliving.com/how-business-ow", live_link_date: "12/11/2024",
    dr_lbs: "36", posting_fee_lbs: "$18", current_traffic: "131", dr_formula: "36",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Amanda",
    approval_date: "12/12/2024", final_price: "$250.0",
  },
  {
    id: generateId(), order_id: "BL-19321", team_specific_link_id: "", link_type: "DA 30+ External",
    client: "PolicySweet", keyword: "Business Owners Policy",
    landing_page: "https://www.policysweet.com/business-owners-policy",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Anderson, Kaitlin", pen_name: "ms link builder", partnership: "vefeast.com",
    article_title: "", article: "https://docs.google.com/d", status: "Live",
    live_link: "https://vefeast.com/how-business-owner", live_link_date: "12/17/2024",
    dr_lbs: "42", posting_fee_lbs: "$17", current_traffic: "467", dr_formula: "42",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Amanda",
    approval_date: "12/17/2024", final_price: "$250.0",
  },
  {
    id: generateId(), order_id: "BL-19322", team_specific_link_id: "", link_type: "DA 30+ External",
    client: "PolicySweet", keyword: "Business Owners Policy",
    landing_page: "https://www.policysweet.com/business-owners-policy",
    exact_match: "No", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Anderson, Kaitlin", pen_name: "ms link builder", partnership: "wordstreetjournal.com",
    article_title: "", article: "https://docs.google.com/d", status: "Live",
    live_link: "https://vatonlinecalculator.co.uk/the-impo", live_link_date: "12/11/2024",
    dr_lbs: "40", posting_fee_lbs: "$22", current_traffic: "6729", dr_formula: "40",
    current_poc: "Muhammad", current_price: "$20", lb_tl_approval: "Amanda",
    approval_date: "12/11/2024", final_price: "$250.0",
  },
  {
    id: generateId(), order_id: "BL-19323", team_specific_link_id: "", link_type: "DA 30+ External",
    client: "PolicySweet", keyword: "Business Owners Policy",
    landing_page: "https://www.policysweet.com/business-owners-policy",
    exact_match: "No", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Hevener, Amanda", pen_name: "Areeba", partnership: "forbeszine.com",
    article_title: "The Importance of Business Insurance", article: "https://docs.google.com/d",
    status: "Live", live_link: "https://forbeszine.com/the-importance-of", live_link_date: "12/12/2024",
    dr_lbs: "38", posting_fee_lbs: "$25", current_traffic: "0", dr_formula: "38",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Amanda",
    approval_date: "12/13/2024", final_price: "$250.0",
  },
  {
    id: generateId(), order_id: "BL-19324", team_specific_link_id: "", link_type: "DA 30+ External",
    client: "PolicySweet", keyword: "Business Owners Policy",
    landing_page: "https://www.policysweet.com/business-owners-policy",
    exact_match: "No", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Hevener, Amanda", pen_name: "Areeba", partnership: "tribuneindian.com",
    article_title: "Understanding the Different Types of Business Insurance",
    article: "https://docs.google.com/d", status: "Live",
    live_link: "https://www.tribuneindian.com/understan", live_link_date: "12/12/2024",
    dr_lbs: "37", posting_fee_lbs: "$25", current_traffic: "1", dr_formula: "37",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Amanda",
    approval_date: "12/13/2024", final_price: "$250.0",
  },
  {
    id: generateId(), order_id: "BL-19325", team_specific_link_id: "", link_type: "DA 30+ External",
    client: "PolicySweet", keyword: "Business Owners Policy",
    landing_page: "https://www.policysweet.com/business-owners-policy",
    exact_match: "No", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Hevener, Amanda", pen_name: "Arijit", partnership: "captionsunleashed.com",
    article_title: "How to Choose Business Insurance", article: "https://docs.google.com/d",
    status: "Live", live_link: "https://captionsunleashed.com/how-to-ch", live_link_date: "12/3/2024",
    dr_lbs: "40", posting_fee_lbs: "$20", current_traffic: "1056", dr_formula: "40",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Amanda",
    approval_date: "12/4/2024", final_price: "$250.0",
  },
  {
    id: generateId(), order_id: "BL-19326", team_specific_link_id: "AMA-157", link_type: "DA 30+ External",
    client: "Amagi", keyword: "Amagi podcast",
    landing_page: "https://www.amagi.com/podcasts",
    exact_match: "No", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Anderson, Kaitlin", pen_name: "Rebecca", partnership: "coopermagazine.co.uk",
    article_title: "", article: "https://docs.google.com/d", status: "Live",
    live_link: "https://coopermagazine.co.uk/brands-anc", live_link_date: "12/12/2024",
    dr_lbs: "38", posting_fee_lbs: "$25", current_traffic: "2088", dr_formula: "38",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Amanda",
    approval_date: "12/13/2024", final_price: "$250.0",
  },
  {
    id: generateId(), order_id: "BL-19327", team_specific_link_id: "AMA-163", link_type: "DA 40+ External",
    client: "Amagi", keyword: "how to launch a fast channel",
    landing_page: "https://www.amagi.com/blog/how-to-launch-fast-channel",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Anderson, Kaitlin", pen_name: "hammad", partnership: "starmusiqweb.com",
    article_title: "", article: "https://docs.google.com/d", status: "Live",
    live_link: "https://starmusiqweb.com/a-guide-for-lau", live_link_date: "12/12/2024",
    dr_lbs: "60", posting_fee_lbs: "$20", current_traffic: "3207", dr_formula: "60",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Amanda",
    approval_date: "12/13/2024", final_price: "$300.0",
  },
  {
    id: generateId(), order_id: "BL-19328", team_specific_link_id: "AMA-168", link_type: "DA 50+ External",
    client: "Amagi", keyword: "how to launch a fast channel",
    landing_page: "https://www.amagi.com/blog/how-to-launch-fast-channel",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "2. Anderson, Kaitlin", pen_name: "Christina", partnership: "anationofmoms.com",
    article_title: "", article: "https://docs.google.com/d", status: "Live",
    live_link: "https://anationofmoms.com/2024/12/free-", live_link_date: "12/17/2024",
    dr_lbs: "67", posting_fee_lbs: "$65", current_traffic: "1975", dr_formula: "67",
    current_poc: "Arslan", current_price: "$25", lb_tl_approval: "Amanda",
    approval_date: "12/17/2024", final_price: "$375.0",
  },
  {
    id: generateId(), order_id: "BL-19329", team_specific_link_id: "", link_type: "DA 30+ Internal",
    client: "97th Floor", keyword: "cybersecurity marketing agency",
    landing_page: "https://97thfloor.com/industries/cybersecurity/",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "1. Barney, Lauren", pen_name: "David Wirt", partnership: "letmagazine.com",
    article_title: "Strategies For Protecting Sensitive Information",
    article: "https://docs.google.com/d", status: "Live",
    live_link: "https://www.letmagazine.com/strategies-", live_link_date: "12/18/2024",
    dr_lbs: "42", posting_fee_lbs: "$25", current_traffic: "33", dr_formula: "42",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Krista",
    approval_date: "1/4/2025", final_price: "$55.0",
  },
  {
    id: generateId(), order_id: "BL-19330", team_specific_link_id: "", link_type: "DA 40+ Internal",
    client: "97th Floor", keyword: "cybersecurity marketing agency",
    landing_page: "https://97thfloor.com/industries/cybersecurity/",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "1. Barney, Lauren", pen_name: "Bobby Jesse", partnership: "explorethings.org",
    article_title: "Simple Tips for Effective Outsourcing", article: "https://docs.google.com/d",
    status: "Live", live_link: "https://explorethings.org/tips-for-effective", live_link_date: "12/20/2024",
    dr_lbs: "45", posting_fee_lbs: "$50", current_traffic: "0", dr_formula: "45",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Krista",
    approval_date: "1/2/2025", final_price: "$80.0",
  },
  {
    id: generateId(), order_id: "BL-19331", team_specific_link_id: "", link_type: "DA 30+ Internal",
    client: "97th Floor", keyword: "digital marketing services",
    landing_page: "https://97thfloor.com/services/",
    exact_match: "No", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "1. Barney, Lauren", pen_name: "Hammad", partnership: "usawire.com",
    article_title: "Building a Digital Foundation for Your Business",
    article: "https://docs.google.com/d", status: "Live",
    live_link: "https://usawire.com/building-a-digital-fo", live_link_date: "12/17/2024",
    dr_lbs: "55", posting_fee_lbs: "$12", current_traffic: "5203", dr_formula: "55",
    current_poc: "Muhammad", current_price: "$15", lb_tl_approval: "Krista",
    approval_date: "1/2/2025", final_price: "$55.0",
  },
  {
    id: generateId(), order_id: "BL-19332", team_specific_link_id: "", link_type: "DA 30+ Internal",
    client: "97th Floor", keyword: "digital marketing services",
    landing_page: "https://97thfloor.com/services/",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "1. Barney, Lauren", pen_name: "Hammad", partnership: "wistomagazine.co.uk",
    article_title: "Becoming a Household Name in Business",
    article: "https://docs.google.com/d", status: "Live",
    live_link: "https://wistomagazine.co.uk/becoming-a", live_link_date: "12/10/2024",
    dr_lbs: "37", posting_fee_lbs: "$12", current_traffic: "0", dr_formula: "37",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Krista",
    approval_date: "12/16/2024", final_price: "$55.0",
  },
  {
    id: generateId(), order_id: "BL-19333", team_specific_link_id: "", link_type: "DA 30+ Internal",
    client: "97th Floor", keyword: "saas digital marketing agency",
    landing_page: "https://97thfloor.com/industries/saas/",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "1. Barney, Lauren", pen_name: "Hammad", partnership: "picnob.uk",
    article_title: "The Role of Software in Modern Business",
    article: "https://docs.google.com/d", status: "Live",
    live_link: "https://picnob.uk/2024/12/10/the-role-of-", live_link_date: "12/10/2024",
    dr_lbs: "36", posting_fee_lbs: "$15", current_traffic: "0", dr_formula: "36",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Krista",
    approval_date: "12/16/2024", final_price: "$55.0",
  },
  {
    id: generateId(), order_id: "BL-19334", team_specific_link_id: "", link_type: "DA 30+ Internal",
    client: "97th Floor", keyword: "saas digital marketing agency",
    landing_page: "https://97thfloor.com/industries/saas/",
    exact_match: "No", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "1. Barney, Lauren", pen_name: "Hammad", partnership: "kidzmommy.com",
    article_title: "Marketing Trends and Developments",
    article: "https://docs.google.com/d", status: "Live",
    live_link: "https://kidzmommy.com/marketing-trends-", live_link_date: "12/9/2024",
    dr_lbs: "42", posting_fee_lbs: "$20", current_traffic: "688", dr_formula: "42",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Krista",
    approval_date: "12/16/2024", final_price: "$55.0",
  },
  {
    id: generateId(), order_id: "BL-19335", team_specific_link_id: "", link_type: "DA 30+ Internal",
    client: "97th Floor", keyword: "saas digital marketing agency",
    landing_page: "https://97thfloor.com/industries/saas/",
    exact_match: "No", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "1. Barney, Lauren", pen_name: "Hammad", partnership: "scrollblogs.co.uk",
    article_title: "What You Should Know About Working Remotely",
    article: "https://docs.google.com/d", status: "Live",
    live_link: "https://scrollblogs.co.uk/what-you-should", live_link_date: "12/11/2024",
    dr_lbs: "38", posting_fee_lbs: "$15", current_traffic: "0", dr_formula: "38",
    current_poc: "SITE REMOVED", current_price: "SITE REMOVED", lb_tl_approval: "Krista",
    approval_date: "12/16/2024", final_price: "$55.0",
  },
  {
    id: generateId(), order_id: "BL-19336", team_specific_link_id: "", link_type: "DA 40+ Internal",
    client: "97th Floor", keyword: "saas digital marketing agency",
    landing_page: "https://97thfloor.com/industries/saas/",
    exact_match: "Yes", notes: "", request_date: "12/2/2024", estimated_delivery_date: "1/1/2025",
    estimated_turnaround_days: "30", days_left: "-114", projected_health: "-280%",
    link_builder: "1. Barney, Lauren", pen_name: "Arslan Khan", partnership: "educba.com",
    article_title: "Reaching Younger Consumers with Your Marketing",
    article: "https://docs.google.com/d", status: "Live",
    live_link: "https://www.educba.com/reaching-young-", live_link_date: "12/27/2024",
    dr_lbs: "58", posting_fee_lbs: "$50", current_traffic: "131486", dr_formula: "58",
    current_poc: "Muhammad", current_price: "$40", lb_tl_approval: "Krista",
    approval_date: "1/2/2025", final_price: "$80.0",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function isDateOverdue(date_str: string): boolean {
  if (!date_str) return false;
  const parts = date_str.split("/");
  if (parts.length !== 3) return false;
  const date = new Date(`${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`);
  return !isNaN(date.getTime()) && date < new Date();
}

function isDaysNegative(days_str: string): boolean {
  const n = parseInt(days_str, 10);
  return !isNaN(n) && n < 0;
}

// ── Editable cell ──────────────────────────────────────────────────────────────

interface EditableCellProps {
  col: ColumnDef;
  value: string;
  is_editing: boolean;
  onStartEdit: () => void;
  onUpdate: (value: string) => void;
  onStopEdit: () => void;
  onKeyNav: (direction: "next" | "prev" | "down") => void;
}

function EditableCell({
  col,
  value,
  is_editing,
  onStartEdit,
  onUpdate,
  onStopEdit,
  onKeyNav,
}: EditableCellProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const select_ref = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (is_editing) {
      input_ref.current?.focus();
      input_ref.current?.select();
      select_ref.current?.focus();
    }
  }, [is_editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onStopEdit();
    } else if (e.key === "Enter") {
      onStopEdit();
      onKeyNav("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      onStopEdit();
      onKeyNav(e.shiftKey ? "prev" : "next");
    }
  };

  if (is_editing) {
    if (col.type === "select" && col.options) {
      return (
        <td className="p-0">
          <select
            ref={select_ref}
            value={value}
            onChange={(e) => onUpdate(e.target.value)}
            onBlur={onStopEdit}
            onKeyDown={handleKeyDown}
            className="h-full w-full border-2 border-brand-500 bg-white px-2 py-1.5 text-xs outline-none dark:bg-gray-800 dark:text-white"
            style={{ minWidth: col.min_width }}
          >
            <option value="">-- Select --</option>
            {col.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </td>
      );
    }

    return (
      <td className="p-0">
        <input
          ref={input_ref}
          type="text"
          value={value}
          onChange={(e) => onUpdate(e.target.value)}
          onBlur={onStopEdit}
          onKeyDown={handleKeyDown}
          className="h-full w-full border-2 border-brand-500 bg-white px-2 py-1.5 text-xs outline-none dark:bg-gray-800 dark:text-white"
          style={{ minWidth: col.min_width }}
        />
      </td>
    );
  }

  // ── Display mode ───────────────────────────────────────────────────────────

  let display: React.ReactNode;

  if (col.type === "url" && value) {
    const label = value.replace(/^https?:\/\//, "").slice(0, 28);
    display = (
      <a
        href={value.startsWith("http") ? value : `https://${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
        onClick={(e) => e.stopPropagation()}
        title={value}
      >
        {label}
        {value.replace(/^https?:\/\//, "").length > 28 ? "…" : ""}
      </a>
    );
  } else if (col.key === "estimated_delivery_date" && isDateOverdue(value)) {
    display = <span className="font-semibold text-red-500">{value}</span>;
  } else if (col.key === "days_left" && isDaysNegative(value)) {
    display = <span className="font-semibold text-red-500">{value}</span>;
  } else if (col.key === "status" && value) {
    const status_map: Record<string, string> = {
      Live: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    display = (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${status_map[value] ?? "bg-gray-100 text-gray-600"}`}
      >
        {value === "Live" && (
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        )}
        {value}
      </span>
    );
  } else if (col.key === "exact_match") {
    if (value === "Yes") {
      display = <span className="font-medium text-green-600 dark:text-green-400">Yes</span>;
    } else if (value === "No") {
      display = <span className="text-gray-400">No</span>;
    } else {
      display = <span className="text-gray-300">—</span>;
    }
  } else if (col.key === "projected_health" && value) {
    const is_negative = value.startsWith("-");
    display = (
      <span className={`font-medium ${is_negative ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
        {value}
      </span>
    );
  } else {
    display = value ? (
      <span title={value}>{value}</span>
    ) : (
      <span className="text-gray-300 dark:text-gray-600">—</span>
    );
  }

  return (
    <td
      className="cursor-pointer whitespace-nowrap px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
      onClick={onStartEdit}
      title="Click to edit"
    >
      <div className="overflow-hidden" style={{ maxWidth: col.min_width }}>
        {display}
      </div>
    </td>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BacklinkOrdersTable() {
  const [rows, setRows] = useState<BacklinkOrderRow[]>(INITIAL_ROWS);
  const [editing_cell, setEditingCell] = useState<{ row_id: string; col_key: string } | null>(null);
  const [search, setSearch] = useState("");
  const [show_filter_panel, setShowFilterPanel] = useState(false);
  const [hidden_columns, setHiddenColumns] = useState<Set<string>>(new Set());

  const filtered_rows = rows.filter((row) => {
    if (!search.trim()) return true;
    const lower = search.toLowerCase();
    return (
      row.order_id.toLowerCase().includes(lower) ||
      row.client.toLowerCase().includes(lower) ||
      row.keyword.toLowerCase().includes(lower) ||
      row.link_builder.toLowerCase().includes(lower) ||
      row.status.toLowerCase().includes(lower) ||
      row.partnership.toLowerCase().includes(lower)
    );
  });

  const visible_columns = COLUMNS.filter((col) => !hidden_columns.has(col.key));

  const startEditing = useCallback((row_id: string, col_key: string) => {
    setEditingCell({ row_id, col_key });
  }, []);

  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const updateCell = useCallback(
    (row_id: string, col_key: keyof BacklinkOrderRow, value: string) => {
      setRows((prev) =>
        prev.map((row) => (row.id === row_id ? { ...row, [col_key]: value } : row))
      );
    },
    []
  );

  const navigateCell = useCallback(
    (row_id: string, col_key: string, direction: "next" | "prev" | "down") => {
      const col_idx = visible_columns.findIndex((c) => c.key === col_key);
      const row_idx = filtered_rows.findIndex((r) => r.id === row_id);

      if (direction === "next") {
        const next_col = visible_columns[col_idx + 1];
        if (next_col) {
          setEditingCell({ row_id, col_key: next_col.key });
        } else if (filtered_rows[row_idx + 1]) {
          setEditingCell({ row_id: filtered_rows[row_idx + 1].id, col_key: visible_columns[0].key });
        }
      } else if (direction === "prev") {
        const prev_col = visible_columns[col_idx - 1];
        if (prev_col) {
          setEditingCell({ row_id, col_key: prev_col.key });
        }
      } else if (direction === "down") {
        if (filtered_rows[row_idx + 1]) {
          setEditingCell({ row_id: filtered_rows[row_idx + 1].id, col_key });
        }
      }
    },
    [visible_columns, filtered_rows]
  );

  const addRow = useCallback(() => {
    const new_row = createEmptyRow();
    setRows((prev) => [...prev, new_row]);
    setTimeout(() => setEditingCell({ row_id: new_row.id, col_key: "order_id" }), 50);
  }, []);

  const deleteRow = useCallback((row_id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== row_id));
    if (editing_cell?.row_id === row_id) stopEditing();
  }, [editing_cell, stopEditing]);

  const toggleColumn = useCallback((col_key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col_key)) {
        next.delete(col_key);
      } else {
        next.add(col_key);
      }
      return next;
    });
  }, []);

  const exportCsv = useCallback(() => {
    const headers = visible_columns.map((c) => `"${c.label}"`).join(",");
    const data_rows = rows.map((row) =>
      visible_columns
        .map((col) => `"${((row[col.key] as string) ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers, ...data_rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backlink_orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, visible_columns]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Table toolbar */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Backlink Orders
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {filtered_rows.length} of {rows.length} rows &middot; {visible_columns.length} columns &middot; Click any cell to edit
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          {/* Column filter toggle */}
          <button
            onClick={() => setShowFilterPanel((v) => !v)}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
              show_filter_panel
                ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Columns
            {hidden_columns.size > 0 && (
              <span className="ml-0.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-xs text-white">
                {hidden_columns.size}
              </span>
            )}
          </button>
          {/* Export CSV */}
          <button
            onClick={exportCsv}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          {/* Add row */}
          <button
            onClick={addRow}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Row
          </button>
        </div>
      </div>

      {/* Column visibility panel */}
      {show_filter_panel && (
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Toggle column visibility
            </p>
            <button
              onClick={() => setHiddenColumns(new Set())}
              className="text-xs text-brand-500 hover:underline dark:text-brand-400"
            >
              Show all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COLUMNS.map((col) => {
              const is_visible = !hidden_columns.has(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                    is_visible
                      ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      : "border-dashed border-gray-300 bg-transparent text-gray-400 line-through dark:border-gray-600 dark:text-gray-500"
                  }`}
                >
                  {is_visible ? (
                    <svg className="h-2.5 w-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              {visible_columns.map((col) => (
                <th
                  key={col.key}
                  className={`border border-gray-700/30 px-2 py-2 text-left font-semibold tracking-wide ${GROUP_HEADER_STYLES[col.group]}`}
                  style={{ minWidth: col.min_width }}
                >
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    {col.locked && (
                      <svg
                        className="h-3 w-3 shrink-0 opacity-80"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-label="Locked column"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {col.label}
                  </span>
                </th>
              ))}
              <th className="border border-gray-700/30 bg-gray-800 px-2 py-2 text-center text-xs font-semibold text-white">
                <span className="sr-only">Row actions</span>
                <svg className="mx-auto h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered_rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visible_columns.length + 1}
                  className="px-6 py-14 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  {search
                    ? `No rows match "${search}". Try a different search term.`
                    : 'No rows yet. Click "Add Row" to get started.'}
                </td>
              </tr>
            ) : (
              filtered_rows.map((row, row_idx) => (
                <tr
                  key={row.id}
                  className={`group border-b border-gray-100 transition-colors dark:border-gray-800 ${
                    row_idx % 2 === 0
                      ? "bg-white dark:bg-gray-900"
                      : "bg-gray-50/60 dark:bg-gray-800/30"
                  } hover:bg-blue-50/40 dark:hover:bg-blue-900/10`}
                >
                  {visible_columns.map((col) => {
                    const is_editing =
                      editing_cell?.row_id === row.id && editing_cell?.col_key === col.key;
                    return (
                      <EditableCell
                        key={col.key}
                        col={col}
                        value={(row[col.key] as string) ?? ""}
                        is_editing={is_editing}
                        onStartEdit={() => startEditing(row.id, col.key)}
                        onUpdate={(val) => updateCell(row.id, col.key, val)}
                        onStopEdit={stopEditing}
                        onKeyNav={(dir) => navigateCell(row.id, col.key, dir)}
                      />
                    );
                  })}
                  {/* Actions cell */}
                  <td className="border-l border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Delete row"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {rows.length} total rows &middot; {visible_columns.length} of {COLUMNS.length} columns visible
        </p>
        <p className="text-xs text-gray-300 dark:text-gray-700">
          Tab to navigate &middot; Enter to confirm &middot; Esc to cancel
        </p>
      </div>
    </div>
  );
}
