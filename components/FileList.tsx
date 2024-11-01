"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Folder,
  Image,
  FileText,
  MoreVertical,
  ChevronLeft,
  Download,
  Share2,
  Star,
} from "lucide-react";
import { useStore, getParentPath, getPathSegments } from "@/store/store";
import { Fragment } from "react";
import type { File } from "@/store/store";

export default function FileList() {
  const { currentPath, setCurrentPath, getFilesAtPath, isUploading } =
    useStore();
  const files = getFilesAtPath(currentPath);
  const segments = getPathSegments(currentPath);

  const navigateToFolder = (folderName: string) => {
    const newPath =
      currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
  };

  const handleDownload = async (file: File) => {
    try {
      if (file.type === "folder") {
        alert("Folder download not supported yet");
        return;
      }

      if (!file.rootHash) {
        throw new Error("No root hash found for file");
      }

      const response = await fetch(
        `/api/download-file?rootHash=${file.rootHash}&fileName=${encodeURIComponent(file.name)}`
      );
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file. Please try again.");
    }
  };

  const handleShare = async (file: File) => {
    try {
      const shareLink = await generateShareLink(file);
      
      await navigator.clipboard.writeText(shareLink);
      alert("Share link copied to clipboard!");
    } catch (error) {
      console.error("Share failed:", error);
      alert("Failed to share file. Please try again.");
    }
  };

  const handleStar = (file: File) => {
    // try {
    //   const { toggleStarred } = useStore.getState();
    //   toggleStarred(file.id, currentPath);
    // } catch (error) {
    //   console.error("Star operation failed:", error);
    //   alert("Failed to star item. Please try again.");
    // }
  };

  const generateShareLink = async (file: File) => {
    const baseUrl = window.location.origin;
    const shareToken = "unique-token";
    return `${baseUrl}/share/${shareToken}`;
  };

  const LoadingSkeleton = () => (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[100px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[100px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[50px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded-full" />
      </TableCell>
    </TableRow>
  );

  return (
    <>
      {/* Breadcrumb navigation */}
      <div className="sticky top-0 bg-background p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPath(getParentPath(currentPath))}
            disabled={currentPath === "/"}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-1">
            {segments.map((segment, index) => (
              <Fragment key={segment}>
                <span>/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newPath =
                      "/" + segments.slice(0, index + 1).join("/");
                    setCurrentPath(newPath);
                  }}
                >
                  {segment}
                </Button>
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="p-4">
        <Table>
          <TableBody>
            {files.map((file) => (
              <TableRow
                key={file.id}
                className={file.type === "folder" ? "cursor-pointer" : ""}
                onClick={() => {
                  if (file.type === "folder") {
                    navigateToFolder(file.name);
                  }
                }}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {file.type === "folder" ? (
                      <Folder className="h-4 w-4" />
                    ) : file.type === "image" ? (
                      <Image className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {file.name}
                  </div>
                </TableCell>
                <TableCell>{file.owner}</TableCell>
                <TableCell>{file.lastModified}</TableCell>
                <TableCell>{file.size}</TableCell>
                <TableCell>
                <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleDownload(file)}>
                          <Download className="mr-2 h-4 w-4" />
                          <span>Download</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleShare(file)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          <span>Share</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleStar(file)}>
                          <Star className="mr-2 h-4 w-4" />
                          <span>Star</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {isUploading && (
              <>
                <LoadingSkeleton />
                {/* <LoadingSkeleton /> */}
                {/* <LoadingSkeleton /> */}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
