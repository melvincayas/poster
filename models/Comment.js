const mongoose = require("mongoose");
const { Schema } = mongoose;
const dateDif = require("../utilities/dateDif");

const commentSchema = new Schema({
	body: {
		type: String,
		required: true,
	},
	date: {
		type: Date,
		required: true,
	},
	post: {
		type: Schema.Types.ObjectId,
		ref: "Post",
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: "User",
	},
	replies: [
		{
			body: {
				type: String,
				required: true,
			},
			date: {
				type: Date,
				required: true,
			},
			user: {
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		},
	],
});

commentSchema.post("init", doc => {
	doc.dateDif = dateDif(doc.date);
	if (doc.replies.length) {
		doc.replies.forEach(reply => (reply.dateDif = dateDif(reply.date)));
	}
});

commentSchema.post("findOneAndDelete", async function (doc) {
	if (doc) {
		await mongoose
			.model("Post")
			.findByIdAndUpdate(doc.post, { $pull: { comments: doc._id } });
		await mongoose
			.model("User")
			.findByIdAndUpdate(doc.user, { $pull: { comments: doc._id } });
	}
});

module.exports = mongoose.model("Comment", commentSchema);
