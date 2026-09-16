import mongoose from 'mongoose';

// Append-only learning event log. Powers activity feeds, analytics,
// admin views and downstream workflows. Common `type` values:
//   space_created, project_created, material_uploaded, material_ready,
//   material_failed, tutor_message, quiz_started, quiz_completed,
//   mastery_updated, recommendation_created
const activityEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    type: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} }, // small JSON details
  },
  { timestamps: true },
);

// Fire-and-forget logging so events never block or break the main flow.
activityEventSchema.statics.log = function (fields) {
  return this.create(fields).catch((error) => {
    console.error('activity log failed:', error.message);
  });
};

export const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema);