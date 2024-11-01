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
import { Blob, Indexer, getFlowContract } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers-v5";
import { hexlify } from "ethers-v5/lib/utils";
import abi from "@/lib/abi.js";
import { generateKeys } from "@/lib/secretpath/generateKeys";
import { getPublicClientAddress } from "@/lib/secretpath/getPublicClientAddress";
import { constructPayload } from "@/lib/secretpath/constructPayload";
import { encryptPayload } from "@/lib/secretpath/encryptPayload";
import { SecretNetworkClient } from "secretjs";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";

export default function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const { addFile, addFolder, setCurrentPath, currentPath } = useStore();
  const { address, caipAddress, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");

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
      const { setUploading } = useStore.getState();
      setUploading(true);

      // First upload the file to 0g storage
      const rootHash = await uploadFile(file);
      console.log("File uploaded with root hash:", rootHash);

      // const rootHash = "0x1234567890abcdef";
      // const txHash = await handleSubmit(
      //   `${currentPath}/${file.name}`,
      //   rootHash,
      //   "address"
      // );
      // console.log("Transaction hash:", txHash);

      // const query_tx = await handleQuery(
      //   `${currentPath}/${file.name}`,
      //   "address"
      // );
      // console.log("Query result:", query_tx);

      // Create file entry with additional metadata
      addFile({
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "text",
        owner: "me",
        lastModified: new Date().toLocaleDateString(),
        size: formatFileSize(file.size),
        rootHash: rootHash, // Store the root hash for future reference
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      const { setUploading } = useStore.getState();
      setUploading(false);
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
    formData.append("file", fileObj);

    const response = await fetch("/api/upload-file", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    const data = await response.json();
    return data.rootHash; // Return the root hash from the response
  }


  async function handleSubmit(key: string, value: string, viewing_key: string) {
    const routing_contract = "secret1j0gpu6tlwnc9fw55wcfsfuml00kqpcnqz7dck7";
    const routing_code_hash =
      "6311a3f85261fc720d9a61e4ee46fae1c8a23440122b2ed1bbcebf49e3e46ad2";
    const iface = new ethers.utils.Interface(abi);
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(walletProvider);

  
    const [myAddress] = await provider.send("eth_requestAccounts", []);
  
    const { userPrivateKeyBytes, userPublicKeyBytes, sharedKey } =
      await generateKeys();
  
    // @ts-ignore
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
  
    const { ciphertext, payloadHash, payloadSignature, _info } =
      await encryptPayload(
        payload,
        sharedKey,
        provider,
        myAddress,
        userPublicKeyBytes,
        routing_code_hash,
        handle,
        callbackGasLimit,
        iface,
        callbackSelector
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



const handleQuery = async (key: string, viewingKey: string) => {
  let query_tx;
  try {
    const secretjs = new SecretNetworkClient({
      url: "https://lcd.testnet.secretsaturn.net",
      chainId: "pulsar-3",
    });

    query_tx = await secretjs.query.compute.queryContract({
      contract_address: "secret1j0gpu6tlwnc9fw55wcfsfuml00kqpcnqz7dck7",
      code_hash:
        "6311a3f85261fc720d9a61e4ee46fae1c8a23440122b2ed1bbcebf49e3e46ad2",
      query: {
        retrieve_value: {
          key: key,
          viewing_key: viewingKey,
        },
      },
    });

    console.log(query_tx);
  } catch (error) {
    console.error("Query failed", error);
  }

  return query_tx;
};
