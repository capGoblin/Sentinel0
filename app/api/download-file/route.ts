import { getFlowContract, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { NextResponse } from 'next/server';
import { unlink, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rootHash = searchParams.get('rootHash');
  const fileName = searchParams.get('fileName');

  if (!rootHash || !fileName) {
    return NextResponse.json({ error: 'Root hash and file name are required' }, { status: 400 });
  }

  try {
    const fileData = await downloadFromStorage(rootHash, fileName);
    
    return new Response(fileData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

async function downloadFromStorage(rootHash: string, fileName: string) {
  const evmRpc = "https://16600.rpc.thirdweb.com/";
  const privateKey = "02a54cdd4ace57710f864a8e63eeca0ae82cc05dbfd125be94c11c0c804b5462";
  const flowAddr = "0x0460aA47b41a66694c0a73f667a1b795A5ED3556";
  const indRpc = "https://indexer-storage-testnet-standard.0g.ai";

  const provider = new ethers.JsonRpcProvider(evmRpc);
  const signer = new ethers.Wallet(privateKey, provider);
  const flowContract = getFlowContract(flowAddr, signer);
  const indexer = new Indexer(indRpc);

  // Create a temporary file path with the original filename
  const tempDir = os.tmpdir();
  const tempFilePath = join(tempDir, fileName);

  // Download the file
  const err = await indexer.download(rootHash, tempFilePath, false);
  if (err !== null) {
    throw new Error(`Error downloading file: ${err}`);
  }

  // Read the file data
  const fileData = await readFile(tempFilePath);

  // Clean up the temporary file
  try {
    await unlink(tempFilePath);
  } catch (error) {
    console.error('Error cleaning up temp file:', error);
  }

  return fileData;
}
