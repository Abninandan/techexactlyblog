require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const {
	Comment,
	Permission,
	Post,
	Role,
	RolePermission,
	User,
	UserRole,
} = require("../src/Model/Mongodb");

const roles = [
	{ code: 1, name: "admin", description: "Administrator with full management access." },
	{ code: 2, name: "user", description: "Regular user with access to their own content." },
];

const permissionDefinitions = [
	{ name: "users:read", description: "View users." },
	{ name: "users:update", description: "Update users." },
	{ name: "users:delete", description: "Delete users." },
	{ name: "posts:create", description: "Create posts." },
	{ name: "posts:read", description: "View posts." },
	{ name: "posts:update:own", description: "Update own posts." },
	{ name: "posts:delete:own", description: "Delete own posts." },
	{ name: "posts:update:any", description: "Update any post." },
	{ name: "posts:delete:any", description: "Delete any post." },
	{ name: "comments:create", description: "Create comments." },
	{ name: "comments:update:own", description: "Update own comments." },
	{ name: "comments:delete:own", description: "Delete own comments." },
	{ name: "comments:update:any", description: "Update any comment." },
	{ name: "comments:delete:any", description: "Delete any comment." },
];

const rolePermissions = {
	admin: permissionDefinitions.map(({ name }) => name),
	user: [
		"posts:create",
		"posts:read",
		"posts:update:own",
		"posts:delete:own",
		"comments:create",
		"comments:update:own",
		"comments:delete:own",
	],
};

const demoUsers = [
	{
		name: "Demo Admin",
		email: process.env.SEED_ADMIN_EMAIL || "admin@blog.local",
		password: process.env.SEED_ADMIN_PASSWORD || "Admin123!",
		roleCode: 1,
	},
	{
		name: "Demo User",
		email: process.env.SEED_USER_EMAIL || "user@blog.local",
		password: process.env.SEED_USER_PASSWORD || "User123!",
		roleCode: 2,
	},
];

const upsertByName = (Model, name, values) =>
	Model.findOneAndUpdate(
		{ name },
		{ $set: values },
		{ returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
	);

async function seed() {
	if (process.env.NODE_ENV === "production") {
		throw new Error("Refusing to create demo users in a production environment.");
	}

	if (!process.env.MONGO_URI) {
		throw new Error("MONGO_URI is required to run the seeder.");
	}

	const normalizedEmails = demoUsers.map(({ email }) => email.toLowerCase());
	if (new Set(normalizedEmails).size !== normalizedEmails.length) {
		throw new Error("The demo admin and user must have different email addresses.");
	}

	await mongoose.connect(process.env.MONGO_URI);

	const seededRoles = new Map();
	for (const role of roles) {
		const savedRole = await Role.findOneAndUpdate(
			{ name: role.name },
			{ $set: role },
			{ returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
		);
		seededRoles.set(savedRole.name, savedRole);
	}

	const seededPermissions = new Map();
	for (const permission of permissionDefinitions) {
		const savedPermission = await upsertByName(Permission, permission.name, permission);
		seededPermissions.set(savedPermission.name, savedPermission);
	}

	for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
		const role = seededRoles.get(roleName);
		for (const permissionName of permissionNames) {
			await RolePermission.updateOne(
				{
					roleId: role._id,
					permissionId: seededPermissions.get(permissionName)._id,
				},
				{ $setOnInsert: {} },
				{ upsert: true }
			);
		}
	}

	const seededUsers = [];
	for (const demoUser of demoUsers) {
		const passwordHash = await bcrypt.hash(demoUser.password, 12);
		const user = await User.findOneAndUpdate(
			{ email: demoUser.email.toLowerCase() },
			{
				$setOnInsert: {
					name: demoUser.name,
					email: demoUser.email.toLowerCase(),
					password: passwordHash,
				},
			},
			{ returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
		);
		const role = roles.find(({ code }) => code === demoUser.roleCode);

		await UserRole.updateOne(
			{ userId: user._id, roleId: seededRoles.get(role.name)._id },
			{ $setOnInsert: {} },
			{ upsert: true }
		);

		seededUsers.push({ email: user.email, role: role.name, roleCode: role.code });
	}

	const [userCount, postCount, commentCount] = await Promise.all([
		User.countDocuments(),
		Post.countDocuments({ deletedAt: null }),
		Comment.countDocuments(),
	]);

	console.log("Seed completed successfully.");
	console.log("Roles:", roles.map(({ code, name }) => `${code}=${name}`).join(", "));
	console.log("Demo accounts:", JSON.stringify(seededUsers));
	console.log(`Current totals: ${userCount} users, ${postCount} posts, ${commentCount} comments.`);
	console.log("Demo account passwords are the local defaults; override with SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD.");
}

seed()
	.catch((error) => {
		console.error("Seeder failed:", error.message);
		process.exitCode = 1;
	})
	.finally(async () => {
		if (mongoose.connection.readyState !== 0) {
			await mongoose.disconnect();
		}
	});
