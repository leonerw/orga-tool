import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    title: { 
      type: String,
      required: true
    },
    description: { 
      type: String,
      required: true
    },
    completed: { 
      type: Boolean,
      default: false
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Todo", todoSchema);