import logger from '../config/logger.js';

// Define permissions for different resources and actions
export const PERMISSIONS = {
    USERS: {
        CREATE: 'users:create',
        READ: 'users:read',
        UPDATE: 'users:update',
        DELETE: 'users:delete',
        READ_ALL: 'users:read:all',
        UPDATE_ANY: 'users:update:any',
        DELETE_ANY: 'users:delete:any'
    },
    PROFILE: {
        READ: 'profile:read',
        UPDATE: 'profile:update'
    },
    ADMIN: {
        PANEL: 'admin:panel',
        LOGS: 'admin:logs',
        SYSTEM: 'admin:system'
    }
};

// Define roles with their permissions
export const ROLES = {
    guest: {
        permissions: [],
        description: 'Guest user with no permissions'
    },
    user: {
        permissions: [
            PERMISSIONS.PROFILE.READ,
            PERMISSIONS.PROFILE.UPDATE,
            PERMISSIONS.USERS.READ, // Can read own user info
        ],
        description: 'Regular user with basic permissions'
    },
    moderator: {
        permissions: [
            PERMISSIONS.PROFILE.READ,
            PERMISSIONS.PROFILE.UPDATE,
            PERMISSIONS.USERS.READ,
            PERMISSIONS.USERS.READ_ALL,
            PERMISSIONS.USERS.UPDATE, // Can update some user info
        ],
        description: 'Moderator with extended user management permissions'
    },
    admin: {
        permissions: [
            PERMISSIONS.PROFILE.READ,
            PERMISSIONS.PROFILE.UPDATE,
            PERMISSIONS.USERS.CREATE,
            PERMISSIONS.USERS.READ,
            PERMISSIONS.USERS.UPDATE,
            PERMISSIONS.USERS.DELETE,
            PERMISSIONS.USERS.READ_ALL,
            PERMISSIONS.USERS.UPDATE_ANY,
            PERMISSIONS.USERS.DELETE_ANY,
            PERMISSIONS.ADMIN.PANEL,
            PERMISSIONS.ADMIN.LOGS,
            PERMISSIONS.ADMIN.SYSTEM
        ],
        description: 'Administrator with full permissions'
    },
    superadmin: {
        permissions: ['*'], // All permissions
        description: 'Super administrator with unrestricted access'
    }
};

// Check if a role has a specific permission
export const hasPermission = (userRole, requiredPermission) => {
    const role = ROLES[userRole];
    if (!role) return false;
    
    // Super admin has all permissions
    if (role.permissions.includes('*')) return true;
    
    // Check for specific permission
    return role.permissions.includes(requiredPermission);
};

// Check if a role has any of the required permissions
export const hasAnyPermission = (userRole, requiredPermissions = []) => {
    return requiredPermissions.some(permission => hasPermission(userRole, permission));
};

// Check if a role has all of the required permissions
export const hasAllPermissions = (userRole, requiredPermissions = []) => {
    return requiredPermissions.every(permission => hasPermission(userRole, permission));
};

// Middleware to check for specific permissions
export const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                logger.warn('Permission check failed - no authenticated user', {
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    requiredPermission,
                    timestamp: new Date().toISOString()
                });
                
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'You must be logged in to access this resource'
                });
            }

            const { role, id } = req.user;
            
            if (!hasPermission(role, requiredPermission)) {
                logger.warn('Permission denied', {
                    userId: id,
                    userRole: role,
                    requiredPermission,
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    timestamp: new Date().toISOString()
                });
                
                return res.status(403).json({
                    error: 'Access denied',
                    message: `Insufficient permissions. Required: ${requiredPermission}`
                });
            }

            logger.info('Permission granted', {
                userId: id,
                userRole: role,
                requiredPermission,
                path: req.path,
                method: req.method
            });
            
            next();
        } catch (error) {
            logger.error('Permission check error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Error checking permissions'
            });
        }
    };
};

// Middleware to check for any of the required permissions
export const requireAnyPermission = (requiredPermissions = []) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'You must be logged in to access this resource'
                });
            }

            const { role, id } = req.user;
            
            if (!hasAnyPermission(role, requiredPermissions)) {
                logger.warn('Permission denied - insufficient permissions', {
                    userId: id,
                    userRole: role,
                    requiredPermissions,
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    timestamp: new Date().toISOString()
                });
                
                return res.status(403).json({
                    error: 'Access denied',
                    message: `Insufficient permissions. Required any of: ${requiredPermissions.join(', ')}`
                });
            }

            next();
        } catch (error) {
            logger.error('Permission check error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Error checking permissions'
            });
        }
    };
};

// Middleware to check for all required permissions
export const requireAllPermissions = (requiredPermissions = []) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'You must be logged in to access this resource'
                });
            }

            const { role, id } = req.user;
            
            if (!hasAllPermissions(role, requiredPermissions)) {
                logger.warn('Permission denied - missing required permissions', {
                    userId: id,
                    userRole: role,
                    requiredPermissions,
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    timestamp: new Date().toISOString()
                });
                
                return res.status(403).json({
                    error: 'Access denied',
                    message: `Insufficient permissions. Required all of: ${requiredPermissions.join(', ')}`
                });
            }

            next();
        } catch (error) {
            logger.error('Permission check error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Error checking permissions'
            });
        }
    };
};

// Resource ownership middleware
export const requireOwnership = (resourceIdParam = 'id') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'You must be logged in to access this resource'
                });
            }

            const { role, id: userId } = req.user;
            const resourceId = req.params[resourceIdParam];
            
            // Admins and superadmins can access any resource
            if (role === 'admin' || role === 'superadmin') {
                return next();
            }
            
            // Check if user is trying to access their own resource
            if (parseInt(resourceId) !== userId) {
                logger.warn('Ownership check failed', {
                    userId,
                    userRole: role,
                    requestedResourceId: resourceId,
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    timestamp: new Date().toISOString()
                });
                
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You can only access your own resources'
                });
            }

            next();
        } catch (error) {
            logger.error('Ownership check error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Error checking resource ownership'
            });
        }
    };
};

// Combined ownership OR admin permission middleware
export const requireOwnershipOrPermission = (requiredPermission, resourceIdParam = 'id') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'You must be logged in to access this resource'
                });
            }

            const { role, id: userId } = req.user;
            const resourceId = req.params[resourceIdParam];
            
            // Check if user has the required permission (e.g., admin)
            if (hasPermission(role, requiredPermission)) {
                return next();
            }
            
            // Check if user is trying to access their own resource
            if (parseInt(resourceId) === userId) {
                return next();
            }

            logger.warn('Access denied - neither ownership nor permission', {
                userId,
                userRole: role,
                requiredPermission,
                requestedResourceId: resourceId,
                ip: req.ip,
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString()
            });
            
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only access your own resources or need higher permissions'
            });
        } catch (error) {
            logger.error('Ownership/permission check error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Error checking access rights'
            });
        }
    };
};

// Utility function to get user permissions
export const getUserPermissions = (userRole) => {
    const role = ROLES[userRole];
    return role ? role.permissions : [];
};

// Utility function to get all available roles
export const getAvailableRoles = () => {
    return Object.keys(ROLES);
};

// Utility function to get role information
export const getRoleInfo = (roleName) => {
    return ROLES[roleName] || null;
};