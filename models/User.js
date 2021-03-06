const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Schema } = mongoose;
const dateDif = require("../utilities/dateDif");

const userSchema = new Schema({
	username: {
		type: String,
		required: true,
		trim: true,
	},
	uniqueName: {
		type: String,
		required: true,
		unique: true,
		dropDups: true,
		trim: true,
	},
	password: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
		dropDups: true,
		lowercase: true,
		trim: true,
	},
	joined: {
		type: Date,
	},
	posts: [
		{
			type: Schema.Types.ObjectId,
			ref: "Post",
		},
	],
	hearted: [
		{
			type: Schema.Types.ObjectId,
			ref: "Post",
		},
	],
	bookmarked: [
		{
			type: Schema.Types.ObjectId,
			ref: "Post",
		},
	],
	comments: [
		{
			type: Schema.Types.ObjectId,
			ref: "Comment",
		},
	],
	followers: [
		{
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	],
	following: [
		{
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	],
	notifications: [
		{
			category: {
				type: String,
				required: true,
				enum: ["follow", "comment", "reply", "like"],
			},
			date: {
				type: Date,
			},
			content: {
				type: String,
				required: true,
			},
			user: {
				type: Schema.Types.ObjectId,
				ref: "User",
			},
			post: {
				type: Schema.Types.ObjectId,
				ref: "Post",
			},
			comment: {
				type: Schema.Types.ObjectId,
				ref: "Comment",
			},
		},
	],
	viewedNotifications: {
		type: Boolean,
		default: true,
	},
});

userSchema.statics.findAndValidate = async function (username, password) {
	const user = await this.findOne({ username });
	if (!user) return false;
	const result = await bcrypt.compare(password, user.password);
	if (!result) return false;
	return user;
};

userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 12);
	next();
});

module.exports = mongoose.model("User", userSchema);
