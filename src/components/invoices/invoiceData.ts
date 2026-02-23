export type InvoiceStatus = "paid" | "void";

export interface InvoiceLineItem {
  item_name: string;
  price: string;
  quantity: number;
  item_total: string;
}

export interface InvoiceDetail {
  invoice_number: string;
  unique_id: string;
  date_issued: string;
  date_paid: string;
  payment_method: string;
  status: InvoiceStatus;
  total: string;
  date_due: string;
  billed_to: {
    company_name: string;
    company_description: string;
    address_line_1: string;
    address_line_2: string;
    state: string;
    country: string;
  };
  line_items: InvoiceLineItem[];
  subtotal: string;
  credit: string;
}

export interface InvoiceSummary {
  unique_id: string;
  date: string;
  date_due: string;
  total: string;
  status: InvoiceStatus;
}

export const invoice_list: InvoiceSummary[] = [
  { unique_id: "53A0EC35", date: "Nov 17, 2025", date_due: "Nov 17, 2025", total: "$715.00", status: "void" },
  { unique_id: "C26149E9", date: "Nov 17, 2025", date_due: "Nov 17, 2025", total: "$715.00", status: "void" },
  { unique_id: "2507C497", date: "Nov 14, 2025", date_due: "Nov 14, 2025", total: "$715.00", status: "void" },
  { unique_id: "235BE096", date: "Oct 9, 2025", date_due: "Oct 10, 2025", total: "$0.00", status: "paid" },
  { unique_id: "FF06B612", date: "Apr 9, 2025", date_due: "Apr 9, 2025", total: "99 credits", status: "paid" },
  { unique_id: "7B47EB9B", date: "Apr 9, 2025", date_due: "Apr 9, 2025", total: "200 credits", status: "paid" },
  { unique_id: "8A3B233D", date: "Apr 9, 2025", date_due: "Apr 9, 2025", total: "683 credits", status: "paid" },
  { unique_id: "874FD062", date: "Apr 2, 2025", date_due: "Apr 2, 2025", total: "925 credits", status: "paid" },
  { unique_id: "A7FB1724", date: "Apr 2, 2025", date_due: "Apr 2, 2025", total: "250 credits", status: "paid" },
  { unique_id: "A60C185C", date: "Mar 18, 2025", date_due: "Mar 18, 2025", total: "$0.00", status: "paid" },
  { unique_id: "A273B943", date: "Dec 6, 2024", date_due: "Dec 6, 2024", total: "625 credits", status: "paid" },
  { unique_id: "6061E693", date: "Dec 5, 2024", date_due: "Dec 5, 2024", total: "$0.00", status: "paid" },
  { unique_id: "2FCE73DE", date: "Dec 18, 2023", date_due: "Dec 19, 2023", total: "$0.00", status: "paid" },
  { unique_id: "23861878", date: "Dec 18, 2023", date_due: "Dec 19, 2023", total: "$0.00", status: "paid" },
  { unique_id: "C3210330", date: "Dec 15, 2023", date_due: "Dec 15, 2023", total: "$6,007.50", status: "void" },
];

export const invoice_details: Record<string, InvoiceDetail> = {
  FF06B612: {
    invoice_number: "BSM-6359",
    unique_id: "FF06B612",
    date_issued: "Apr 9, 2025",
    date_paid: "Apr 9, 2025",
    payment_method: "Account Balance",
    status: "paid",
    total: "99 credits",
    date_due: "Apr 9, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Organic Performance Brief (Credits)", price: "99 credits", quantity: 1, item_total: "99 credits" },
    ],
    subtotal: "99 credits",
    credit: "-99 credits",
  },
  "53A0EC35": {
    invoice_number: "BSM-6365",
    unique_id: "53A0EC35",
    date_issued: "Nov 17, 2025",
    date_paid: "Nov 17, 2025",
    payment_method: "Credit Card",
    status: "void",
    total: "$715.00",
    date_due: "Nov 17, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "2600 Executive Pkwy #100",
      address_line_2: "Lehi, UT 84043",
      state: "Utah",
      country: "United States",
    },
    line_items: [
      { item_name: "Link Building - DR 50+", price: "$715.00", quantity: 1, item_total: "$715.00" },
    ],
    subtotal: "$715.00",
    credit: "$0.00",
  },
  C26149E9: {
    invoice_number: "BSM-6364",
    unique_id: "C26149E9",
    date_issued: "Nov 17, 2025",
    date_paid: "Nov 17, 2025",
    payment_method: "Credit Card",
    status: "void",
    total: "$715.00",
    date_due: "Nov 17, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "2600 Executive Pkwy #100",
      address_line_2: "Lehi, UT 84043",
      state: "Utah",
      country: "United States",
    },
    line_items: [
      { item_name: "Link Building - DR 50+", price: "$715.00", quantity: 1, item_total: "$715.00" },
    ],
    subtotal: "$715.00",
    credit: "$0.00",
  },
  "2507C497": {
    invoice_number: "BSM-6363",
    unique_id: "2507C497",
    date_issued: "Nov 14, 2025",
    date_paid: "Nov 14, 2025",
    payment_method: "Credit Card",
    status: "void",
    total: "$715.00",
    date_due: "Nov 14, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "2600 Executive Pkwy #100",
      address_line_2: "Lehi, UT 84043",
      state: "Utah",
      country: "United States",
    },
    line_items: [
      { item_name: "Link Building - DR 50+", price: "$715.00", quantity: 1, item_total: "$715.00" },
    ],
    subtotal: "$715.00",
    credit: "$0.00",
  },
  "235BE096": {
    invoice_number: "BSM-6362",
    unique_id: "235BE096",
    date_issued: "Oct 9, 2025",
    date_paid: "Oct 10, 2025",
    payment_method: "Account Balance",
    status: "paid",
    total: "$0.00",
    date_due: "Oct 10, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Content Optimization", price: "$0.00", quantity: 1, item_total: "$0.00" },
    ],
    subtotal: "$0.00",
    credit: "$0.00",
  },
  "7B47EB9B": {
    invoice_number: "BSM-6360",
    unique_id: "7B47EB9B",
    date_issued: "Apr 9, 2025",
    date_paid: "Apr 9, 2025",
    payment_method: "Account Balance",
    status: "paid",
    total: "200 credits",
    date_due: "Apr 9, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "New Content Article (Credits)", price: "200 credits", quantity: 1, item_total: "200 credits" },
    ],
    subtotal: "200 credits",
    credit: "-200 credits",
  },
  "8A3B233D": {
    invoice_number: "BSM-6361",
    unique_id: "8A3B233D",
    date_issued: "Apr 9, 2025",
    date_paid: "Apr 9, 2025",
    payment_method: "Account Balance",
    status: "paid",
    total: "683 credits",
    date_due: "Apr 9, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Link Building Bundle (Credits)", price: "683 credits", quantity: 1, item_total: "683 credits" },
    ],
    subtotal: "683 credits",
    credit: "-683 credits",
  },
  "874FD062": {
    invoice_number: "BSM-6358",
    unique_id: "874FD062",
    date_issued: "Apr 2, 2025",
    date_paid: "Apr 2, 2025",
    payment_method: "Account Balance",
    status: "paid",
    total: "925 credits",
    date_due: "Apr 2, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "SEO Package Credits", price: "925 credits", quantity: 1, item_total: "925 credits" },
    ],
    subtotal: "925 credits",
    credit: "-925 credits",
  },
  A7FB1724: {
    invoice_number: "BSM-6357",
    unique_id: "A7FB1724",
    date_issued: "Apr 2, 2025",
    date_paid: "Apr 2, 2025",
    payment_method: "Account Balance",
    status: "paid",
    total: "250 credits",
    date_due: "Apr 2, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Premium Mention (Credits)", price: "250 credits", quantity: 1, item_total: "250 credits" },
    ],
    subtotal: "250 credits",
    credit: "-250 credits",
  },
  A60C185C: {
    invoice_number: "BSM-6356",
    unique_id: "A60C185C",
    date_issued: "Mar 18, 2025",
    date_paid: "Mar 18, 2025",
    payment_method: "Account Balance",
    status: "paid",
    total: "$0.00",
    date_due: "Mar 18, 2025",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Account Setup", price: "$0.00", quantity: 1, item_total: "$0.00" },
    ],
    subtotal: "$0.00",
    credit: "$0.00",
  },
  A273B943: {
    invoice_number: "BSM-6355",
    unique_id: "A273B943",
    date_issued: "Dec 6, 2024",
    date_paid: "Dec 6, 2024",
    payment_method: "Account Balance",
    status: "paid",
    total: "625 credits",
    date_due: "Dec 6, 2024",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Content Refresh Bundle (Credits)", price: "625 credits", quantity: 1, item_total: "625 credits" },
    ],
    subtotal: "625 credits",
    credit: "-625 credits",
  },
  "6061E693": {
    invoice_number: "BSM-6354",
    unique_id: "6061E693",
    date_issued: "Dec 5, 2024",
    date_paid: "Dec 5, 2024",
    payment_method: "Account Balance",
    status: "paid",
    total: "$0.00",
    date_due: "Dec 5, 2024",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Account Maintenance", price: "$0.00", quantity: 1, item_total: "$0.00" },
    ],
    subtotal: "$0.00",
    credit: "$0.00",
  },
  "2FCE73DE": {
    invoice_number: "BSM-6353",
    unique_id: "2FCE73DE",
    date_issued: "Dec 18, 2023",
    date_paid: "Dec 19, 2023",
    payment_method: "Account Balance",
    status: "paid",
    total: "$0.00",
    date_due: "Dec 19, 2023",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Platform Access", price: "$0.00", quantity: 1, item_total: "$0.00" },
    ],
    subtotal: "$0.00",
    credit: "$0.00",
  },
  "23861878": {
    invoice_number: "BSM-6352",
    unique_id: "23861878",
    date_issued: "Dec 18, 2023",
    date_paid: "Dec 19, 2023",
    payment_method: "Account Balance",
    status: "paid",
    total: "$0.00",
    date_due: "Dec 19, 2023",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "test",
      address_line_2: "test, test",
      state: "Alabama",
      country: "United States",
    },
    line_items: [
      { item_name: "Onboarding Fee", price: "$0.00", quantity: 1, item_total: "$0.00" },
    ],
    subtotal: "$0.00",
    credit: "$0.00",
  },
  C3210330: {
    invoice_number: "BSM-6351",
    unique_id: "C3210330",
    date_issued: "Dec 15, 2023",
    date_paid: "Dec 15, 2023",
    payment_method: "Credit Card",
    status: "void",
    total: "$6,007.50",
    date_due: "Dec 15, 2023",
    billed_to: {
      company_name: "BASE Marketing",
      company_description: "BASE Search Marketing",
      address_line_1: "2600 Executive Pkwy #100",
      address_line_2: "Lehi, UT 84043",
      state: "Utah",
      country: "United States",
    },
    line_items: [
      { item_name: "Full Scale SEO Plan", price: "$6,007.50", quantity: 1, item_total: "$6,007.50" },
    ],
    subtotal: "$6,007.50",
    credit: "$0.00",
  },
};

export function getInvoiceDetail(invoice_id: string): InvoiceDetail | undefined {
  return invoice_details[invoice_id];
}
