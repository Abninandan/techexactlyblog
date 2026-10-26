const jwt = require("jsonwebtoken");

jest.mock("../src/Model/Mongodb", () => ({
	RefreshToken: { create: jest.fn() },
}));

const { RefreshToken } = require("../src/Model/Mongodb");
const { hashToken, issueTokenPair } = require("../src/utils/tokenService");

const originalSecrets = {
	JWT_SECRET: process.env.JWT_SECRET,
	REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
};

beforeEach(() => {
	jest.clearAllMocks();
	process.env.JWT_SECRET = "unit-test-access-secret";
	process.env.REFRESH_TOKEN_SECRET = "unit-test-refresh-secret";
	process.env.ACCESS_TOKEN_TTL = "10m";
	process.env.REFRESH_TOKEN_TTL = "2d";
	RefreshToken.create.mockResolvedValue({ _id: "refresh-record-1" });
});

afterAll(() => {
	if (originalSecrets.JWT_SECRET === undefined) delete process.env.JWT_SECRET;
	else process.env.JWT_SECRET = originalSecrets.JWT_SECRET;
	if (originalSecrets.REFRESH_TOKEN_SECRET === undefined) delete process.env.REFRESH_TOKEN_SECRET;
	else process.env.REFRESH_TOKEN_SECRET = originalSecrets.REFRESH_TOKEN_SECRET;
	delete process.env.ACCESS_TOKEN_TTL;
	delete process.env.REFRESH_TOKEN_TTL;
});

test("issues signed access and refresh tokens and stores only the refresh-token hash", async () => {
	const user = { _id: { toString: () => "user-123" }, email: "reader@example.test" };

	const tokens = await issueTokenPair(user);
	const accessPayload = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);
	const refreshPayload = jwt.verify(tokens.refreshToken, process.env.REFRESH_TOKEN_SECRET);

	expect(accessPayload).toMatchObject({ sub: "user-123", email: user.email, tokenType: "access" });
	expect(refreshPayload).toMatchObject({ sub: "user-123", tokenType: "refresh" });
	expect(tokens.refreshTokenId).toBe("refresh-record-1");
	expect(RefreshToken.create).toHaveBeenCalledWith(expect.objectContaining({
		user: user._id,
		tokenHash: hashToken(tokens.refreshToken),
		expiresAt: expect.any(Date),
	}));
	expect(RefreshToken.create.mock.calls[0][0].tokenHash).not.toBe(tokens.refreshToken);
	expect(hashToken("same-token")).toBe(hashToken("same-token"));
	expect(hashToken("same-token")).toHaveLength(64);
});

test("does not persist tokens if a signing secret is missing", async () => {
	delete process.env.REFRESH_TOKEN_SECRET;

	await expect(issueTokenPair({ _id: { toString: () => "user-123" }, email: "reader@example.test" }))
		.rejects.toThrow("JWT_SECRET and REFRESH_TOKEN_SECRET must be configured");
	expect(RefreshToken.create).not.toHaveBeenCalled();
});
