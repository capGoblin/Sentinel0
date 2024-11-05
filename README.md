# Sentinel0 - Your Super secure and lightweight digital storage.

## What?

Sentinel0, is a decentralized file storage application that leverages **0G's storage layer** and **Secret Network's Decentralized Confidential Computing (DeCC) layer**. It is designed to ensure data privacy while empowering users with complete ownership of their files. Using **0G Storage** for decentralized file management and **Secret Network** for privacy, our app securely stores user files in a decentralized format, allowing users to share, access, and control their data with full ownership. Each file’s integrity is maintained by generating a unique root hash, which is encrypted and securely stored in the Secret Network, ensuring that only authorized addresses can access it. Additionally, **SecretPath** facilitates the seamless transfer of encrypted data **from any EVM chains to the Secret Network**. This means users get all the benefits of decentralized storage with privacy that’s typically missing in Web3 solutions.


https://github.com/user-attachments/assets/94050f69-2018-40c8-a852-a9e2b7daee31

## What is 0G Storage?

**0G Storage** is an infinitely scalable, decentralized storage solution designed for Web3 applications, offering fast, reliable, and affordable data access. It utilizes a sample-driven consensus mechanism and erasure coding to ensure high throughput, data redundancy, and integrity, making it ideal for data-heavy, performance-centric applications. With a cost of $10-11 per TB, it is significantly more affordable than alternatives like Arweave and Filecoin, which can reach up to $17,000 per TB.

Compared to competitors, 0G excels in scalability, cost efficiency, and data availability. While Filecoin and Arweave are optimized for unstructured data, 0G supports both structured and unstructured data, enabling use cases in complex AI workflows and large databases. Its integrated data availability layer ensures ultra-fast access, making it the preferred choice for high-performance decentralized applications.

## What is Secret Network?

**Secret Network** is a privacy-focused blockchain platform that enhances data confidentiality for decentralized applications by integrating encryption directly into its core. This ensures that only authorized users can access sensitive information, providing a level of data security unmatched by traditional and many Web3 solutions.

When combined with 0G Storage, Secret Network enables the encrypted, on-chain storage of file root hashes, allowing **only** users with the correct viewing key (and to those you’ve shared with) can decrypt and access file information. This integration of privacy ensures that user data isn’t just stored on-chain—it’s stored safely, out of reach of unauthorized eyes, creating a truly decentralized, private Google Drive experience.

## Why with 0G Storage and Secret Network

We chose **0G Storage** for its unique advantages, making it the ideal choice for decentralized applications. The combination with **Secret Network** enhances these benefits, providing a comprehensive solution for privacy-focused applications:

- **Infinite Scalability & Performance**: 0G Storage offers limitless scalability and fast, real-time data retrieval, making it ideal for data-heavy, high-performance dApps.

- **Affordable Costs**: With a flexible pricing model, 0G Storage keeps storage costs low and predictable, unlike many Web2 services.

- **Encrypted File Storage with Privacy Keys**: Root hashes of files are securely stored on **Secret Network** and encrypted, allowing access solely through user-specific viewing keys. Only authorized users can access sensitive file information.

- **SecretPath for EVM Cross-Chain Access**: Through **SecretPath**, users can access their stored data from low-fee EVM-compatible chains, adding convenience and flexibility for cross-chain interactions.

- **Secure File Sharing**: Unique viewing keys facilitate secure and efficient file sharing, simplifying the process while minimizing vulnerabilities often seen in traditional permission systems.

This integration of **0G Storage** and **Secret Network** ensures that user data is not only securely stored but also maintained with complete confidentiality, creating a robust solution for users seeking control over their data in a decentralized environment.


## File Upload and Sharing Functionality Code

**Upload Functionality**:
The upload function facilitates the seamless integration of 0G Storage into our application. When a user uploads a file, this function not only handles the upload process but also generates a unique root hash for the file. This root hash is subsequently stored in our Secret Network contract by invoking the store_value function. For implementation details, refer to the `handleFileUpload` function in the [Sidebar component](https://github.com/capGoblin/Sentinel0/blob/5d77cea1853e16560e255450e31b432c35606362/components/Sidebar.tsx#L36-L90).

**Storing Root Hash**:
The `store_value` function in our Secret Network contract plays a crucial role in maintaining data integrity. It is responsible for securely storing the generated root hash associated with each uploaded file. This ensures that the file's identity is protected and can only be accessed by authorized users. For more information, check out the `store_value` function in [Secret contract](https://github.com/capGoblin/Sentinel0/blob/5d77cea1853e16560e255450e31b432c35606362/secret-contract/src/contract.rs#L117-L173).

**Sharing Functionality**:
Our application also includes a function for sharing the root hash of files with other users. This enables secure file sharing by allowing users to grant access to their files without compromising ownership or privacy. The share function manages the transfer of the root hash to the specified address, facilitating a safe and efficient sharing process. For further details, see the `handleShareSubmit` function in the [File List component](https://github.com/capGoblin/Sentinel0/blob/5d77cea1853e16560e255450e31b432c35606362/components/FileList.tsx#L126-L151).
