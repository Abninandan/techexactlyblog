const authenticateToken = require("./authMiddleware");
const requireRole = require("./requireRole");

const requireAdmin = [authenticateToken, requireRole("admin")];

module.exports = requireAdmin;