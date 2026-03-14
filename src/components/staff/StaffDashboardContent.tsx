"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  GroupIcon,
  DollarLineIcon,
  ListIcon,
  ChatIcon,
  TaskIcon,
} from "@/icons/index";

type StatCard = {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
};

const stat_cards: StatCard[] = [
  {
    label: "Total Users",
    value: "—",
    description: "Registered platform users",
    icon: <GroupIcon />,
    href: "/staff/users",
    color: "bg-brand-500",
  },
  {
    label: "Organizations",
    value: "—",
    description: "Active client organizations",
    icon: <TaskIcon />,
    href: "/staff/organizations",
    color: "bg-success-500",
  },
  {
    label: "Open Orders",
    value: "—",
    description: "Orders awaiting action",
    icon: <ListIcon />,
    href: "/staff/orders",
    color: "bg-warning-500",
  },
  {
    label: "Pending Invoices",
    value: "—",
    description: "Invoices awaiting payment",
    icon: <DollarLineIcon />,
    href: "/staff/invoices",
    color: "bg-error-500",
  },
];

const quick_actions = [
  {
    label: "Invite Team Member",
    description: "Send an invitation to a new staff member",
    href: "/staff/invitations",
    icon: <ChatIcon />,
  },
  {
    label: "View All Users",
    description: "Browse and manage platform users",
    href: "/staff/users",
    icon: <GroupIcon />,
  },
  {
    label: "Manage Organizations",
    description: "Review and edit client organizations",
    href: "/staff/organizations",
    icon: <TaskIcon />,
  },
];

export default function StaffDashboardContent() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Staff Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back,{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {user?.first_name}
          </span>
          . Here is your operations overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stat_cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color} text-white`}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {card.value}
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {card.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quick_actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                {action.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Staff portal info banner */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 dark:border-brand-900/30 dark:bg-brand-500/5">
        <p className="text-sm font-medium text-brand-700 dark:text-brand-400">
          You are viewing the Staff Portal.
        </p>
        <p className="mt-1 text-xs text-brand-600 dark:text-brand-500">
          This area is restricted to authorized team members only. Use the
          navigation to manage users, organizations, and team invitations.
        </p>
      </div>
    </div>
  );
}
