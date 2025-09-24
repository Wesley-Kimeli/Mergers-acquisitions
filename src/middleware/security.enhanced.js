import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import validator from 'validator';
import logger from '../config/logger.js';

// Enhanced input sanitization middleware
export const sanitizeInput = (req, res, next) => {
    try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }
        
        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }
        
        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }
        
        next();
    } catch (error) {
        logger.error('Input sanitization error:', error);
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid input data'
        });
    }
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // XSS protection
            sanitized[key] = xss(value, {
                whiteList: {}, // No HTML tags allowed
                stripIgnoreTag: true,
                stripIgnoreTagBody: ['script']
            });
            
            // Additional string validation
            if (key === 'email') {
                sanitized[key] = validator.isEmail(sanitized[key]) ? validator.normalizeEmail(sanitized[key]) : sanitized[key];
            }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' ? xss(item, { whiteList: {}, stripIgnoreTag: true }) : item
            );
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
};

// Enhanced rate limiting with different tiers
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Rate limit exceeded',
            message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Custom key generator based on IP and user ID
        keyGenerator: (req) => {
            const ip = req.ip || req.connection.remoteAddress;
            const userId = req.user?.id || 'anonymous';
            return `${ip}:${userId}`;
        },
        // Custom handler for rate limit exceeded
        handler: (req, res) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
                userId: req.user?.id || 'anonymous',
                timestamp: new Date().toISOString()
            });
            
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};

// Specific rate limiters for different endpoints
export const authRateLimit = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts
    'Too many authentication attempts, please try again later'
);

export const apiRateLimit = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    'Too many API requests, please try again later'
);

export const strictRateLimit = createRateLimiter(
    60 * 1000, // 1 minute
    10, // 10 requests
    'Too many requests, please slow down'
);

// Security headers middleware
export const securityHeaders = (req, res, next) => {
    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
    );
    
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    next();
};

// Request size limiter
export const requestSizeLimit = (limit = '10mb') => {
    return (req, res, next) => {
        if (req.headers['content-length'] && parseInt(req.headers['content-length']) > parseSize(limit)) {
            logger.warn('Request size limit exceeded', {
                ip: req.ip,
                path: req.path,
                contentLength: req.headers['content-length'],
                limit,
                timestamp: new Date().toISOString()
            });
            
            return res.status(413).json({
                error: 'Payload too large',
                message: `Request size exceeds limit of ${limit}`
            });
        }
        next();
    };
};

// Helper function to parse size strings
const parseSize = (size) => {
    const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
    if (!match) return 0;
    const [, num, unit = 'b'] = match;
    return parseFloat(num) * (units[unit] || 1);
};

// Suspicious activity detector
export const suspiciousActivityDetector = (req, res, next) => {
    const suspiciousPatterns = [
        /[<>'"%;()&+]/g, // Potential XSS
        /(\bunion\b|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b)/gi, // SQL injection patterns
        /(\.\.\/)|(\.\.\\)/g, // Path traversal
        /(script|javascript|vbscript|onload|onerror)/gi, // Script injection
    ];
    
    const checkString = (str) => {
        return suspiciousPatterns.some(pattern => pattern.test(str));
    };
    
    const checkObject = (obj) => {
        for (const [key, value] of Object.entries(obj || {})) {
            if (typeof value === 'string' && checkString(value)) {
                return true;
            } else if (typeof value === 'object' && value !== null) {
                if (checkObject(value)) return true;
            }
        }
        return false;
    };
    
    // Check for suspicious patterns in request
    const suspicious = 
        checkObject(req.body) || 
        checkObject(req.query) || 
        checkObject(req.params) ||
        (req.get('User-Agent') && checkString(req.get('User-Agent'))) ||
        (req.get('Referer') && checkString(req.get('Referer')));
    
    if (suspicious) {
        logger.error('Suspicious activity detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            body: req.body,
            query: req.query,
            params: req.params,
            userId: req.user?.id || 'anonymous',
            timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Request contains suspicious content'
        });
    }
    
    next();
};

// NoSQL injection protection (using express-mongo-sanitize)
export const noSQLInjectionProtection = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        logger.warn('NoSQL injection attempt detected', {
            ip: req.ip,
            path: req.path,
            key,
            timestamp: new Date().toISOString()
        });
    }
});