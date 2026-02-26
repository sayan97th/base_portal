"use client";

import React, { useState } from "react";
import TrackingStatsCards from "./TrackingStatsCards";
import TrackingTimeline from "./TrackingTimeline";
import TrackingTable from "./TrackingTable";
import TrackingRecordDetail from "./TrackingRecordDetail";
import { CallRecord, call_records_list } from "./keepingTrackData";

const KeepingTrackPage: React.FC = () => {
  const [records] = useState<CallRecord[]>(call_records_list);
  const [selected_record, setSelectedRecord] = useState<CallRecord | null>(
    null
  );
  const [is_detail_open, setIsDetailOpen] = useState(false);

  const handleViewDetail = (record: CallRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedRecord(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Keeping Track
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor, manage, and follow up on all your scheduled call records in
          one place.
        </p>
      </div>

      {/* Stats Overview */}
      <TrackingStatsCards records={records} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Timeline - Sidebar */}
        <div className="xl:col-span-1">
          <TrackingTimeline records={records} />
        </div>

        {/* Table - Main Area */}
        <div className="xl:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
            <TrackingTable
              records={records}
              onViewDetail={handleViewDetail}
            />
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <TrackingRecordDetail
        record={selected_record}
        is_open={is_detail_open}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

export default KeepingTrackPage;
