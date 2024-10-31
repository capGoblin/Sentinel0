"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Folder, Star, FileText, Plus } from "lucide-react";
import { useState, useRef } from "react";
import NewFolderDialog from "./NewFolderDialog";
import { useStore } from "@/store/store";
import {
  Blob,
  Indexer,
  getFlowContract,
} from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";

export default function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const { addFile, addFolder, setCurrentPath, currentPath } = useStore();

  const handleCreateFolder = (name: string) => {
    addFolder(name);
    setShowNewFolderDialog(false);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // First upload the file to 0g storage
      const rootHash = await uploadFile(file);
      console.log("File uploaded with root hash:", rootHash);

      // Determine file type
      const fileType: "text" | "image" = file.type.startsWith("image/")
        ? "image"
        : "text";

      // Create file entry with additional metadata
      addFile({
        name: file.name,
        type: fileType,
        owner: "me",
        lastModified: new Date().toLocaleDateString(),
        size: formatFileSize(file.size),
        // rootHash: rootHash, // Store the root hash for future reference
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      // You might want to add some error handling UI here
      alert("Failed to upload file. Please try again.");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  async function uploadFile(fileObj: File) {
    const formData = new FormData();
    formData.append('file', fileObj);

    const response = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const data = await response.json();
    return data.rootHash; // Return the root hash from the response
  }

  return (
    <div className="w-64 border-r p-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button className="w-full justify-start gap-2 mb-6" variant="outline">
            <Plus className="h-4 w-4" />
            New
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => setShowNewFolderDialog(true)}
          >
            <Folder className="h-4 w-4" />
            New folder
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="h-4 w-4" />
            File upload
          </Button>
        </PopoverContent>
      </Popover>

      <div className="space-y-2">
        <Button
          variant="ghost"
          className={`w-full justify-start ${
            currentPath === "/" ? "bg-muted" : ""
          }`}
          onClick={() => setCurrentPath("/")}
        >
          <Folder className="mr-2 h-4 w-4" />
          My Drive
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setCurrentPath("/starred")}
        >
          <Star className="mr-2 h-4 w-4" />
          Starred
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start opacity-50"
          onClick={() => setCurrentPath("/shared")}
        >
          <FileText className="mr-2 h-4 w-4" />
          Shared with me
        </Button>
      </div>
      <div className="mt-auto pt-4">
        <div className="text-xs text-muted-foreground">
          4.01 GB of 15 GB used
        </div>
      </div>
      <NewFolderDialog
        open={showNewFolderDialog}
        onOpenChange={setShowNewFolderDialog}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
}