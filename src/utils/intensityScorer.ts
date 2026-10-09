/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Spatial Intensity Clustering & Deduplication Utilities
 * 
 * Sprint 6 - Task 6.3: Cross-Device Intensity Scoring & Spatial Clustering
 * - Haversine Formula Spherical Distance (pure Math, zero GIS dependencies)
 * - Distributed Deduplication & Clustering Engine:
 *   * Proximity Threshold: <= 1.0 km (1000m) or exact matching LGD panchayatCode
 *   * Duplicate Rule: Same phoneHash on same cluster = duplicate notification (no score inflation)
 *   * Impact Aggregation: Distinct phoneHash within radius = Master Issue cluster increment (intensityScore + 1)
 */

import { OfflineDraftSubmission, SeverityLevel } from '../types/ingestion';

export interface ClusterEvaluationResult {
  /** True if filing matches existing phoneHash within radius/panchayat */
  isDirectUserDuplicate: boolean;
  /** True if distinct citizen filing should merge into existing Master Issue */
  shouldMergeIntoMaster: boolean;
  /** ID of target Master Issue if merged or duplicated */
  targetMasterIssueId?: string;
  /** Computed intensity score after evaluation */
  newIntensityScore: number;
  /** Reason for clustering classification */
  clusterReason: 'SAME_USER_REPEAT' | 'SPATIAL_PROXIMITY_MERGE' | 'NEW_ISOLATED_INCIDENT';
  /** Distance in meters between incoming and matched master issue */
  distanceMeters?: number;
}

export interface ClusteringResult {
  isDuplicate: boolean;
  clusteredMasterId?: string;
  updatedIntensity: number;
}

export const CLUSTERING_RADIUS_METERS = 1000; // 1.0 km radius

/**
 * Calculates great-circle spatial distance between two geographic coordinates in meters
 * using the spherical Haversine formula (pure Math, zero external GIS dependencies).
 * 
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Great-circle distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const R = 6371e3; // Earth's mean radius in meters
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaPhi = (lat2 - lat1) * toRad;
  const deltaLambda = (lon2 - lon1) * toRad;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Direct aliases for backward-compatibility & task specification compliance
export const calculateDistanceMeters = calculateHaversineDistance;
export const haversineDistanceMeters = calculateHaversineDistance;

/**
 * Severity ranking order helper: returns numeric weight (CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1)
 */
export function getSeverityRank(severity?: SeverityLevel): number {
  switch (severity) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 1;
    default:
      return 0;
  }
}

/**
 * Resolves the higher of two statutory severity levels to prevent down-ranking on merges
 */
export function resolveHighestSeverity(
  sev1?: SeverityLevel,
  sev2?: SeverityLevel
): SeverityLevel | undefined {
  if (!sev1) return sev2;
  if (!sev2) return sev1;
  return getSeverityRank(sev1) >= getSeverityRank(sev2) ? sev1 : sev2;
}

/**
 * Evaluates whether an incoming draft submission is a duplicate of an existing record
 * or belongs to an existing localized community cluster across distributed nodes.
 * 
 * @param incoming The incoming draft submission to evaluate
 * @param existingIssues Array of currently stored draft submissions
 * @returns ClusterEvaluationResult with deduplication flag, target master ID, and updated intensity score
 */
export function evaluateClusterAssignment(
  incoming: OfflineDraftSubmission,
  existingIssues: OfflineDraftSubmission[]
): ClusterEvaluationResult {
  if (!existingIssues || existingIssues.length === 0) {
    return {
      isDirectUserDuplicate: false,
      shouldMergeIntoMaster: false,
      newIntensityScore: 1,
      clusterReason: 'NEW_ISOLATED_INCIDENT',
    };
  }

  const inLat = incoming.rawCoordinates?.latitude ?? 0;
  const inLon = incoming.rawCoordinates?.longitude ?? 0;
  const inPanchayatCode = incoming.lgdLocation?.panchayatCode;
  const inCategory = (incoming.aiTriageCategory || '').trim().toLowerCase();

  // 1. Identical Citizen Repeat Detection (Same phoneHash)
  for (const existing of existingIssues) {
    if (existing.id === incoming.id) continue;

    if (incoming.phoneHash && existing.phoneHash && incoming.phoneHash === existing.phoneHash) {
      const exLat = existing.rawCoordinates?.latitude ?? 0;
      const exLon = existing.rawCoordinates?.longitude ?? 0;
      const dist = calculateHaversineDistance(inLat, inLon, exLat, exLon);
      const exPanchayatCode = existing.lgdLocation?.panchayatCode;
      const exCategory = (existing.aiTriageCategory || '').trim().toLowerCase();

      const isSameLocation =
        (inPanchayatCode && exPanchayatCode && inPanchayatCode === exPanchayatCode) ||
        dist <= CLUSTERING_RADIUS_METERS;
      const isSameCategory = !inCategory || !exCategory || inCategory === exCategory;

      if (isSameLocation && isSameCategory) {
        return {
          isDirectUserDuplicate: true,
          shouldMergeIntoMaster: false,
          targetMasterIssueId: existing.id,
          newIntensityScore: existing.intensityScore || 1,
          clusterReason: 'SAME_USER_REPEAT',
          distanceMeters: dist,
        };
      }
    }
  }

  // 2. Multi-Citizen Spatial Cluster Match (Distinct citizens reporting within <= 1000m or same Panchayat)
  const clusterCandidates: Array<{ issue: OfflineDraftSubmission; distance: number }> = [];

  for (const existing of existingIssues) {
    if (existing.id === incoming.id) continue;
    if (existing.masterLifecycleStatus === 'REJECTED_SPAM') continue;

    const exLat = existing.rawCoordinates?.latitude ?? 0;
    const exLon = existing.rawCoordinates?.longitude ?? 0;
    const dist = calculateHaversineDistance(inLat, inLon, exLat, exLon);
    const exPanchayatCode = existing.lgdLocation?.panchayatCode;
    const exCategory = (existing.aiTriageCategory || '').trim().toLowerCase();

    const isSameCategory = !inCategory || !exCategory || inCategory === exCategory;
    const isSamePanchayat = inPanchayatCode && exPanchayatCode && inPanchayatCode === exPanchayatCode;
    const isWithinRadius = dist <= CLUSTERING_RADIUS_METERS;

    if (isSameCategory && (isSamePanchayat || isWithinRadius)) {
      clusterCandidates.push({ issue: existing, distance: dist });
    }
  }

  if (clusterCandidates.length > 0) {
    // Select best primary Master Issue candidate:
    // 1st Priority: Already ENDORSED_MASTER
    // 2nd Priority: Highest current intensityScore
    // 3rd Priority: Earliest timestamp
    clusterCandidates.sort((a, b) => {
      const aEndorsed = a.issue.masterLifecycleStatus === 'ENDORSED_MASTER' ? 1 : 0;
      const bEndorsed = b.issue.masterLifecycleStatus === 'ENDORSED_MASTER' ? 1 : 0;
      if (aEndorsed !== bEndorsed) return bEndorsed - aEndorsed;

      const aScore = a.issue.intensityScore || 1;
      const bScore = b.issue.intensityScore || 1;
      if (aScore !== bScore) return bScore - aScore;

      return (a.issue.timestamp || 0) - (b.issue.timestamp || 0);
    });

    const primaryTarget = clusterCandidates[0];
    const newIntensityScore = (primaryTarget.issue.intensityScore || 1) + 1;

    return {
      isDirectUserDuplicate: false,
      shouldMergeIntoMaster: true,
      targetMasterIssueId: primaryTarget.issue.id,
      newIntensityScore,
      clusterReason: 'SPATIAL_PROXIMITY_MERGE',
      distanceMeters: primaryTarget.distance,
    };
  }

  // 3. New Isolated Incident
  return {
    isDirectUserDuplicate: false,
    shouldMergeIntoMaster: false,
    newIntensityScore: 1,
    clusterReason: 'NEW_ISOLATED_INCIDENT',
  };
}

/**
 * Backward-compatibility wrapper for calculateIntensityScore
 */
export function calculateIntensityScore(
  existingSubmissions: OfflineDraftSubmission[],
  newSubmission: OfflineDraftSubmission
): ClusteringResult {
  const evalResult = evaluateClusterAssignment(newSubmission, existingSubmissions);
  return {
    isDuplicate: evalResult.isDirectUserDuplicate,
    clusteredMasterId: evalResult.targetMasterIssueId,
    updatedIntensity: evalResult.newIntensityScore,
  };
}

/**
 * Distributed multi-device clustering helper
 * Maps evaluateClusterAssignment outcome to explicit network clustering actions
 */
export function evaluateCrossDeviceClustering(
  incoming: OfflineDraftSubmission,
  existingStore: OfflineDraftSubmission[]
): {
  action: 'UPDATE_EXISTING' | 'CREATE_NEW';
  targetMasterId?: string;
  updatedIntensity: number;
  mergedSubmissionsCount: number;
} {
  const result = evaluateClusterAssignment(incoming, existingStore);
  if (result.isDirectUserDuplicate || result.shouldMergeIntoMaster) {
    return {
      action: 'UPDATE_EXISTING',
      targetMasterId: result.targetMasterIssueId,
      updatedIntensity: result.newIntensityScore,
      mergedSubmissionsCount: result.newIntensityScore,
    };
  }
  return {
    action: 'CREATE_NEW',
    targetMasterId: undefined,
    updatedIntensity: 1,
    mergedSubmissionsCount: 1,
  };
}
