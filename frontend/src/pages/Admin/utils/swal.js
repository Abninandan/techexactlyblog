import Swal from "sweetalert2";

export const confirmPostDeletion = (title) =>
	Swal.fire({
		title: "Delete this post?",
		text: `“${title}” will be soft-deleted and removed from the active post list.`,
		icon: "warning",
		showCancelButton: true,
		confirmButtonText: "Delete post",
		cancelButtonText: "Keep post",
		confirmButtonColor: "#a2433b",
	});

export const confirmCommentDeletion = () =>
	Swal.fire({
		title: "Delete this comment?",
		text: "This permanently removes the comment.",
		icon: "warning",
		showCancelButton: true,
		confirmButtonText: "Delete comment",
		cancelButtonText: "Keep comment",
		confirmButtonColor: "#a2433b",
	});
