jest.mock("../src/Model/Mongodb", () => ({
	UserRole: { find: jest.fn() },
}));

const { UserRole } = require("../src/Model/Mongodb");
const requireRole = require("../src/Middleware/requireRole");

const responseMock = () => {
	const res = {};
	res.status = jest.fn(() => res);
	res.json = jest.fn(() => res);
	return res;
};

beforeEach(() => jest.clearAllMocks());

test("allows the requested role using the database role assignment", async () => {
	UserRole.find.mockReturnValue({
		populate: jest.fn().mockResolvedValue([{ roleId: { name: "USER" } }]),
	});
	const req = { user: { sub: "user-1" } };
	const res = responseMock();
	const next = jest.fn();

	await requireRole("user")(req, res, next);

	expect(UserRole.find).toHaveBeenCalledWith({ userId: "user-1" });
	expect(next).toHaveBeenCalledTimes(1);
	expect(res.status).not.toHaveBeenCalled();
});

test("denies a user who does not have the required role", async () => {
	UserRole.find.mockReturnValue({
		populate: jest.fn().mockResolvedValue([{ roleId: { name: "user" } }]),
	});
	const res = responseMock();

	await requireRole("admin")({ user: { sub: "user-1" } }, res, jest.fn());

	expect(res.status).toHaveBeenCalledWith(403);
	expect(res.json).toHaveBeenCalledWith({ message: "Administrator access required" });
});

test("forwards role lookup failures to centralized error handling", async () => {
	const lookupError = new Error("database unavailable");
	UserRole.find.mockReturnValue({ populate: jest.fn().mockRejectedValue(lookupError) });
	const next = jest.fn();

	await requireRole("admin")({ user: { sub: "user-1" } }, responseMock(), next);

	expect(next).toHaveBeenCalledWith(lookupError);
});
