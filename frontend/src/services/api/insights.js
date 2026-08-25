// FastAPI implementation seam — endpoint paths are intentionally TBD until the
// backend AI contract lands. Map model outputs into the frontend shapes here.
import { notImplementedError } from '../apiErrors.js'

export function getPredictions() {
  return Promise.reject(notImplementedError('getPredictions'))
}

export function getAnomalies() {
  return Promise.reject(notImplementedError('getAnomalies'))
}

export function getRecommendations() {
  return Promise.reject(notImplementedError('getRecommendations'))
}
