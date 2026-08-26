// Frontend contract types for Member 2's ML outputs (served later through
// FastAPI). These are JSDoc typedefs: the codebase is plain JavaScript, so they
// document the agreed shapes without introducing a build step.
//
// IMPORTANT
// - The bundled CSV files are NOT a model. Nothing in this app may present
//   dataset values as AI predictions.
// - Until real endpoints exist, services return clearly-labelled demo data
//   (`modelVersion: 'provisional-demo-v0'`, "placeholder" copy, warning badges).
// - Optional fields stay null/undefined when the backend does not supply them;
//   the frontend must never synthesise them locally.

/**
 * A single forecast point produced by the prediction model.
 *
 * @typedef {Object} PredictionPoint
 * @property {string} timestamp                 ISO 8601 timestamp of the forecast step.
 * @property {number} predictedValue            Model-predicted value for `parameterId`.
 * @property {number|null} [actualValue]        Observed value at this timestamp, when available.
 * @property {number|null} [confidenceLow]      Lower bound of the confidence interval, if supplied.
 * @property {number|null} [confidenceHigh]     Upper bound of the confidence interval, if supplied.
 */

/**
 * A prediction run for one parameter.
 * Primary target today: COD (`parameterId: 'cod'`). Additional candidates:
 * BOD, TSS, pH.
 *
 * @typedef {Object} PredictionSeries
 * @property {string} parameterId               One of constants/stpParameters.js ids (ML_TARGET_PARAMETERS).
 * @property {string|null} [unit]               Display unit (e.g. "mg/L"), if supplied by the backend.
 * @property {number} horizonHours              Forecast horizon covered by `points`.
 * @property {string} generatedAt               ISO 8601 time the prediction was produced.
 * @property {string|null} [modelVersion]       Model identifier/version string, if supplied.
 * @property {PredictionPoint[]} points         Chronological forecast points.
 */

/**
 * One anomaly detected by the anomaly-detection model/rules engine.
 *
 * @typedef {Object} AnomalyRecord
 * @property {string} id                        Stable identifier.
 * @property {string} timestamp                 ISO 8601 time of the anomalous reading.
 * @property {string} parameterId               Parameter the anomaly refers to.
 * @property {number|null} [observedValue]      Measured value that triggered the flag, if supplied.
 * @property {number|null} [expectedValue]      Model-expected value, if supplied.
 * @property {number} score                     Anomaly score in [0, 1] (backend-supplied).
 * @property {'high'|'medium'|'low'} severity   Severity bucket (backend-supplied).
 * @property {string} description               Short human-readable summary.
 * @property {string|null} [explanation]        Longer explanation, if supplied.
 */

/**
 * One operational recommendation.
 *
 * @typedef {Object} RecommendationRecord
 * @property {string} id                        Stable identifier.
 * @property {'high'|'medium'|'low'} priority   Urgency of the recommendation.
 * @property {string} message                   Recommendation text shown to operators.
 * @property {string|null} [reason]             Why this recommendation was raised, if supplied.
 * @property {string|null} [suggestedAction]    Concrete next action, if supplied.
 * @property {string|null} [relatedParameterId] Parameter this advice relates to, if any.
 */

/** Placeholder marker used by demo implementations until Member 2's model is connected. */
export const DEMO_MODEL_VERSION = 'provisional-demo-v0'
