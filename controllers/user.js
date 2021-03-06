const User = require("../models/User");
const ExpressError = require("../utilities/ExpressError");
const handleAsync = require("../utilities/handleAsync");
const checkIfFollowing = require("../utilities/checkIfFollowing");
const Post = require("../models/Post");
const dateDif = require("../utilities/dateDif");

module.exports.userHomePage = handleAsync(async (req, res, next) => {
	const { username } = req.params; // requested user
	const { user_id } = req.session; // user surfing
	let hearted = [];
	let bookmarked = [];

	const user = await User.findOne({ username: username })
		.populate({
			path: "posts",
			populate: { path: "user" },
		})
		.populate({
			path: "posts",
			populate: { path: "comments" },
		});

	if (!user) {
		return next(new ExpressError("User not found.", 404));
	}

	const userLoggedIn = await User.findById(user_id);

	if (userLoggedIn) {
		hearted = userLoggedIn.hearted.map(heart => heart._id);
		bookmarked = userLoggedIn.bookmarked.map(bookmark => bookmark._id);
	}

	const isFollowing = checkIfFollowing(user, userLoggedIn, user_id);

	user.posts.reverse();
	res.render("users/userProfile", {
		user,
		user_id,
		isFollowing,
		hearted,
		bookmarked,
	});
});

module.exports.followUser = handleAsync(async (req, res) => {
	const { user_id } = req.session; // user that will do the following
	const { username } = req.params; // who the user wants to follow

	const user = await User.findById(user_id); // user that will do the following
	const userToFollow = await User.findOne({ username: username }); // who the user wants to follow

	if (user.following.includes(userToFollow._id)) {
		await User.findByIdAndUpdate(user._id, {
			$pull: { following: userToFollow._id },
		});
		await User.findByIdAndUpdate(userToFollow._id, {
			$pull: { followers: user._id },
		});
	} else {
		user.following.push(userToFollow);
		userToFollow.followers.push(user);

		if (user._id !== userToFollow._id) {
			const notification = {
				category: "follow",
				date: new Date().toUTCString(),
				content: "has started following you",
				user: user,
			};
			userToFollow.notifications.push(notification);
			await User.findByIdAndUpdate(userToFollow._id, {
				$set: { viewedNotifications: false },
			});
		}

		await user.save();
		await userToFollow.save();
	}

	res.sendStatus(204);
});

module.exports.showFollowers = handleAsync(async (req, res) => {
	const { username } = req.params;
	const { user_id } = req.session;

	const user = await User.findOne({ username: username })
		.populate("posts")
		.populate("followers");

	const userLoggedIn = await User.findById(user_id);
	const isFollowing = checkIfFollowing(user, userLoggedIn, user_id);
	user.followers.sort();
	res.render("users/followers", { user, user_id, isFollowing });
});

module.exports.showFollowing = handleAsync(async (req, res) => {
	const { username } = req.params;
	const { user_id } = req.session;

	const user = await User.findOne({ username: username })
		.populate("posts")
		.populate("following");

	const userLoggedIn = await User.findById(user_id);
	const isFollowing = checkIfFollowing(user, userLoggedIn, user_id);
	user.following.sort();
	res.render("users/following", { user, user_id, isFollowing });
});

module.exports.showBookmarked = handleAsync(async (req, res, next) => {
	const { username } = req.params;
	const { user_id } = req.session;

	const user = await User.findOne({ username }).populate("bookmarked");

	if (user._id.toString() !== user_id) {
		return next(
			new ExpressError("You don't have permission to view this.", 401)
		);
	}

	const hearted = user.hearted.map(heart => heart._id);
	const bookmarked = user.bookmarked.map(bookmark => bookmark._id);
	const posts = await Post.find({ _id: { $in: bookmarked } }).populate(
		"user",
		"username"
	);

	res.render("users/bookmarks", { user, user_id, posts, hearted, bookmarked });
});

module.exports.showNotifications = handleAsync(async (req, res, next) => {
	const { username } = req.params;
	const { user_id } = req.session;

	const user = await User.findOneAndUpdate(
		{ username },
		{ $set: { viewedNotifications: true } }
	).populate({
		path: "notifications",
		populate: { path: "user" },
	});

	if (user._id.toString() !== user_id) {
		return next(
			new ExpressError("You don't have permission to view this.", 401)
		);
	}

	const { notifications } = user;
	notifications.forEach(notification => {
		notification.dateDif = dateDif(notification.date);
	});
	notifications.reverse();

	res.render("users/notifications", { notifications });
});
