/**
 * Shared utility functions for the crypto exchange backend
 */

const crypto = require('crypto')

/**
 * Generate a secure random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize user input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Format currency amount with appropriate decimal places
 */
const formatCurrency = (amount, currency) => {
  const decimals = currency === 'USD' ? 2 : 8
  return parseFloat(amount).toFixed(decimals)
}

/**
 * Calculate percentage change
 */
const calculatePercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Sleep utility for async operations
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Debounce function calls
 */
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Deep clone an object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if a value is a valid number
 */
const isValidNumber = (value) => {
  return !isNaN(value) && isFinite(value) && value > 0
}

module.exports = {
  generateRandomString,
  isValidEmail,
  sanitizeInput,
  formatCurrency,
  calculatePercentageChange,
  sleep,
  debounce,
  deepClone,
  isValidNumber
}