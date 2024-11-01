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
  Folder,
  Image,
  FileText,
  MoreVertical,
  ChevronLeft,
} from "lucide-react";
import { useStore, getParentPath, getPathSegments } from "@/store/store";
import { Fragment } from "react";

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
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
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
