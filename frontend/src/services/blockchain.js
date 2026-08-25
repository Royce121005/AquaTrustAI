import { USE_API } from '../config/env.js'
import * as mockImplementation from './mock/blockchain.js'
import * as apiImplementation from './api/blockchain.js'

const implementation = USE_API ? apiImplementation : mockImplementation

export const getAnchoredRecords = implementation.getAnchoredRecords
export const verifyRecord = implementation.verifyRecord
export const getTransactionById = implementation.getTransactionById
