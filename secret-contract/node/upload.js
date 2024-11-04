import { SecretNetworkClient, Wallet, coinsFromString } from "secretjs"
import * as fs from "fs"

const wallet = new Wallet("radar injury pond there dad trick language ritual domain supreme tell ring")

const contract_wasm = fs.readFileSync("./contract.wasm.gz")

const gatewayAddress = "secret10ex7r7c4y704xyu086lf74ymhrqhypayfk7fkj"

const gatewayHash = "ad8ca07ffba1cb26ebf952c29bc4eced8319c171430993e5b5089887f27b3f70"

const gatewayPublicKey = "0x046d0aac3ef10e69055e934ca899f508ba516832dc74aa4ed4d741052ed5a568774d99d3bfed641a7935ae73aac8e34938db747c2f0e8b2aa95c25d069a575cc8b"

const gatewayPublicKeyBytes = Buffer.from(gatewayPublicKey.substring(2), "hex").toString("base64")

const secretjs = new SecretNetworkClient({
  chainId: "pulsar-3",
  url: "https://api.pulsar3.scrttestnet.com",
  wallet: wallet,
  walletAddress: wallet.address,
})

// Declare global variables
let codeId
let contractCodeHash
let contractAddress

let upload_contract = async () => {
  console.log("Starting deployment…")

  let tx = await secretjs.tx.compute.storeCode(
    {
      sender: wallet.address,
      wasm_byte_code: contract_wasm,
      source: "",
      builder: "",
    },
    {
      gasLimit: 4_000_000,
    },
  )

  codeId = Number(tx.arrayLog.find((log) => log.type === "message" && log.key === "code_id").value)
  console.log("codeId: ", codeId)

  contractCodeHash = (await secretjs.query.compute.codeHashByCodeId({ code_id: codeId })).code_hash
  console.log(`Contract hash: ${contractCodeHash}`)
}

let instantiate_contract = async () => {
  if (!codeId || !contractCodeHash) {
    throw new Error("codeId or contractCodeHash is not set.")
  }
  console.log("Instantiating contract…")

  let init = {
    gateway_address: gatewayAddress,
    gateway_hash: gatewayHash,
    gateway_key: gatewayPublicKeyBytes,
  }
  let tx = await secretjs.tx.compute.instantiateContract(
    {
      code_id: codeId,
      sender: wallet.address,
      code_hash: contractCodeHash,
      init_msg: init,
      label: "SecretPath KV Store " + Math.ceil(Math.random() * 10000),
    },
    {

      gasLimit: 400_000,
    },
  )

  //Find the contract_address in the logs
  const contractAddress = tx.arrayLog.find((log) => log.type === "message" && log.key === "contract_address").value

  console.log("contract address: ", contractAddress)
}

// Chain the execution using promises
upload_contract()
  .then(() => {
    instantiate_contract()
  })
  .catch((error) => {
    console.error("Error:", error)
  })

// Contract hash: 6994d8ff9ed1af73ef4685a9f5c8a5568804afb5fa5ce49ec8496fb271a9760a

// contract address:  secret1neeyum9p9h6u0d5jkxlqx9w5nrz49hzrr63jsw
