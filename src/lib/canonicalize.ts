import { ethers } from "ethers";

/**
 * Report data structure for canonicalization
 */
export interface ReportData {
  reportType: "phishing_url" | "scam_wallet";
  targetValue: string;
  description: string;
  reporterAddress: string;
}

/**
 * Canonicalize a report into a deterministic string representation
 * This ensures the same report data always produces the same hash
 */
export function canonicalizeReport(data: ReportData): string {
  // Normalize the data
  const normalized = {
    reportType: data.reportType.toLowerCase().trim(),
    targetValue: data.targetValue.toLowerCase().trim(),
    description: data.description.trim(),
    reporterAddress: data.reporterAddress.toLowerCase().trim(),
  };

  // Create a deterministic JSON string (sorted keys)
  const canonical = JSON.stringify(normalized, Object.keys(normalized).sort());
  
  return canonical;
}

/**
 * Generate a bytes32 hash from report data for on-chain anchoring
 * Uses keccak256 to create a deterministic hash compatible with Solidity
 */
export function generateReportHash(data: ReportData): string {
  const canonical = canonicalizeReport(data);
  const hash = ethers.keccak256(ethers.toUtf8Bytes(canonical));
  return hash;
}

/**
 * Verify that a report hash matches the expected hash for given data
 */
export function verifyReportHash(
  data: ReportData,
  expectedHash: string
): boolean {
  const computedHash = generateReportHash(data);
  return computedHash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Normalize a URL for consistent reporting
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slashes, normalize protocol
    return urlObj.href.replace(/\/$/, "").toLowerCase();
  } catch {
    // If not a valid URL, just normalize the string
    return url.toLowerCase().trim();
  }
}

/**
 * Normalize a wallet address (checksum format)
 */
export function normalizeWalletAddress(address: string): string {
  try {
    return ethers.getAddress(address); // Returns checksummed address
  } catch {
    return address.toLowerCase().trim();
  }
}
