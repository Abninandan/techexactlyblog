export const navigation = [
	{ id: "overview", label: "Overview", marker: "OV" },
	{ id: "users", label: "Users", marker: "US" },
	{ id: "posts", label: "Posts", marker: "PO" },
	{ id: "comments", label: "Comments", marker: "CO" },
	{ id: "branding", label: "Branding", marker: "BR" },
];

export const displayDate = (value) =>
	value
		? new Intl.DateTimeFormat(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			}).format(new Date(value))
		: "—";
