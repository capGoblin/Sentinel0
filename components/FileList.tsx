"use client";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Fragment, useState } from "react";
import type { File } from "@/store/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppKitProvider } from "@reown/appkit/react";
import abi from "@/lib/abi";
import { ethers } from "ethers-v5";
import { hexlify } from "ethers-v5/lib/utils";
import { generateKeys } from "@/lib/secretpath/generateKeys";
import { getPublicClientAddress } from "@/lib/secretpath/getPublicClientAddress";
import { constructPayload } from "@/lib/secretpath/constructPayload";
import { encryptPayload } from "@/lib/secretpath/encryptPayload";

export default function FileList() {
  const {
    currentPath,
    setCurrentPath,
    getFilesAtPath,
    getStarredFiles,
    toggleStarred,
    isUploading,
  } = useStore();
  const { walletProvider } = useAppKitProvider("eip155");

  // Get either starred files or regular files based on path
  const files =
    currentPath === "/starred"
      ? getStarredFiles()
      : getFilesAtPath(currentPath);

  const segments = getPathSegments(currentPath);

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareAddress, setShareAddress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        `/api/download-file?rootHash=${
          file.rootHash
        }&fileName=${encodeURIComponent(file.name)}`
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
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
    if (!file.rootHash) {
      alert("No root hash found for file");
      return;
    }
    setSelectedFile(file);
    setIsShareDialogOpen(true);
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!selectedFile?.rootHash) {
        throw new Error("No root hash found for file");
      }

      const txHash = await handleSubmit(
        `${currentPath}/${selectedFile.name}`,
        selectedFile.rootHash,
        // meaning it is shared with this address
        shareAddress + "(s)"
      );

      console.log(`File shared successfully! Transaction: ${txHash}`);

      // Reset form
      setShareAddress("");
      setSelectedFile(null);
      setIsShareDialogOpen(false);
    } catch (error) {
      console.error("Share failed:", error);
      alert("Failed to share file. Please try again.");
    }
  };

  async function handleSubmit(key: string, value: string, viewing_key: string) {
    const routing_contract = "secret1muslwwvtf954257ltlpsnvtucu77vgqh8ndpux";
    const routing_code_hash =
      "3e94dd717d6ad2b01bdc65fbe27e90dfd62e6eb5f0474c8310f95bafe5ec3ae8";
    const iface = new ethers.utils.Interface(abi);
    // @ts-expect-error Web3Provider type mismatch with walletProvider
    const provider = new ethers.providers.Web3Provider(walletProvider);

    const [myAddress] = await provider.send("eth_requestAccounts", []);

    const { userPublicKeyBytes, sharedKey } = await generateKeys();

    // @ts-expect-error Interface method type mismatch with ethers types
    const callbackSelector = iface.getSighash(
      iface.getFunction("upgradeHandler")
    );

    console.log("callbackSelector: ", callbackSelector);

    const callbackGasLimit = 90000;
    // The function name of the function that is called on the private contract
    const handle = "store_value";

    // Data are the calldata/parameters that are passed into the contract
    const data = JSON.stringify({
      key: key,
      value: value,
      viewing_key: viewing_key,
    });

    const chainId = (await provider.getNetwork()).chainId.toString();

    const publicClientAddress = await getPublicClientAddress(chainId);

    const callbackAddress = publicClientAddress.toLowerCase();
    console.log("callback address: ", callbackAddress);

    // Payload construction
    const payload = constructPayload(
      data,
      routing_contract,
      routing_code_hash,
      myAddress,
      userPublicKeyBytes,
      callbackAddress,
      callbackSelector,
      callbackGasLimit
    );

    const { payloadHash, _info } = await encryptPayload(
      payload,
      sharedKey,
      provider,
      myAddress,
      userPublicKeyBytes,
      routing_code_hash,
      handle,
      callbackGasLimit
    );

    const functionData = iface.encodeFunctionData("send", [
      payloadHash,
      myAddress,
      routing_contract,
      _info,
    ]);

    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    const gasFee =
      maxFeePerGas && maxPriorityFeePerGas
        ? maxFeePerGas.add(maxPriorityFeePerGas)
        : await provider.getGasPrice();
    let amountOfGas;
    let my_gas = 150000;

    if (chainId === "4202") {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(100000).div(2);
    } else if (chainId === "128123") {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(1000).div(2);
      my_gas = 15000000;
    } else if (chainId === "1287") {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(1000).div(2);
      my_gas = 15000000;
    } else if (chainId === "300") {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(100000).div(2);
      my_gas = 15000000;
    } else if (chainId === "5003") {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(1000000).div(2);
      my_gas = 1500000000;
    } else if (chainId === "80002") {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(100).div(2);
      console.log("amountOfGas: ", amountOfGas);
    } else if (chainId === "1995") {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(100).div(2);
      my_gas = 200000;
    } else if (chainId === "713715") {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(100).div(2);
      my_gas = 200000;
    } else {
      amountOfGas = gasFee.mul(callbackGasLimit).mul(3).div(2);
    }

    const tx_params = {
      gas: hexlify(my_gas),
      to: publicClientAddress,
      from: myAddress,
      value: hexlify(amountOfGas),
      data: functionData,
    };

    console.log("tx_params: ", tx_params.value);

    const txHash = await provider.send("eth_sendTransaction", [tx_params]);
    console.log(`Transaction Hash: ${txHash}`);

    return txHash;
  }

  const handleStar = (file: File) => {
    try {
      toggleStarred(file.id, currentPath);
    } catch (error) {
      console.error("Star operation failed:", error);
      alert("Failed to star item. Please try again.");
    }
  };

  // const generateShareLink = async (file: File) => {
  //   const baseUrl = window.location.origin;
  //   const shareToken = "unique-token";
  //   return `${baseUrl}/share/${shareToken}`;
  // };

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
                      <Image className="h-4 w-4" alt="File preview" />
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
                        <Star
                          className={`mr-2 h-4 w-4 ${
                            file.starred ? "fill-current" : ""
                          }`}
                        />
                        <span>{file.starred ? "Unstar" : "Star"}</span>
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

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <form onSubmit={handleShareSubmit}>
            <DialogHeader>
              <DialogTitle>Share {selectedFile?.name}</DialogTitle>
              <DialogDescription>
                Enter the wallet address to share this file with
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={shareAddress}
                onChange={(e) => setShareAddress(e.target.value)}
                placeholder="0x..."
                className="w-full"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsShareDialogOpen(false);
                  setShareAddress("");
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Share</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
