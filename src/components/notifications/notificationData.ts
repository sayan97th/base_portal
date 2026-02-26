export interface Notification {
  id: string;
  message: string;
  date: string;
  is_read: boolean;
  link: string;
}

export const notification_list: Notification[] = [
  {
    id: "1",
    message: "BASE Search Marketing posted a message in DA 30+ (Credit)",
    date: "May 2nd '25 at 2:09 pm",
    is_read: false,
    link: "#",
  },
  {
    id: "2",
    message: "BASE Search Marketing posted a message in DA 30+ (Credit)",
    date: "May 2nd '25 at 2:09 pm",
    is_read: false,
    link: "#",
  },
  {
    id: "3",
    message:
      "BASE Search Marketing posted a message in OptimizedPlus 500 Words (Credits)",
    date: "Apr 17th '25 at 10:50 am",
    is_read: false,
    link: "#",
  },
  {
    id: "4",
    message:
      "BASE Search Marketing posted a message in Organic Performance Brief (Credits)",
    date: "Apr 16th '25 at 10:51 am",
    is_read: false,
    link: "#",
  },
  {
    id: "5",
    message:
      "BASE Search Marketing posted a message in Current Content Word Count 0-799 (Credits)",
    date: "Apr 14th '25 at 10:51 am",
    is_read: false,
    link: "#",
  },
  {
    id: "6",
    message: "Please complete your order",
    date: "Dec 16th '23 at 2:00 pm",
    is_read: true,
    link: "#",
  },
];
