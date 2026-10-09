/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Spatial Intensity Clustering & Deduplication Utilities
 * 
 * Strict Heuristic Guardrails:
 * 1. Anti-Duplication: Identifies duplicate filings from the same citizen (phoneHash match)
 * 2. Spatial & LGD Clustering: Clusters reports within the same Gram Panchayat (LGD Code)
 *    or within 1000 meters (1 km) radius into a Master Issue.
 * 3. Citizen Impact Counter: Automatically increments intensityScore for clustered community issues.
 */

import { OfflineDraftSubmission } from '../types/ingestion';

export interface ClusteringResult {
  /** True if the filing originates from the exact same phoneHash and target challenge */
  isDuplicate: boolean;
  /** UUID of the existing Master Issue card that this report clusters into */
  clusteredMasterId?: string;
  /** Computed Citizen Impact Counter (intensityScore) */
  updatedIntensity: number;
}

const CLUSTERING_RADIUS_METERS = 1000; // 1 km radius

/**
 * Calculates spatial distance between two geographic coordinates in meters
 * using the spherical Haversine formula.
 * 
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Great-circle distance in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const R = 6371e3; // Earth's mean radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Evaluates whether a new draft submission is a duplicate of an existing record
 * or belongs to an existing localized community cluster.
 * 
 * @param existingSubmissions Array of currently stored draft submissions in IndexedDB
 * @param newSubmission The incoming draft submission to evaluate
 * @returns ClusteringResult with deduplication flag and updated intensity score
 */
export function calculateIntensityScore(
  existingSubmissions: OfflineDraftSubmission[],
  newSubmission: OfflineDraftSubmission
): ClusteringResult {
  if (!existingSubmissions || existingSubmissions.length === 0) {
    return {
      isDuplicate: false,
      updatedIntensity: 1,
    };
  }

  const newLat = newSubmission.rawCoordinates.latitude;
  const newLon = newSubmission.rawCoordinates.longitude;
  const newPanchayatCode = newSubmission.lgdLocation?.panchayatCode;
  const newCategory = (newSubmission.aiTriageCategory || '').toLowerCase();

  // 1. Exact Duplicate Verification (Same citizen phoneHash)
  for (const existing of existingSubmissions) {
    if (existing.id === newSubmission.id) continue;

    if (existing.phoneHash === newSubmission.phoneHash) {
      const existingCategory = (existing.aiTriageCategory || '').toLowerCase();
      const isSameCategory = existingCategory === newCategory;

      const distance = calculateDistanceMeters(
        existing.rawCoordinates.latitude,
        existing.rawCoordinates.longitude,
        newLat,
        newLon
      );

      // Same phone and (same problem category OR within 1 km)
      if (isSameCategory || distance <= CLUSTERING_RADIUS_METERS) {
        return {
          isDuplicate: true,
          clusteredMasterId: existing.id,
          updatedIntensity: existing.intensityScore || 1,
        };
      }
    }
  }

  // 2. Spatial & LGD Cluster Matching (Different citizens reporting shared issue)
  const matchingClusterCandidates: OfflineDraftSubmission[] = [];

  for (const existing of existingSubmissions) {
    if (existing.id === newSubmission.id) continue;
    // Skip if marked as spam or rejected
    if (existing.masterLifecycleStatus === 'REJECTED_SPAM') continue;

    const existingCategory = (existing.aiTriageCategory || '').toLowerCase();
    const isSameCategory = !newCategory || !existingCategory || existingCategory === newCategory;

    if (!isSameCategory) continue;

    // Check LGD Panchayat code match
    const existingPanchayatCode = existing.lgdLocation?.panchayatCode;
    const isSamePanchayat =
      newPanchayatCode &&
      existingPanchayatCode &&
      newPanchayatCode === existingPanchayatCode;

    // Check GPS spatial proximity (<1000m)
    const distance = calculateDistanceMeters(
      existing.rawCoordinates.latitude,
      existing.rawCoordinates.longitude,
      newLat,
      newLon
    );
    const isWithinRadius = distance <= CLUSTERING_RADIUS_METERS;

    if (isSamePanchayat || isWithinRadius) {
      matchingClusterCandidates.push(existing);
    }
  }

  if (matchingClusterCandidates.length > 0) {
    // Select the primary cluster root (earliest timestamp or already endorsed/synced)
    matchingClusterCandidates.sort((a, b) => {
      // Prioritize already endorsed or synced master issues
      if (a.masterLifecycleStatus === 'ENDORSED_MASTER' && b.masterLifecycleStatus !== 'ENDORSED_MASTER') {
        return -1;
      }
      if (b.masterLifecycleStatus === 'ENDORSED_MASTER' && a.masterLifecycleStatus !== 'ENDORSED_MASTER') {
        return 1;
      }
      return a.timestamp - b.timestamp;
    });

    const primaryMaster = matchingClusterCandidates[0];
    const updatedIntensity = (primaryMaster.intensityScore || 1) + 1;

    return {
      isDuplicate: false,
      clusteredMasterId: primaryMaster.id,
      updatedIntensity,
    };
  }

  // 3. Isolated Single Citizen Issue
  return {
    isDuplicate: false,
    updatedIntensity: 1,
  };
}
