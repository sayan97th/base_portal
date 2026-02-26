export type NotificationType = "payment" | "post" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  preview_text?: string;
  date: string;
  relative_time: string;
  is_read: boolean;
  is_archived: boolean;
  is_snoozed: boolean;
  link: string;
}

export const notification_list: Notification[] = [
  {
    id: "1",
    type: "payment",
    message: "Jesse Relkin paid $283.50 for invoice #100E0B15.",
    date: "Feb 25th '26 at 9:00 am",
    relative_time: "8 hours ago",
    is_read: false,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "2",
    type: "payment",
    message: "Moshe Danzinger paid $2,000.00 for invoice #3FBCD0F0.",
    date: "Feb 24th '26 at 3:15 pm",
    relative_time: "1 day ago",
    is_read: false,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "3",
    type: "payment",
    message: "Andrew Cuthbert paid $0.00 for invoice #5A11725D.",
    date: "Feb 24th '26 at 10:30 am",
    relative_time: "1 day ago",
    is_read: false,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "4",
    type: "payment",
    message: "Natalia Real paid $1,980.00 for invoice #37190412.",
    date: "Feb 20th '26 at 2:45 pm",
    relative_time: "5 days ago",
    is_read: false,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "5",
    type: "post",
    message:
      "BASE Search Marketing posted a message in \uD83D\uDED1 Google, Bing, and AI search updates",
    preview_text:
      "Essential SEO tips, news, and memes\u2014straight to your inbox every other week...",
    date: "Feb 19th '26 at 11:00 am",
    relative_time: "6 days ago",
    is_read: true,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "6",
    type: "payment",
    message: "Mary Rae Canapi paid $12,500.00 for invoice #B32CC256.",
    date: "Feb 18th '26 at 9:30 am",
    relative_time: "1 week ago",
    is_read: true,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "7",
    type: "payment",
    message: "Nick Mendivil paid $4,350.00 for invoice #0B1855BC.",
    date: "Feb 18th '26 at 8:15 am",
    relative_time: "1 week ago",
    is_read: true,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "8",
    type: "post",
    message:
      "BASE Search Marketing posted a message in DA 30+ (Credit)",
    preview_text:
      "New content opportunities available for your review and approval.",
    date: "Feb 17th '26 at 4:00 pm",
    relative_time: "1 week ago",
    is_read: true,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "9",
    type: "payment",
    message: "Sarah Mitchell paid $750.00 for invoice #A9C3D1E2.",
    date: "Feb 15th '26 at 1:20 pm",
    relative_time: "10 days ago",
    is_read: true,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "10",
    type: "system",
    message: "Please complete your order",
    date: "Feb 10th '26 at 2:00 pm",
    relative_time: "2 weeks ago",
    is_read: true,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "11",
    type: "payment",
    message: "David Chen paid $3,200.00 for invoice #7F4E8A91.",
    date: "Feb 8th '26 at 10:45 am",
    relative_time: "2 weeks ago",
    is_read: true,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
  {
    id: "12",
    type: "post",
    message:
      "BASE Search Marketing posted a message in OptimizedPlus 500 Words (Credits)",
    preview_text:
      "Updated guidelines for optimized content delivery and performance tracking.",
    date: "Feb 5th '26 at 3:30 pm",
    relative_time: "3 weeks ago",
    is_read: true,
    is_archived: false,
    is_snoozed: false,
    link: "#",
  },
];
