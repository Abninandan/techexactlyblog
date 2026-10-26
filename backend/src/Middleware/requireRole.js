const { UserRole } = require("../Model/Mongodb");

const requireRole = (roleName) => async (req, res, next) => {
	try {
		const assignments = await UserRole.find({ userId: req.user.sub }).populate("roleId", "name");
		const hasRole = assignments.some(
			({ roleId }) => roleId?.name?.toLowerCase() === roleName.toLowerCase()
		);
		if (!hasRole) {
			const roleLabel = roleName.toLowerCase() === "admin" ? "Administrator" : "Regular user";
			return res.status(403).json({ message: `${roleLabel} access required` });
		}
		return next();
	} catch (error) {
		return next(error);
	}
};

module.exports = requireRole;
