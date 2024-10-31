import { getFlowContract, Blob, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  // Here you would handle the file upload logic
  // For example, upload to your storage solution and return the root hash
  const rootHash = await uploadToStorage(file as File); // Implement this function

  return NextResponse.json({ rootHash });
}

// Implement your file upload logic here
async function uploadToStorage(fileObj: File) {
    const evmRpc = "https://16600.rpc.thirdweb.com/";
    const privateKey = "02a54cdd4ace57710f864a8e63eeca0ae82cc05dbfd125be94c11c0c804b5462";
    const flowAddr = "0x0460aA47b41a66694c0a73f667a1b795A5ED3556";
    const indRpc = "https://indexer-storage-testnet-standard.0g.ai";
  
    // Use ethers v5 for everything since 0g-ts-sdk requires it
    const provider = new ethers.JsonRpcProvider(evmRpc);
    const signer = new ethers.Wallet(privateKey, provider);
    const flowContract = getFlowContract(flowAddr, signer);
    
    const indexer = new Indexer(indRpc);
  
    const file = new Blob(fileObj);
    const [tree, treeErr] = await file.merkleTree();
  
    if (treeErr) {
      throw new Error(`Error creating merkle tree: ${treeErr}`);
    }
  
    console.log("File Root Hash: ", tree!.rootHash());
  
    var [tx, err] = await indexer.upload(file, 0, evmRpc, flowContract);
    if (err === null) {
      console.log("File uploaded successfully, tx: ", tx);
    } else {
      console.log("Error uploading file: ", err);
    }
  
    return tree!.rootHash();
}
