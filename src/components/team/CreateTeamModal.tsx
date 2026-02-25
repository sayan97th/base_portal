"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";

interface CreateTeamModalProps {
  is_open: boolean;
  onClose: () => void;
  onSave: (team_name: string) => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  is_open,
  onClose,
  onSave,
}) => {
  const [team_name, setTeamName] = useState("");

  const handleSave = () => {
    if (team_name.trim()) {
      onSave(team_name.trim());
      setTeamName("");
    }
  };

  const handleClose = () => {
    setTeamName("");
    onClose();
  };

  return (
    <Modal
      isOpen={is_open}
      onClose={handleClose}
      showCloseButton={false}
      className="max-w-lg w-full p-6 lg:p-8"
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="team_name">Name</Label>
          <Input
            id="team_name"
            name="team_name"
            type="text"
            placeholder="Enter team name"
            defaultValue={team_name}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!team_name.trim()}
          >
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateTeamModal;
